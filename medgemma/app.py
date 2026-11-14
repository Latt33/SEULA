"""
SEULA x MedGemma: chest X-ray pre-read service.

MedGemma 1.5 4B (Google, open weights, Health AI Developer Foundations) reads the chest
X-ray that SEULA ordered, compares it with a prior X-ray, marks suspicious areas and
returns a priority for the radiologist's worklist. Runs on one GPU on Modal; a county
can run the same container on its own hardware, so images stay in Finland.

Deploy:
  pip install modal && modal setup
  # accept the MedGemma terms on https://huggingface.co/google/medgemma-1.5-4b-it
  modal secret create huggingface HF_TOKEN=hf_...
  modal deploy medgemma/app.py
"""
import base64, io, json, re, time

import modal

MODEL_ID = "google/medgemma-1.5-4b-it"
ALLOWED_ORIGINS = ["https://latt33.github.io", "http://localhost:5173", "http://localhost:4173"]

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("torch==2.6.0", "transformers>=4.57", "accelerate", "pillow", "fastapi[standard]")
)
cache = modal.Volume.from_name("seula-hf-cache", create_if_missing=True)
app = modal.App("seula-medgemma")

READ_PROMPT = (
    "You are a radiologist pre-reading a chest X-ray. The patient was sent from primary care "
    "because a pre-visit questionnaire flagged possible lung cancer symptoms. {context}\n"
    "Write a short report with two sections, FINDINGS and IMPRESSION. Mention any mass, nodule "
    "or hilar enlargement and its location. Be concise."
)
COMPARE_PROMPT = (
    "The first image is the patient's PRIOR chest X-ray, the second is the CURRENT one. "
    "In two or three sentences, describe what is new or changed in the current image."
)
LOCATE_PROMPT = (
    "Locate any lung mass, nodule or hilar mass on this chest X-ray. Answer only with JSON, "
    'a list like [{{"label": "mass", "box_2d": [ymin, xmin, ymax, xmax]}}] with coordinates '
    "normalized to 0-1000. Answer [] if there is none."
)
TRIAGE_PROMPT = (
    "Radiology pre-read:\n{report}\n\nDoes this report describe a finding that needs a chest CT "
    "within two weeks to rule out lung cancer? Answer with one word: yes or no."
)


def _img(b64: str):
    from PIL import Image
    data = base64.b64decode(b64.split(",")[-1])
    return Image.open(io.BytesIO(data)).convert("RGB")


def _boxes(text: str):
    m = re.search(r"\[.*\]", text, re.S)
    if not m:
        return []
    try:
        items = json.loads(m.group(0))
    except Exception:
        return []
    out = []
    for it in items if isinstance(items, list) else []:
        b = it.get("box_2d") if isinstance(it, dict) else None
        if isinstance(b, list) and len(b) == 4 and all(isinstance(v, (int, float)) for v in b):
            out.append({"label": str(it.get("label", "finding")), "box_2d": [float(v) for v in b]})
    return out


@app.cls(gpu="L4", image=image, volumes={"/root/.cache/huggingface": cache},
         secrets=[modal.Secret.from_name("huggingface")], scaledown_window=900, timeout=600)
class MedGemma:
    @modal.enter()
    def load(self):
        import torch
        from transformers import AutoModelForImageTextToText, AutoProcessor
        self.processor = AutoProcessor.from_pretrained(MODEL_ID)
        self.model = AutoModelForImageTextToText.from_pretrained(
            MODEL_ID, dtype=torch.bfloat16, device_map="cuda")
        cache.commit()

    def _generate(self, images, text, max_new_tokens=400):
        import torch
        content = [{"type": "image", "image": im} for im in images] + [{"type": "text", "text": text}]
        messages = [{"role": "user", "content": content}]
        inputs = self.processor.apply_chat_template(
            messages, add_generation_prompt=True, tokenize=True, return_dict=True, return_tensors="pt"
        ).to(self.model.device, dtype=torch.bfloat16)
        n = inputs["input_ids"].shape[-1]
        with torch.inference_mode():
            out = self.model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)
        return self.processor.decode(out[0][n:], skip_special_tokens=True).strip()

    @modal.method()
    def ping(self):
        return True

    @modal.method()
    def read(self, image_b64: str, prior_b64: str | None = None, context: str = ""):
        t0 = time.time()
        cur = _img(image_b64)
        report = self._generate([cur], READ_PROMPT.format(context=context), 450)
        comparison = None
        if prior_b64:
            comparison = self._generate([_img(prior_b64), cur], COMPARE_PROMPT, 200)
        loc_raw = self._generate([cur], LOCATE_PROMPT, 200)
        triage = self._generate([], TRIAGE_PROMPT.format(report=report + ("\n" + comparison if comparison else "")), 5)
        return {
            "model": MODEL_ID,
            "report": report,
            "comparison": comparison,
            "boxes": _boxes(loc_raw),
            "boxes_raw": loc_raw,
            "ct_within_2_weeks": triage.lower().startswith("y"),
            "seconds": round(time.time() - t0, 1),
        }


@app.function(image=image)
@modal.asgi_app()
def web():
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel

    api = FastAPI(title="SEULA MedGemma pre-read")
    api.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["*"], allow_headers=["*"])

    class Req(BaseModel):
        image_b64: str
        prior_b64: str | None = None
        context: str = ""

    @api.get("/health")
    def health():
        return {"ok": True, "model": MODEL_ID}

    @api.post("/warmup")
    def warmup():
        MedGemma().ping.spawn()  # starts a GPU container and loads the model
        return {"started": True}

    @api.post("/read")
    def read(req: Req):
        return MedGemma().read.remote(req.image_b64, req.prior_b64, req.context)

    return api
