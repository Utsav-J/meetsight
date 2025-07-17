
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
# BUFFERS = 5  # Remove static buffer

TARGET_RATE = 16000

# Silence detection parameters
SILENCE_THRESHOLD = 500  # Adjust as needed (RMS value)
SILENCE_DURATION = 0.7   # seconds of silence to trigger transcription

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

# Helper: check if audio is silent
def is_silent(audio_np, threshold=SILENCE_THRESHOLD):
    rms = np.sqrt(np.mean(np.square(audio_np)))
    return rms < threshold

def record_audio():
    buffer = []
    silent_chunks = 0
    silence_chunk_count = int(SILENCE_DURATION * RATE / CHUNK)
    while True:
        data = stream.read(CHUNK, exception_on_overflow=False)
        buffer.append(data)
        # Convert to numpy for silence detection
        audio_np = np.frombuffer(data, np.int16)
        if CHANNELS == 2:
            audio_np = audio_np.reshape(-1, 2)
            audio_np = audio_np.mean(axis=1)
        if is_silent(audio_np):
            silent_chunks += 1
        else:
            silent_chunks = 0
        # If we've had enough consecutive silent chunks, treat as end of utterance
        if silent_chunks >= silence_chunk_count and len(buffer) > silence_chunk_count:
            audio_queue.put(b''.join(buffer))
            buffer = []
            silent_chunks = 0

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