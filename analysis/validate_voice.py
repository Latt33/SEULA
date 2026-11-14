"""
Validate SEULA's in-browser voice engine against Praat (the clinical reference tool).

1. Synthesises sustained /a/ vowels with a source-filter model where the
   perturbations that characterise dysphonia are controlled: cycle-to-cycle
   period perturbation (jitter), amplitude perturbation (shimmer), and
   aspiration noise (lowers HNR and CPPS).
2. Measures every file with Praat 6.1 (via parselmouth, standard commands) and
   with SEULA's TypeScript engine (the same code that runs in the browser).
3. Reports agreement (Pearson r, mean bias, MAE) and fits a linear calibration
   that maps SEULA's raw CPPS onto the Praat scale, so the published Praat
   cut-off (14.45 dB, Murton et al. 2020) can be used.
4. Optional: --voiced DIR runs the same comparison on the open VOICED database
   (PhysioNet, Cesari et al. 2018) and reports healthy-vs-pathological AUC.

Outputs (consumed by the Evidence page):
  src/data/generated/voice_calibration.json
  src/data/generated/voice_validation.json

Run:  python3 analysis/validate_voice.py [--n 240] [--voiced path/to/voiced]
"""
import argparse, json, os, subprocess, sys, wave
from pathlib import Path
import numpy as np
from scipy.signal import lfilter
import parselmouth
from parselmouth.praat import call

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "analysis" / "out"
GEN = ROOT / "src" / "data" / "generated"
SR = 44100


