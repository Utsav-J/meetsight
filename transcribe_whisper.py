import whisper
import sounddevice as sd
import numpy as np
import torch

SAMPLE_RATE = 16000
DURATION = 5  # seconds

print("Recording for {} seconds...".format(DURATION))
recording = sd.rec(int(DURATION * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype='float32')
sd.wait()

# Convert to mono and float32
audio = np.squeeze(recording)

print("Transcribing...")
model = whisper.load_model("base")
# Whisper expects 16-bit PCM, so convert
result = model.transcribe(audio, language='en', fp16=torch.cuda.is_available())
print("You said:", result['text']) 