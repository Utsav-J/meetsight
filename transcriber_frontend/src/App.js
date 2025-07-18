import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import {FaGithub, FaSun, FaMoon} from 'react-icons/fa';
import DefinitionCard from './components/DefinitionCard';
import ContextCard from './components/ContextCard';
import ActionItemCard from './components/ActionItemCard';
import MeetingTranscript from './components/MeetingTranscript';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const DEFINITIONS_CACHE_KEY = 'wf_teams_definitions_cache';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // Default to dark mode
  const [hasTranscribed, setHasTranscribed] = useState(false);
  const [definitions, setDefinitions] = useState([]);
  // Remove pollingRef and polling logic

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

  // Remove polling for transcription/LLM output

  const handleStart = () => {
    setTranscription('');
    setLoading(false);
    setHasTranscribed(false);
    setIsRecording(true);
  };

  const handleStop = async () => {
    setIsRecording(false);
    setLoading(false);
    // Optionally, you can still call the backend to stop any background process
    try {
      await fetch(`${API_URL}/transcription/stop`, { method: 'POST' });
    } catch (err) {
      // Ignore errors
    }
  };

  // Add clear handler
  const handleClear = () => {
    setDefinitions([]);
    localStorage.removeItem(DEFINITIONS_CACHE_KEY);
    setTranscription('');
    setHasTranscribed(false);
  };

  // Handler for new chunk ready from MeetingTranscript
  const onChunkReady = async (chunk, context) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/llm/extract_terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunk, context })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.technical_terms && Array.isArray(data.technical_terms)) {
          setDefinitions(prevDefs => {
            const prevTerms = new Set(prevDefs.map(d => d.term));
            const newDefs = data.technical_terms.filter(d => d.term && !prevTerms.has(d.term));
            const merged = [...prevDefs, ...newDefs];
            localStorage.setItem(DEFINITIONS_CACHE_KEY, JSON.stringify(merged));
            return merged;
          });
        }
      }
    } catch (err) {
      // Optionally handle error
    } finally {
      setLoading(false);
    }
  };

  // Prepare content for the definitions and context boxes
  const renderDefinitions = () => {
    if (loading) {
      return <div className="spinner">Loading technical terms...</div>;
    }
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
    if (loading) {
      return <div className="spinner">Loading contextual explanations...</div>;
    }
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
      <div className="main-columns redesigned-layout">
        {/* Left: Technical Definitions */}
        <div className="column definitions-column glass">
          <div className="column-title">Technical Definitions</div>
          <div className="definitions-box card-scroll">
            {renderDefinitions()}
          </div>
        </div>
        {/* Middle: Contextual Explanations & Examples */}
        <div className="column context-column glass">
          <div className="column-title">Contextual Explanations & Examples</div>
          <div className="context-box card-scroll">
            {renderContext()}
          </div>
        </div>
        {/* Right: Action Items */}
        <div className="column action-items-column glass">
          <div className="column-title">Action Items</div>
          <div className="action-items-box card-scroll">
            <ActionItemCard title="Finalize API Gateway Configuration" description="Ensure the API gateway is robust and scalable for the new microservices." />
            <ActionItemCard title="Review Data Lake Migration Performance" description="Check current ETL process efficiency and overall data lake performance." />
            <ActionItemCard title="Train Machine Learning Models" description="Continue training neural network models for fraud detection." />
            <ActionItemCard title="Research Blockchain Integration" description="Explore smart contracts on the Ethereum network for supply chain transparency." />
          </div>
        </div>
      </div>
      {/* Bottom: Meeting Transcript Section */}
      <MeetingTranscript
        transcription={transcription}
        isRecording={isRecording}
        loading={loading}
        handleStart={handleStart}
        handleStop={handleStop}
        handleClear={handleClear}
        statusText={isRecording ? 'Recording...' : loading ? 'Processing...' : 'Ready'}
        onChunkReady={onChunkReady}
      />
    </div>
  );
}

export default App;