def write_wav(path, x, sr=SR):
    x = np.clip(x, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def synth_vowel(rng, f0, jitter_sd, shimmer_sd, noise_db, female, dur=3.0):
    """Source-filter /a/: Rosenberg glottal pulses, perturbed per cycle, + pulsed aspiration noise."""
    n = int(dur * SR)
    src = np.zeros(n)
    t = 0.0
    drift = rng.uniform(-0.02, 0.02)
    while t < n - 2:
        f = f0 * (1 + drift * t / n) * (1 + 0.004 * np.sin(2 * np.pi * 5 * t / SR))  # slow drift + 5 Hz vibrato
        T = SR / f * (1 + jitter_sd * rng.standard_normal())
        A = max(0.05, 1 + shimmer_sd * rng.standard_normal())
        L = int(round(T))
        oq, sq = 0.6, 0.7
        To = int(L * oq); Tp = int(To * sq); Tn = To - Tp
        k = np.arange(L, dtype=float)
        g = np.zeros(L)
        if Tp > 1: g[:Tp] = 0.5 * (1 - np.cos(np.pi * k[:Tp] / Tp))
        if Tn > 1: g[Tp:To] = np.cos(np.pi * (k[Tp:To] - Tp) / (2 * Tn))
        dg = np.diff(np.concatenate([[0], g])) * A  # flow derivative (radiation)
        i0 = int(t)
        seg = dg[: max(0, min(L, n - i0))]
        src[i0 : i0 + len(seg)] += seg
        # aspiration noise, gated by glottal opening
        nz = rng.standard_normal(len(seg)) * g[: len(seg)] * A
        src[i0 : i0 + len(seg)] += nz * (10 ** (noise_db / 20)) * 0.3
        t += T
    formants = [(730, 60), (1090, 90), (2440, 120), (3400, 150), (4500, 200)]
    if female:
        formants = [(int(f * 1.17), b) for f, b in formants]
    y = src
    for F, B in formants:
        r = np.exp(-np.pi * B / SR); th = 2 * np.pi * F / SR
        y = lfilter([1 - r], [1, -2 * r * np.cos(th), r * r], y)
    y = y / (np.max(np.abs(y)) + 1e-9) * 0.5
    y += rng.standard_normal(len(y)) * 10 ** (-55 / 20)  # room noise floor
    return y


def praat_features(path):
    s = parselmouth.Sound(str(path))
    pp = call(s, "To PointProcess (periodic, cc)", 75, 600)
    jit = call(pp, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3) * 100
    shim = call([s, pp], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6) * 100
    h = call(s, "To Harmonicity (ac)", 0.01, 75, 0.1, 4.5)
    hm = call(h, "Get mean", 0, 0); hs = call(h, "Get standard deviation", 0, 0)
    pcg = call(s, "To PowerCepstrogram", 60, 0.002, 5000, 50)
    cpps = call(pcg, "Get CPPS", False, 0.01, 0.001, 60, 330, 0.05, "Parabolic", 0.001, 0, "Straight", "Robust")
    pitch = call(s, "To Pitch", 0.0, 75, 600)
    f0 = call(pitch, "Get mean", 0, 0, "Hertz")
    return dict(f0Mean=f0, jitterLocal=jit, shimmerLocal=shim, hnrMean=hm, hnrSd=hs, cpps=cpps)


def seula_features(paths, tag):
    lst = OUT / f"{tag}_list.txt"; res = OUT / f"{tag}_seula.json"
    lst.write_text("\n".join(str(p) for p in paths))
    subprocess.run(["npx", "tsx", "analysis/node/features.ts", str(lst), str(res)], cwd=ROOT, check=True)
    return json.loads(res.read_text())


def agreement(a, b):
    a = np.asarray(a, float); b = np.asarray(b, float)
    m = np.isfinite(a) & np.isfinite(b)
    a, b = a[m], b[m]
    r = float(np.corrcoef(a, b)[0, 1]) if len(a) > 2 else float("nan")
    return dict(n=int(m.sum()), r=r, bias=float(np.mean(b - a)), mae=float(np.mean(np.abs(b - a))))


def auc(scores, labels):
    s = np.asarray(scores, float); y = np.asarray(labels, int)
    m = np.isfinite(s); s, y = s[m], y[m]
    pos, neg = s[y == 1], s[y == 0]
    if not len(pos) or not len(neg): return float("nan")
    gt = (pos[:, None] > neg[None, :]).mean() + 0.5 * (pos[:, None] == neg[None, :]).mean()
    return float(gt)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=240)
    ap.add_argument("--voiced", type=str, default=None)
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()
    (OUT / "synth").mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(args.seed)

    meta = []
    for i in range(args.n):
        female = bool(rng.random() < 0.5)
        f0 = rng.uniform(170, 240) if female else rng.uniform(90, 150)
        # half "healthy-like", half "dysphonic-like" perturbation ranges
        sev = rng.random()
        jit = 0.002 + sev * rng.uniform(0, 0.025)
        shim = 0.01 + sev * rng.uniform(0, 0.12)
        noise = -40 + sev * rng.uniform(0, 25)
        y = synth_vowel(rng, f0, jit, shim, noise, female)
        p = OUT / "synth" / f"v{i:03d}.wav"
        write_wav(p, y)
        meta.append(dict(path=str(p), f0=f0, jitter_sd=jit, shimmer_sd=shim, noise_db=noise, severity=sev, female=female))

    praat = [praat_features(m["path"]) for m in meta]
    ours = seula_features([m["path"] for m in meta], "synth")

    feats = ["f0Mean", "hnrMean", "hnrSd"]
    calib = {}
    result = {"synthetic": {"n": len(meta), "features": {}}}
    for f in ["jitterLocal", "shimmerLocal"]:
        a = np.array([p[f] for p in praat], float); b = np.array([ours[m["path"]].get(f, np.nan) for m in meta], float)
        mk = np.isfinite(a) & np.isfinite(b)
        tr = mk & (np.arange(len(a)) % 2 == 0); te = mk & (np.arange(len(a)) % 2 == 1)  # fit on even, report on held-out odd
        sl, ic = np.polyfit(b[tr], a[tr], 1); calib[f] = {"slope": float(sl), "intercept": float(ic)}
        c = sl * b + ic
        result["synthetic"]["features"][f] = {**agreement(a[te], c[te]), "rawBias": agreement(a, b)["bias"], "heldOut": True, "points": [[round(x, 3), round(y, 3)] for x, y in zip(a[te], c[te])]}
    for f in feats:
        a = [p[f] for p in praat]; b = [ours[m["path"]].get(f, np.nan) for m in meta]
        result["synthetic"]["features"][f] = {**agreement(a, b), "points": [[round(x, 3), round(y, 3)] for x, y in zip(a, b) if np.isfinite(x) and np.isfinite(y)]}
    # CPPS: fit linear calibration raw -> Praat
    a = np.array([p["cpps"] for p in praat]); b = np.array([ours[m["path"]].get("cppsRaw", np.nan) for m in meta])
    mk = np.isfinite(a) & np.isfinite(b)
    tr = mk & (np.arange(len(a)) % 2 == 0); te = mk & (np.arange(len(a)) % 2 == 1)
    slope, icpt = np.polyfit(b[tr], a[tr], 1)
    cal = slope * b + icpt
    result["synthetic"]["features"]["cpps"] = {**agreement(a[te], cal[te]), "rawR": agreement(a, b)["r"], "heldOut": True, "points": [[round(x, 3), round(y, 3)] for x, y in zip(a[te], cal[te])]}
    # severity tracking: does each measure follow the injected perturbation?
    sev = np.array([m["severity"] for m in meta])
    result["synthetic"]["severityTracking"] = {
        f: float(np.corrcoef(sev[np.isfinite(v)], v[np.isfinite(v)])[0, 1])
        for f, v in {
            "jitterLocal": np.array([ours[m["path"]].get("jitterLocal", np.nan) for m in meta], float),
            "shimmerLocal": np.array([ours[m["path"]].get("shimmerLocal", np.nan) for m in meta], float),
            "praatCpps": np.array([p["cpps"] for p in praat], float),
            "hnrMean": np.array([ours[m["path"]].get("hnrMean", np.nan) for m in meta], float),
            "cpps": cal,
        }.items()
    }
    GEN.mkdir(parents=True, exist_ok=True)
    (GEN / "voice_calibration.json").write_text(json.dumps({"cpps": {"slope": float(slope), "intercept": float(icpt)}, **calib,
        "note": "Linear map from SEULA raw CPPS to Praat 6.1.38 CPPS (Straight, Robust), fitted on synthetic vowels by analysis/validate_voice.py"}, indent=2))

    if args.voiced:
        result["voiced"] = run_voiced(Path(args.voiced), slope, icpt)
    result["praatVersion"] = parselmouth.PRAAT_VERSION
    (GEN / "voice_validation.json").write_text(json.dumps(result))
    for f, v in result["synthetic"]["features"].items():
        print(f"{f:14s} r={v['r']:.3f} bias={v['bias']:+.3f} mae={v['mae']:.3f} n={v['n']}")
    print("CPPS calibration:", slope, icpt, "severity tracking:", result["synthetic"]["severityTracking"])


