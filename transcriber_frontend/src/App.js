import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { FaMicrophone, FaGithub, FaSun, FaMoon, FaStop } from 'react-icons/fa';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode
  const [hasTranscribed, setHasTranscribed] = useState(false);

  useEffect(() => {
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleStart = async () => {
    setTranscription('');
    setLoading(false);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new window.MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mediaRecorder.onstop = handleSendAudio;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Could not access microphone: ' + err.message);
    }
  };

  const handleStop = () => {
    setIsRecording(false);
    setLoading(true);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSendAudio = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    try {
      const response = await fetch('http://localhost:8000/api/transcribe/', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.transcription) {
        setTranscription(data.transcription);
        setHasTranscribed(true);
      } else {
        setTranscription('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setTranscription('Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className={`container glass ${darkMode ? 'dark' : 'light'}`}>
      <div className="left-panel">
        <div className="transcription-box glass">
          <div className="transcription-content">
            {!hasTranscribed && (
              <div className="greeting">👋 Hi there! Start speaking to transcribe your voice note.</div>
            )}
            <div className="mic-visualizer">
              {isRecording ? (
                <div className="mic-anim">
                  <FaMicrophone className="mic-icon recording" />
                </div>
              ) : (
                <FaMicrophone className="mic-icon idle" />
              )}
            </div>
            <div className="transcription-text fade-in">
              {loading
                ? <span>Transcribing...</span>
                : <span>{transcription || 'Transcription of the audio that has been spoken'}</span>}
            </div>
          </div>
        </div>
      </div>
      <div className="right-panel">
        <div className="right-panel-actions">
          <button className="icon-btn" title="GitHub Repo">
            <FaGithub />
          </button>
          <button className="theme-toggle-pill" onClick={() => setDarkMode(dm => !dm)}>
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
        </div>
        <button className={`record-btn glass ${isRecording ? 'recording' : ''}`} onClick={isRecording ? handleStop : handleStart} disabled={loading}>
          {isRecording ? <><FaStop /> Stop</> : <><FaMicrophone /> Record</>}
        </button>
        <div className="status-text">
          {isRecording ? 'Recording...' : loading ? 'Processing...' : 'Ready'}
        </div>
        <div className="definitions-box glass">definitions placeholder</div>
        <div className="context-box glass">context placeholder</div>
      </div>
    </div>
  );
}

export default App;
