import os
import threading
import time
import json
import re
from datetime import datetime, timedelta
from queue import Queue
from sys import platform
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import speech_recognition as sr
import whisper
import torch
import google.generativeai as genai
from dotenv import load_dotenv
import numpy as np

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY')
LLM_OUTPUT_FILE = "llm_definitions.jsonl"

# FastAPI app
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=GEMINI_API_KEY)

# Globals for background tasks
transcription_thread = None
llm_thread = None
transcription_running = threading.Event()
llm_running = threading.Event()

# Shared data
class SharedState:
    def __init__(self):
        self.transcription = []  # list of strings
        self.transcription_buffer = []  # list of (timestamp, text)
        self.llm_output = None
        self.lock = threading.Lock()

    def add_transcription(self, text):
        with self.lock:
            self.transcription.append(text)
            self.transcription_buffer.append((datetime.utcnow(), text))
            # Keep only last 30 seconds
            cutoff = datetime.utcnow() - timedelta(seconds=30)
            self.transcription_buffer = [x for x in self.transcription_buffer if x[0] >= cutoff]

    def get_last_n_seconds(self, seconds=5):
        with self.lock:
            cutoff = datetime.utcnow() - timedelta(seconds=seconds)
            return ' '.join([t for ts, t in self.transcription_buffer if ts >= cutoff])

    def get_transcription(self):
        with self.lock:
            return '\n'.join(self.transcription)

    def set_llm_output(self, output):
        with self.lock:
            self.llm_output = output

    def get_llm_output(self):
        with self.lock:
            return self.llm_output

shared_state = SharedState()

# Gemini LLM call
SCHEMA = '''
{
  "type": "object",
  "properties": {
    "technical_terms": {
      "type": "array",
      "description": "A list of all technical terms mentioned in the transcript, along with definitions and contextual explanations.",
      "items": {
        "type": "object",
        "properties": {
          "term": {"type": "string", "description": "The technical term or jargon identified in the transcript."},
          "definition": {"type": "string", "description": "A clear and concise definition of the technical term."},
          "contextual_explanation": {"type": "string", "description": "An explanation of how the term is used or meant within the current transcript, tailored for a non-technical audience."},
          "example_quote": {"type": "string", "description": "A direct quote or sentence from the transcript where the term appears."}
        },
        "required": ["term", "definition", "contextual_explanation"]
      }
    }
  },
  "required": ["technical_terms"]
}
'''

def get_gemini_definitions(text):
    prompt = (
        "Extract all technical terms from the following text and provide their definitions and context. "
        "Return the result as a JSON object matching this schema (if no terms, use an empty list for 'technical_terms'):\n" + SCHEMA + "\nText:\n" + text
    )
    model = genai.GenerativeModel('gemini-2.0-flash')
    response = model.generate_content(prompt)
    match = re.search(r'\{[\s\S]*\}', response.text)
    if match:
        json_str = match.group(0)
        try:
            return json.loads(json_str)
        except Exception as e:
            print(f"[LLM JSON ERROR] {e}\nRaw output: {json_str}")
            return None
    else:
        print(f"[LLM NO JSON FOUND] Raw output: {response.text}")
        return None

# Background transcription
class TranscriptionWorker(threading.Thread):
    def __init__(self, shared_state, record_timeout=2.0, phrase_timeout=3.0):
        super().__init__(daemon=True)
        self.shared_state = shared_state
        self.record_timeout = record_timeout
        self.phrase_timeout = phrase_timeout
        self.data_queue = Queue()
        self.phrase_bytes = bytes()
        self.phrase_time = None
        self.recorder = sr.Recognizer()
        self.recorder.energy_threshold = 1000
        self.recorder.dynamic_energy_threshold = False
        self.running = transcription_running
        self.audio_model = whisper.load_model("base")
        if 'linux' in platform:
            mic_name = "pulse"
            for index, name in enumerate(sr.Microphone.list_microphone_names()):
                if mic_name in name:
                    self.source = sr.Microphone(sample_rate=16000, device_index=index)
                    break
            else:
                raise RuntimeError(f"Microphone named '{mic_name}' not found.")
        else:
            self.source = sr.Microphone(sample_rate=16000)

    def record_callback(self, _, audio: sr.AudioData):
        data = audio.get_raw_data()
        self.data_queue.put(data)

    def run(self):
        with self.source:
            self.recorder.adjust_for_ambient_noise(self.source)
        self.recorder.listen_in_background(self.source, self.record_callback, phrase_time_limit=self.record_timeout)
        while self.running.is_set():
            now = datetime.utcnow()
            if not self.data_queue.empty():
                phrase_complete = False
                if self.phrase_time and now - self.phrase_time > timedelta(seconds=self.phrase_timeout):
                    self.phrase_bytes = bytes()
                    phrase_complete = True
                self.phrase_time = now
                audio_data = b''.join(self.data_queue.queue)
                self.data_queue.queue.clear()
                self.phrase_bytes += audio_data
                audio_np = np.frombuffer(self.phrase_bytes, dtype=np.int16).astype(np.float32) / 32768.0
                result = self.audio_model.transcribe(audio_np, fp16=torch.cuda.is_available())
                text = result['text'].strip()
                if phrase_complete:
                    self.shared_state.add_transcription(text)
                else:
                    # Overwrite last
                    with self.shared_state.lock:
                        if self.shared_state.transcription:
                            self.shared_state.transcription[-1] = text
                        else:
                            self.shared_state.transcription.append(text)
                        self.shared_state.transcription_buffer.append((datetime.utcnow(), text))
                time.sleep(0.1)
            else:
                time.sleep(0.25)

# Background LLM
class LLMWorker(threading.Thread):
    def __init__(self, shared_state, interval=5):
        super().__init__(daemon=True)
        self.shared_state = shared_state
        self.interval = interval
        self.running = llm_running

    def run(self):
        while self.running.is_set():
            time.sleep(self.interval)
            recent_text = self.shared_state.get_last_n_seconds(self.interval)
            if recent_text.strip():
                definitions = get_gemini_definitions(recent_text)
                if definitions:
                    obj = {
                        "timestamp": datetime.utcnow().isoformat(),
                        "transcript": recent_text,
                        "llm_output": definitions
                    }
                    with open(LLM_OUTPUT_FILE, 'a', encoding='utf-8') as f:
                        f.write(json.dumps(obj) + '\n')
                    self.shared_state.set_llm_output(obj)

# API Models
class StatusResponse(BaseModel):
    running: bool

@app.post("/transcription/start", response_model=StatusResponse)
def start_transcription():
    global transcription_thread, llm_thread
    if transcription_running.is_set():
        return {"running": True}
    transcription_running.set()
    llm_running.set()
    shared_state.transcription.clear()
    shared_state.transcription_buffer.clear()
    shared_state.llm_output = None
    transcription_thread = TranscriptionWorker(shared_state)
    llm_thread = LLMWorker(shared_state)
    transcription_thread.start()
    llm_thread.start()
    return {"running": True}

@app.post("/transcription/stop", response_model=StatusResponse)
def stop_transcription():
    transcription_running.clear()
    llm_running.clear()
    return {"running": False}

@app.get("/transcription/live")
def get_live_transcription():
    return {"transcription": shared_state.get_transcription()}

@app.get("/llm/latest")
def get_latest_llm():
    output = shared_state.get_llm_output()
    if output is None:
        raise HTTPException(status_code=404, detail="No LLM output yet.")
    return output 