def run_voiced(d, slope, icpt):
    """VOICED (PhysioNet): voiceNNN.txt = samples at 8 kHz, voiceNNN-info.txt = metadata incl. Diagnosis."""
    (OUT / "voiced").mkdir(parents=True, exist_ok=True)
    rows = []
    for info in sorted(d.glob("voice*-info.txt")):
        stem = info.name.replace("-info.txt", "")
        sig = d / f"{stem}.txt"
        if not sig.exists(): continue
        x = np.loadtxt(sig); x = x / (np.max(np.abs(x)) + 1e-9) * 0.5
        p = OUT / "voiced" / f"{stem}.wav"; write_wav(p, x, 8000)
        diag = next((l.split(":", 1)[1].strip() for l in info.read_text(errors="ignore").splitlines() if l.lower().startswith("diagnosis")), "")
        rows.append(dict(path=str(p), diagnosis=diag, label=0 if diag.lower().startswith("healthy") else 1))
    ours = seula_features([r["path"] for r in rows], "voiced")
    praat = [praat_features(r["path"]) for r in rows]
    y = [r["label"] for r in rows]
    cp = [slope * ours[r["path"]].get("cppsRaw", np.nan) + icpt for r in rows]
    return {"n": len(rows), "nPathological": int(sum(y)),
            "aucCppsSeula": auc([-v for v in cp], y), "aucCppsPraat": auc([-p["cpps"] for p in praat], y),
            "aucHnrSeula": auc([-ours[r["path"]].get("hnrMean", np.nan) for r in rows], y),
            "cppsAgreement": agreement([p["cpps"] for p in praat], cp)}


if __name__ == "__main__":
    main()
