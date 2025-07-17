import pyaudio
import wave

# List all audio devices
p = pyaudio.PyAudio()
for i in range(p.get_device_count()):
    info = p.get_device_info_by_index(i)
    print(f"Device {i}: {info['name']} (Input channels: {info['maxInputChannels']})")

# Replace this with the index of your loopback device
LOOPBACK_DEVICE_INDEX = 0  # e.g., 2

# Set parameters
FORMAT = pyaudio.paInt16
CHANNELS = 2
RATE = 44100
CHUNK = 1024
RECORD_SECONDS = 5
OUTPUT_FILENAME = "system_audio.wav"

if LOOPBACK_DEVICE_INDEX is None:
    print("Set LOOPBACK_DEVICE_INDEX to the index of your system sound device (e.g., 'Stereo Mix').")
    exit(1)

stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                input_device_index=LOOPBACK_DEVICE_INDEX,
                frames_per_buffer=CHUNK)

print("Recording system audio...")

frames = []
for _ in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
    data = stream.read(CHUNK)
    frames.append(data)

print("Done recording.")

stream.close()
p.terminate()

# Save to WAV file
with wave.open(OUTPUT_FILENAME, 'wb') as wf:
    wf.setnchannels(CHANNELS)
    wf.setsampwidth(p.get_sample_size(FORMAT))
    wf.setframerate(RATE)
    wf.writeframes(b''.join(frames))

print(f"Saved to {OUTPUT_FILENAME}")
