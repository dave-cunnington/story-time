"""Record every word and its meaning as an mp3 clip, using the Kokoro voice model.

Usage:  tools/tts/.venv/bin/python tools/tts/record.py <voice> [shard] [of]
        e.g. record.py af_heart        (everything)
             record.py af_heart 0 4    (the first of four equal shares, to run four at once)

Reads books/meanings.json and books/say-as.json; writes audio/words/*.mp3 and audio/meanings/*.mp3.
Clips that already exist are skipped, so it is safe to stop and re-run, and to re-run after adding a book.
Delete the audio folder first to change voice.
"""
import json, pathlib, re, subprocess, sys, tempfile
import soundfile as sf
from kokoro_onnx import Kokoro

here = pathlib.Path(__file__).parent
root = here.parent.parent
voice = sys.argv[1]
shard, of = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (0, 1)

meanings = json.loads((root / 'books/meanings.json').read_text(encoding='utf8'))
say_as = json.loads((root / 'books/say-as.json').read_text(encoding='utf8'))
lang = 'en-us' if voice[0] == 'a' else 'en-gb'

def slug(key):
    """File name for a word. Must match clipName() in app.js."""
    return re.sub(r'[^a-z0-9-]', lambda m: '_%x' % ord(m.group()), key)

kokoro = None
def record(text, out, speed):
    global kokoro
    if out.exists():
        return False
    if kokoro is None:
        # Two threads per process, so several shares can run side by side without fighting over the CPU.
        import onnxruntime
        opts = onnxruntime.SessionOptions()
        opts.intra_op_num_threads = 2
        session = onnxruntime.InferenceSession(str(here / 'models/kokoro-v1.0.onnx'), sess_options=opts, providers=['CPUExecutionProvider'])
        kokoro = Kokoro.from_session(session, str(here / 'models/voices-v1.0.bin'))
    audio, rate = kokoro.create(text, voice=voice, speed=speed, lang=lang)
    with tempfile.NamedTemporaryFile(suffix='.wav') as wav:
        sf.write(wav.name, audio, rate)
        tmp = out.with_suffix('.part.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav.name, '-ac', '1', '-b:a', '48k', str(tmp)], check=True)
        tmp.rename(out)
    return True

for kind in ('words', 'meanings'):
    (root / 'audio' / kind).mkdir(parents=True, exist_ok=True)

keys = sorted(meanings)[shard::of]
made = 0
for i, key in enumerate(keys):
    made += record(say_as.get(key, key), root / 'audio/words' / (slug(key) + '.mp3'), 0.85)
    made += record(meanings[key], root / 'audio/meanings' / (slug(key) + '.mp3'), 0.95)
    if i % 50 == 0:
        print(f'shard {shard}: {i}/{len(keys)} words, {made} new clips', flush=True)
print(f'shard {shard}: done, {made} new clips', flush=True)
