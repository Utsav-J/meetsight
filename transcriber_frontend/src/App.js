import React, { useState, useEffect} from 'react';
import layoutStyles from './components/common/ColumnLayout/ColumnLayout.module.css';
import headerStyles from './components/common/Header/Header.module.css';
import {FaGithub, FaSun, FaMoon, FaInfoCircle} from 'react-icons/fa';
import ActionItemCard from './components/cards/ActionItemCard/ActionItemCard';
import MeetingTranscript from './components/transcript/MeetingTranscript/MeetingTranscript';
import InfoModal from './components/modals/InfoModal/InfoModal';
import CombinedDefinitionCard from './components/cards/CombinedDefinitionCard/CombinedDefinitionCard';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const DEFINITIONS_CACHE_KEY = 'wf_teams_definitions_cache';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // Default to dark mode
  const [hasTranscribed, setHasTranscribed] = useState(false);
  const [definitions, setDefinitions] = useState([]);
  const [infoOpen, setInfoOpen] = useState(false);
  
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
    try {
      await fetch(`${API_URL}/transcription/stop`, { method: 'POST' });
    } catch (err) {
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

  // Prepare content for the combined card box
  const renderCombinedCards = () => {
    if (loading) {
      return <div className="spinner">Loading technical terms...</div>;
    }
    if (!definitions || definitions.length === 0) {
      return <div>No technical terms found yet.</div>;
    }
    return (
      <div className="card-list">
        {[...definitions]
          .sort((a, b) => (b.difficulty || 0) - (a.difficulty || 0))
          .map((def, idx) => (
            <CombinedDefinitionCard
              key={idx}
              term={def.term}
              definition={def.definition}
              contextual_explanation={def.contextual_explanation}
              example_quote={def.example_quote}
              difficulty={def.difficulty}
            />
          ))}
      </div>
    );
  };

  return (
    <div className={`app-root ${darkMode ? 'dark' : 'light'}`}>
      {/* Header */}
      <header className={headerStyles['app-header'] + ' glass'}>
        <div className={headerStyles['header-title']}>Meeting Insights</div>
        <div className={headerStyles['header-actions']}>
          <button className={headerStyles['icon-btn']} title="Info" onClick={() => setInfoOpen(true)}>
            <FaInfoCircle />
          </button>
          <button className={headerStyles['icon-btn']} title="GitHub Repo">
            <FaGithub />
          </button>
          <button className={headerStyles['theme-toggle-pill']} onClick={() => setDarkMode(dm => !dm)}>
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
        </div>
      </header>
      {/* Info Modal */}
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      {/* Main single-column layout for combined cards */}
      <div className={layoutStyles['main-columns'] + ' ' + layoutStyles['redesigned-layout']}>
        {/* Single: Combined Technical Card List */}
        <div className={layoutStyles['column'] + ' definitions-column glass'}>
          <div className={layoutStyles['column-title']}>Technical Terms & Context</div>
          <div className={layoutStyles['definitions-box'] + ' card-scroll'}>
            {renderCombinedCards()}
          </div>
        </div>
        {/* Right: Action Items */}
        <div className={layoutStyles['column'] + ' action-items-column glass'}>
          <div className={layoutStyles['column-title']}>Action Items</div>
          <div className={layoutStyles['action-items-box'] + ' card-scroll'}>
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