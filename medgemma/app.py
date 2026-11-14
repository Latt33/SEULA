"""
SEULA x MedGemma: chest X-ray pre-read service.

MedGemma 1.5 4B (Google, open weights, Health AI Developer Foundations) reads the chest
X-ray that SEULA ordered, compares it with a prior X-ray, marks suspicious areas and
returns a priority for the radiologist's worklist. Runs on one GPU on Modal (first free of L4, A10G, L40S, A100); a county
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
# Public demo endpoint: only the three demo X-rays are accepted, one GPU at most, and a global
# hourly cap, so the URL cannot be used as a free MedGemma API. Remove the allowlist for a pilot
# deployment inside the county's own network.
DEMO_IMAGES_SHA256 = {
    "a90c96202f1b7a3e68764be7e13ed2b5daf465061551b87227fbbf0740ac062e",  # 00000276_000.jpg
    "4a04247af19141745c22952b5ad633138d33cad3c7ed663ee2f01eed0524f5d8",  # 00010815_003.jpg
    "19eebe9527ea3d608dbf17f8e12788f9991d1e5ac4f6156aed5d7ab9efc98755",  # 00010815_006.jpg
}
READS_PER_HOUR = 40
ALLOWED_ORIGINS = ["https://latt33.github.io", "http://localhost:5173", "http://localhost:4173"]

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("torch==2.6.0", "transformers>=4.57", "accelerate", "pillow", "fastapi[standard]")
)
cache = modal.Volume.from_name("seula-hf-cache", create_if_missing=True)
quota = modal.Dict.from_name("seula-medgemma-quota", create_if_missing=True)
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
TARGET_PROMPT = (
    "Radiology pre-read:\n{report}\n\nName the single most suspicious finding for lung cancer "
    "together with its location, in at most eight words (for example: right upper lobe mass). "
    "If there is no mass, nodule or hilar enlargement, answer NONE."
)
LOCATE_PROMPT = (
    "Locate the {target} on this chest X-ray. Give the bounding box as [y0, x0, y1, x1], "
    "with (y0, x0) the top-left and (y1, x1) the bottom-right corner, normalized to 0-1000."
)
TRIAGE_PROMPT = (
    "Radiology pre-read:\n{report}\n\nDoes this report describe a finding that needs a chest CT "
    "within two weeks to rule out lung cancer? Answer with one word: yes or no."
)


def _img(b64: str):
    from PIL import Image
    data = base64.b64decode(b64.split(",")[-1])
    return Image.open(io.BytesIO(data)).convert("RGB")


def _boxes(text: str, label: str):
    """Accept JSON with box_2d, or any [a, b, c, d] list; coordinates 0-1000 or 0-1."""
    found = []
    m = re.search(r"\[\s*\{.*\}\s*\]", text, re.S)
    if m:
        try:
            for it in json.loads(m.group(0)):
                b = it.get("box_2d") if isinstance(it, dict) else None
                if isinstance(b, list) and len(b) == 4:
                    found.append((str(it.get("label", label)), [float(v) for v in b]))
        except Exception:
            pass
    if not found:
        for nums in re.findall(r"\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\]", text):
            found.append((label, [float(v) for v in nums]))
    out = []
    for lab, b in found[:3]:
        if max(b) <= 1.0:
            b = [v * 1000 for v in b]
        y0, x0, y1, x1 = b
        if y1 > y0 and x1 > x0:
            out.append({"label": lab, "box_2d": [y0, x0, y1, x1]})
    return out


@app.cls(gpu=["L4", "A10G", "L40S", "A100-40GB"], image=image, volumes={"/root/.cache/huggingface": cache},
         secrets=[modal.Secret.from_name("huggingface")], scaledown_window=900, timeout=900,
         max_containers=1)
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
        lines = self._generate([], TARGET_PROMPT.format(report=report), 24).strip().splitlines()
        target = (lines[0].strip().strip(".*") if lines else "") or "NONE"
        loc_raw, boxes = "", []
        if target.upper().startswith(("FINDINGS", "IMPRESSION", "NO ")):
            target = "NONE"
        if "none" not in target.lower():
            loc_raw = self._generate([cur], LOCATE_PROMPT.format(target=target), 400)
            boxes = [b for b in _boxes(loc_raw, target)
                     if (b["box_2d"][2] - b["box_2d"][0]) * (b["box_2d"][3] - b["box_2d"][1]) < 600_000]
        triage = self._generate([], TRIAGE_PROMPT.format(report=report + ("\n" + comparison if comparison else "")), 5)
        return {
            "model": MODEL_ID,
            "report": report,
            "comparison": comparison,
            "target": target,
            "boxes": boxes,
            "boxes_raw": loc_raw,
            "ct_within_2_weeks": triage.lower().startswith("y"),
            "seconds": round(time.time() - t0, 1),
        }


@app.function(image=image, timeout=900, max_containers=1)
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

    def _sha(b64: str) -> str:
        import hashlib
        return hashlib.sha256(base64.b64decode(b64.split(",")[-1])).hexdigest()

    @api.post("/read")
    def read(req: Req):
        from fastapi import HTTPException
        if len(req.image_b64) > 3_000_000 or (req.prior_b64 and len(req.prior_b64) > 3_000_000):
            raise HTTPException(413, "Image too large")
        if _sha(req.image_b64) not in DEMO_IMAGES_SHA256 or (req.prior_b64 and _sha(req.prior_b64) not in DEMO_IMAGES_SHA256):
            raise HTTPException(403, "This public demo only reads the SEULA demo X-rays")
        bucket = time.strftime("%Y%m%d%H")
        used = quota.get(bucket, 0)
        if used >= READS_PER_HOUR:
            raise HTTPException(429, "Hourly demo limit reached, try again later")
        quota[bucket] = used + 1
        return MedGemma().read.remote(req.image_b64, req.prior_b64, req.context[:600])

    return api
