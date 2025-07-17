
import pyaudio
import numpy as np
import whisper
import time

# Parameters
DEVICE_INDEX = 1  # Set to your Stereo Mix device index
FORMAT = pyaudio.paInt16
CHANNELS = 2      # Stereo Mix is usually stereo
RATE = 44100      # Stereo Mix is usually 44100 Hz
CHUNK = 1024
BUFFER_SECONDS = 5  # How much audio to buffer for each transcription

TARGET_RATE = 16000

# Load Whisper model
model = whisper.load_model("tiny.en")  # or "small", "medium", "large"

# PyAudio setup
p = pyaudio.PyAudio()
stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                input_device_index=DEVICE_INDEX,
                frames_per_buffer=CHUNK)

print("Recording and transcribing system audio...")

import threading
import queue
import resampy

audio_queue = queue.Queue()

def record_audio():
    buffer = []
    frames_per_buffer = int(RATE * BUFFER_SECONDS / CHUNK)
    while True:
        for _ in range(frames_per_buffer):
            data = stream.read(CHUNK, exception_on_overflow=False)
            buffer.append(data)
        audio_queue.put(b''.join(buffer))
        buffer = []

def transcribe_audio():
    while True:
        audio_bytes = audio_queue.get()
        # Convert bytes to numpy array
        audio_np = np.frombuffer(audio_bytes, np.int16)
        # Convert to mono
        if CHANNELS == 2:
            audio_np = audio_np.reshape(-1, 2)
            audio_np = audio_np.mean(axis=1)
        # Resample to 16kHz
        audio_np = resampy.resample(audio_np, RATE, TARGET_RATE)
        # Normalize to float32 in [-1, 1]
        audio_np = audio_np.astype(np.float32) / 32768.0
        # Transcribe
        result = model.transcribe(audio_np, language="en", fp16=False)
        print("Transcription:", result['text'].strip())

# Start threads
threading.Thread(target=record_audio, daemon=True).start()
threading.Thread(target=transcribe_audio, daemon=True).start()

# Keep main thread alive
while True:
    time.sleep(1)