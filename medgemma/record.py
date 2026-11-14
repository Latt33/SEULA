"""Call the deployed MedGemma service on the demo X-rays and save the answers as a recorded
fallback (src/data/generated/medgemma_cache.json), so the demo still works offline.

  python3 medgemma/record.py https://<you>--seula-medgemma-web.modal.run
"""
import base64, datetime, json, pathlib, sys, urllib.request

url = sys.argv[1].rstrip("/")
root = pathlib.Path(__file__).resolve().parents[1]
cases = {
    "00010815_006": ("00010815_003", "Age 64, current smoker. Cough over 6 weeks, weight loss, shortness of breath."),
    "00000276_000": (None, "Age 67, former smoker. Persistent hoarseness and cough."),
}
b64 = lambda i: base64.b64encode((root / "public/cxr" / f"{i}.jpg").read_bytes()).decode()
out = {}
for cur, (prior, ctx) in cases.items():
    body = json.dumps({"image_b64": b64(cur), "prior_b64": b64(prior) if prior else None, "context": ctx}).encode()
    req = urllib.request.Request(url + "/read", body, {"Content-Type": "application/json"})
    res = json.load(urllib.request.urlopen(req, timeout=600))
    res["recorded"] = datetime.date.today().isoformat()
    out[cur] = res
    print(cur, "->", "CT within 2 weeks" if res["ct_within_2_weeks"] else "routine", res["boxes"])
(root / "src/data/generated/medgemma_cache.json").write_text(json.dumps(out, indent=1))
print("saved")
