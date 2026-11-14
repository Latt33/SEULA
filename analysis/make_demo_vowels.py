"""Synthesises clean 'steady voice' vowels for the demo patients (same model as validate_voice.py)."""
from pathlib import Path
import numpy as np
from validate_voice import synth_vowel, write_wav, OUT

rng = np.random.default_rng(11)
d = OUT / "synth"
for name, f0, female in [("demo_male_steady", 124, False), ("demo_female_steady", 205, True)]:
    write_wav(d / f"{name}.wav", synth_vowel(rng, f0, 0.0015, 0.004, -46, female))
    print(name)
