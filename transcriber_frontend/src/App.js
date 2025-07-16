import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { FaMicrophone, FaGithub, FaSun, FaMoon, FaStop } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode
  const [hasTranscribed, setHasTranscribed] = useState(false);
  const [definitions, setDefinitions] = useState([]);
  const pollingRef = useRef(null);

  useEffect(() => {
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Poll for transcription and LLM output when recording
  useEffect(() => {
    if (isRecording) {
      pollingRef.current = setInterval(async () => {
        // Get live transcription
        try {
          const res = await fetch(`${API_URL}/transcription/live`);
          if (res.ok) {
            const data = await res.json();
            setTranscription(data.transcription);
            setHasTranscribed(!!data.transcription);
          }
        } catch (err) {
          setTranscription('Error fetching transcription: ' + err.message);
        }
        // Get latest LLM output
        try {
          const res2 = await fetch(`${API_URL}/llm/latest`);
          if (res2.ok) {
            const llmData = await res2.json();
            if (llmData.llm_output && llmData.llm_output.technical_terms) {
              setDefinitions(llmData.llm_output.technical_terms);
            } else {
              setDefinitions([]);
            }
          } else {
            setDefinitions([]);
          }
        } catch (err) {
          setDefinitions([]);
        }
      }, 3000); // every 3 seconds
    } else {
      clearInterval(pollingRef.current);
    }
    return () => clearInterval(pollingRef.current);
  }, [isRecording]);

  const handleStart = async () => {
    setTranscription('');
    setDefinitions([]);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/transcription/start`, { method: 'POST' });
      if (res.ok) {
        setIsRecording(true);
        setLoading(false);
      } else {
        setLoading(false);
        alert('Failed to start transcription.');
      }
    } catch (err) {
      setLoading(false);
      alert('Could not start transcription: ' + err.message);
    }
  };

  const handleStop = async () => {
    setIsRecording(false);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/transcription/stop`, { method: 'POST' });
      setLoading(false);
      if (!res.ok) {
        alert('Failed to stop transcription.');
      }
    } catch (err) {
      setLoading(false);
      alert('Could not stop transcription: ' + err.message);
    }
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
        <div className="definitions-box glass">
          <b>Technical Definitions:</b>
          {definitions.length === 0 ? (
            <div>No technical terms found yet.</div>
          ) : (
            <ul>
              {definitions.map((def, idx) => (
                <li key={idx} style={{marginBottom: '0.5em'}}>
                  <b>{def.term}</b>: {def.definition}
                  <br />
                  <i>Context:</i> {def.contextual_explanation}
                  {def.example_quote && <><br /><i>Example:</i> "{def.example_quote}"</>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="context-box glass">context placeholder</div>
      </div>
    </div>
  );
}

export default App;
