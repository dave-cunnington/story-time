"""Make a few sample clips in different Kokoro voices. Usage: samples.py <out-dir>"""
import sys, time, pathlib, subprocess
import soundfile as sf
from kokoro_onnx import Kokoro

here = pathlib.Path(__file__).parent
out = pathlib.Path(sys.argv[1])
k = Kokoro(str(here / 'models/kokoro-v1.0.onnx'), str(here / 'models/voices-v1.0.bin'))
VOICES = ['af_heart', 'af_bella', 'af_nicole', 'am_michael', 'am_puck', 'am_fenrir', 'bf_emma', 'bm_george']
LINES = {'word': 'friction', 'meaning': 'Friction is the rubbing that slows things down when they slide.', 'short': 'the'}
for v in VOICES:
    for name, text in LINES.items():
        t = time.time()
        audio, sr = k.create(text, voice=v, speed=0.9, lang='en-us' if v[0] == 'a' else 'en-gb')
        wav = out / f'{v}-{name}.wav'
        sf.write(wav, audio, sr)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-ac', '1', '-b:a', '48k', str(wav.with_suffix('.mp3'))], check=True)
        wav.unlink()
        print(v, name, f'{len(audio)/sr:.2f}s audio in {time.time()-t:.2f}s')
