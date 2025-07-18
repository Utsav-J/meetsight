import pyaudio
import numpy as np
import whisper
import time
import threading
import queue
import resampy
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import uvicorn

# Parameters
DEVICE_INDEX = 0  # Set to your Stereo Mix device index
FORMAT = pyaudio.paInt16
CHANNELS = 2      # Stereo Mix is usually stereo
RATE = 44100      # Stereo Mix is usually 44100 Hz
CHUNK = 1024
TARGET_RATE = 16000
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

audio_queue = queue.Queue()

# Helper: check if audio is silent
def is_silent(audio_np, threshold=SILENCE_THRESHOLD):
    rms = np.sqrt(np.mean(np.square(audio_np)))
    return rms < threshold

# WebSocket manager to handle multiple clients
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.lock = threading.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        with self.lock:
            self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        with self.lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        with self.lock:
            connections = list(self.active_connections)
        for connection in connections:
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

# Audio recording thread
def record_audio():
    buffer = []
    silent_chunks = 0
    silence_chunk_count = int(SILENCE_DURATION * RATE / CHUNK)
    while True:
        data = stream.read(CHUNK, exception_on_overflow=False)
        buffer.append(data)
        audio_np = np.frombuffer(data, np.int16)
        if CHANNELS == 2:
            audio_np = audio_np.reshape(-1, 2)
            audio_np = audio_np.mean(axis=1)
        if is_silent(audio_np):
            silent_chunks += 1
        else:
            silent_chunks = 0
        if silent_chunks >= silence_chunk_count and len(buffer) > silence_chunk_count:
            audio_queue.put(b''.join(buffer))
            buffer = []
            silent_chunks = 0

def transcribe_audio():
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    while True:
        audio_bytes = audio_queue.get()
        audio_np = np.frombuffer(audio_bytes, np.int16)
        if CHANNELS == 2:
            audio_np = audio_np.reshape(-1, 2)
            audio_np = audio_np.mean(axis=1)
        audio_np = resampy.resample(audio_np, RATE, TARGET_RATE)
        audio_np = audio_np.astype(np.float32) / 32768.0
        result = model.transcribe(audio_np, language="en", fp16=False)
        text = result['text'].strip()
        if text:
            coro = manager.broadcast(text)
            loop.run_until_complete(coro)

# Start background threads
threading.Thread(target=record_audio, daemon=True).start()
threading.Thread(target=transcribe_audio, daemon=True).start()

# FastAPI app
app = FastAPI()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/")
def get():
    return HTMLResponse("""
    <html>
        <head>
            <title>Transcription WebSocket Test</title>
        </head>
        <body>
            <h1>WebSocket Test</h1>
            <ul id='messages'></ul>
            <script>
                var ws = new WebSocket('ws://' + location.host + '/ws');
                ws.onmessage = function(event) {
                    var messages = document.getElementById('messages');
                    var li = document.createElement('li');
                    li.textContent = event.data;
                    messages.appendChild(li);
                };
                ws.onopen = function() {
                    setInterval(function() { ws.send('ping'); }, 10000);
                };
            </script>
        </body>
    </html>
    """)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True) 