# Offline Speech-to-Text Transcription Demos

This project demonstrates multiple ways to transcribe speech from your microphone to text using only offline Python packages (no external APIs).

## Solutions Provided

- `transcribe_vosk_sr.py`         — SpeechRecognition + Vosk
- `transcribe_vosk.py`            — Vosk Standalone
- `transcribe_whisper.py`         — Whisper (OpenAI, runs locally)
- `transcribe_pocketsphinx.py`    — pocketsphinx
- `transcribe_deepspeech.py`      — DeepSpeech (optional, heavy)

## Setup

1. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

   - If you have issues with `pyaudio`, see [PyAudio installation help](https://people.csail.mit.edu/hubert/pyaudio/#downloads) or use `pip install pipwin && pipwin install pyaudio` on Windows.
   - For `torch`, you may need to follow [PyTorch installation instructions](https://pytorch.org/get-started/locally/).

2. **Microphone permissions:**
   - Make sure your microphone is connected and accessible.
   - On Windows, check privacy settings to allow Python access to the microphone.

3. **(Optional) Download models:**
   - Some scripts (Vosk, DeepSpeech, Whisper) may prompt you to download a model the first time you run them, or you can download them manually (see script comments).

## Usage

Run any script with:

```bash
python script_name.py
```

Example:

```bash
python transcribe_vosk_sr.py
```

## Notes

- All solutions run locally and do not require an internet connection after setup.
- DeepSpeech is optional and requires a large model download; it is less maintained than the others.
- For best results with technical terms, Whisper and Vosk are recommended.

## Scripts Overview

- **transcribe_vosk_sr.py**: Uses SpeechRecognition with Vosk as the backend for easy microphone handling.
- **transcribe_vosk.py**: Uses Vosk directly for more control and efficiency.
- **transcribe_whisper.py**: Uses OpenAI's Whisper model locally (requires a GPU for best performance).
- **transcribe_pocketsphinx.py**: Uses CMU Sphinx for lightweight, fast, but less accurate recognition.
- **transcribe_deepspeech.py**: Uses Mozilla DeepSpeech (optional, heavy, less maintained).

---

Feel free to try each script and see which works best for your needs! 