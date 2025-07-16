import os
import numpy as np
import speech_recognition as sr
import whisper
import torch
import threading
import time
from datetime import datetime, timedelta
from queue import Queue
from sys import platform
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY')
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
MODEL_NAME = "base"
ENERGY_THRESHOLD = 1000
RECORD_TIMEOUT = 2.0  # seconds
PHRASE_TIMEOUT = 3.0  # seconds
DEFAULT_MICROPHONE_NAME = "pulse" if 'linux' in platform else None
LLM_INTERVAL = 15  # seconds
LLM_OUTPUT_FILE = "llm_definitions.txt"
# ==================================

genai.configure(api_key=GEMINI_API_KEY)

def get_gemini_definitions(text):
    prompt = (
        "Extract all technical terms from the following text and provide concise definitions for each. "
        "If no technical terms are found, return an empty response.\n\nText:\n" + text
    )
    model = genai.GenerativeModel('gemini-2.0-flash')
    response = model.generate_content(prompt)
    return response.text.strip() if hasattr(response, 'text') else str(response)

class TranscriptionBuffer:
    def __init__(self):
        self.buffer = []  # List of (timestamp, text) tuples
        self.lock = threading.Lock()

    def add(self, text):
        with self.lock:
            self.buffer.append((datetime.utcnow(), text))
            # Remove anything older than 30 seconds for safety
            cutoff = datetime.utcnow() - timedelta(seconds=30)
            self.buffer = [(ts, t) for ts, t in self.buffer if ts >= cutoff]

    def get_last_n_seconds(self, seconds=15):
        with self.lock:
            cutoff = datetime.utcnow() - timedelta(seconds=seconds)
            return ' '.join([t for ts, t in self.buffer if ts >= cutoff])

def llm_background_worker(buffer: TranscriptionBuffer):
    while True:
        time.sleep(LLM_INTERVAL)
        recent_text = buffer.get_last_n_seconds(LLM_INTERVAL)
        if recent_text.strip():
            definitions = get_gemini_definitions(recent_text)
            if definitions:
                with open(LLM_OUTPUT_FILE, 'a', encoding='utf-8') as f:
                    f.write(f"\n[{datetime.utcnow().isoformat()}]\n{definitions}\n")

def main():
    phrase_time = None
    data_queue = Queue()
    phrase_bytes = bytes()
    recorder = sr.Recognizer()
    recorder.energy_threshold = ENERGY_THRESHOLD
    recorder.dynamic_energy_threshold = False

    if 'linux' in platform:
        mic_name = DEFAULT_MICROPHONE_NAME
        for index, name in enumerate(sr.Microphone.list_microphone_names()):
            if mic_name in name:
                source = sr.Microphone(sample_rate=16000, device_index=index)
                break
        else:
            print(f"Microphone named '{mic_name}' not found.")
            return
    else:
        source = sr.Microphone(sample_rate=16000)

    # Load Whisper model
    model = "base"
    audio_model = whisper.load_model(model)

    transcription = ['']
    buffer = TranscriptionBuffer()

    with source:
        recorder.adjust_for_ambient_noise(source)

    def record_callback(_, audio: sr.AudioData) -> None:
        data = audio.get_raw_data()
        data_queue.put(data)

    recorder.listen_in_background(source, record_callback, phrase_time_limit=RECORD_TIMEOUT)

    print("Model loaded.\n")

    # Start LLM background thread
    threading.Thread(target=llm_background_worker, args=(buffer,), daemon=True).start()

    while True:
        try:
            now = datetime.utcnow()
            if not data_queue.empty():
                phrase_complete = False
                if phrase_time and now - phrase_time > timedelta(seconds=PHRASE_TIMEOUT):
                    phrase_bytes = bytes()
                    phrase_complete = True
                phrase_time = now
                audio_data = b''.join(data_queue.queue)
                data_queue.queue.clear()
                phrase_bytes += audio_data
                audio_np = np.frombuffer(phrase_bytes, dtype=np.int16).astype(np.float32) / 32768.0
                result = audio_model.transcribe(audio_np, fp16=torch.cuda.is_available())
                text = result['text'].strip()
                if phrase_complete:
                    transcription.append(text)
                else:
                    transcription[-1] = text
                buffer.add(text)
                os.system('cls' if os.name == 'nt' else 'clear')
                for line in transcription:
                    print(line)
                print('', end='', flush=True)
            else:
                time.sleep(0.25)
        except KeyboardInterrupt:
            break
    print("\n\nTranscription:")
    for line in transcription:
        print(line)

if __name__ == "__main__":
    main() 