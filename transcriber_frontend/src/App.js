import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { FaMicrophone, FaGithub, FaSun, FaMoon, FaStop } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const DEFINITIONS_CACHE_KEY = 'wf_teams_definitions_cache';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // Default to dark mode
  const [hasTranscribed, setHasTranscribed] = useState(false);
  const [definitions, setDefinitions] = useState([]);
  const pollingRef = useRef(null);

  // Load cached definitions on mount
  useEffect(() => {
    const cached = localStorage.getItem(DEFINITIONS_CACHE_KEY);
    if (cached) {
      try {
        setDefinitions(JSON.parse(cached));
      } catch {
        setDefinitions([]);
      }
    }
  }, []);

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
              // Merge new definitions with cached ones, avoiding duplicates by term
              setDefinitions(prevDefs => {
                const prevTerms = new Set(prevDefs.map(d => d.term));
                const newDefs = llmData.llm_output.technical_terms.filter(d => d.term && !prevTerms.has(d.term));
                const merged = [...prevDefs, ...newDefs];
                localStorage.setItem(DEFINITIONS_CACHE_KEY, JSON.stringify(merged));
                return merged;
              });
            }
          }
        } catch (err) {
          // Do nothing, keep previous definitions
        }
      }, 3000); // every 3 seconds
    } else {
      clearInterval(pollingRef.current);
    }
    return () => clearInterval(pollingRef.current);
  }, [isRecording]);

  const handleStart = async () => {
    setTranscription('');
    setLoading(true);
    setHasTranscribed(false);
    // Do not clear definitions, keep previous session's cache
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

  // Add clear handler
  const handleClear = () => {
    setDefinitions([]);
    localStorage.removeItem(DEFINITIONS_CACHE_KEY);
    setTranscription('');
    setHasTranscribed(false);
  };

  // Card components for definitions and context
  const DefinitionCard = ({ term, definition }) => (
    <div className="card definition-card">
      <div className="card-term">{term || <i>Unknown term</i>}</div>
      <div className="card-definition">{definition || <i>No definition</i>}</div>
    </div>
  );

  const ContextCard = ({ term, contextual_explanation, example_quote }) => (
    <div className="card context-card">
      <div className="card-term">{term || <i>Unknown term</i>}</div>
      <div className="card-context">{contextual_explanation || <i>No context</i>}</div>
      {example_quote && <div className="card-example"><b>Example:</b> "{example_quote}"</div>}
    </div>
  );

  // Prepare content for the definitions and context boxes
  const renderDefinitions = () => {
    if (!definitions || definitions.length === 0) {
      return <div>No technical terms found yet.</div>;
    }
    return (
      <div className="card-list">
        {definitions.map((def, idx) => (
          <DefinitionCard key={idx} term={def.term} definition={def.definition} />
        ))}
      </div>
    );
  };

  const renderContext = () => {
    if (!definitions || definitions.length === 0) {
      return <div>No contextual explanations yet.</div>;
    }
    return (
      <div className="card-list">
        {definitions.map((def, idx) => (
          <ContextCard key={idx} term={def.term} contextual_explanation={def.contextual_explanation} example_quote={def.example_quote} />
        ))}
      </div>
    );
  };

  return (
    <div className={`app-root ${darkMode ? 'dark' : 'light'}`}> {/* New root class */}
      {/* Header */}
      <header className="app-header glass">
        <div className="header-title">Meeting Insights</div>
        <div className="header-actions">
          <button className="icon-btn" title="GitHub Repo">
            <FaGithub />
          </button>
          <button className="theme-toggle-pill" onClick={() => setDarkMode(dm => !dm)}>
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
        </div>
      </header>
      {/* Main three-column layout */}
      <div className="main-columns">
        {/* Left: Transcript */}
        <div className="column transcript-column glass">
          <div className="transcript-header">
            <button
              className={`record-btn${isRecording ? ' recording' : ''}`}
              onClick={isRecording ? handleStop : handleStart}
              disabled={loading}
            >
              {isRecording ? <><FaStop /> Stop</> : <><FaMicrophone /> Record</>}
            </button>
            <span className="status-text">
              {isRecording ? 'Recording...' : loading ? 'Processing...' : 'Ready'}
            </span>
            <button
              className="clear-session-btn"
              onClick={handleClear}
              title="Clear all definitions, explanations, and transcript"
            >
              Clear Session
            </button>
          </div>
          <div className="transcription-box glass">
            <div className="transcription-content">
              {!hasTranscribed && (
                <div className="greeting"></div>
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
                  : <span>{transcription || 'Hi there! Start speaking to transcribe your voice note.'}</span>}
              </div>
            </div>
          </div>
        </div>
        {/* Middle: Technical Definitions */}
        <div className="column definitions-column glass">
          <div className="column-title">Technical Definitions</div>
          <div className="definitions-box card-scroll">
            {renderDefinitions()}
          </div>
        </div>
        {/* Right: Contextual Explanations & Examples */}
        <div className="column context-column glass">
          <div className="column-title">Contextual Explanations & Examples</div>
          <div className="context-box card-scroll">
            {renderContext()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
