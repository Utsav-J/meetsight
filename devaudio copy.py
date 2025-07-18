import pyaudio
import wave


# Replace this with the index of your loopback device
def record_audio(LOOPBACK_DEVICE_INDEX,CHANNELS = 2,RATE = 44100):
    # Set parameters
    FORMAT = pyaudio.paInt16
    CHANNELS = CHANNELS
    RATE = RATE
    CHUNK = 1024
    RECORD_SECONDS = 5
    OUTPUT_FILENAME = f"system_audio-{LOOPBACK_DEVICE_INDEX}.wav"

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

# List all audio devices
p = pyaudio.PyAudio()
for i in range(p.get_device_count()):
    info = p.get_device_info_by_index(i)
    print(info)
    print("\n\n\n")
    print(f"Device {i}: {info['name']} (Input channels: {info['maxInputChannels']})")
    record_audio(i,CHANNELS=info['maxInputChannels'],RATE=int(info["defaultSampleRate"]))
    # if info["maxInputChannels"] != 0:
    #     try:
    #         print(f"Device {i}: {info['name']} (Input channels: {info['maxInputChannels']})")
    #         record_audio(i)
    #     except Exception:
    #         continue
# # for i in [0, 1, 2, 3, 7, 8, 9, 10, 16, 17, 18, 21, 22, 23, 26, 27, 32]:
# record_audio(18)
# # record_audio(16,CHANNELS=1,RATE=16100)
# #