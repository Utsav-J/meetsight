import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import styles from './MeetingTranscript.module.css';

const CONTEXT_SIZE = 100;
const DEBOUNCE_MS = 1000;

const MeetingTranscript = ({
  isRecording,
  loading,
  handleStart,
  handleStop,
  handleClear,
  statusText,
  onChunkReady // new prop
}) => {
  const [finalWords, setFinalWords] = useState([]); // all finalized words
  const [lastSentIndex, setLastSentIndex] = useState(0); // up to which word has been sent
  const [interimText, setInterimText] = useState(''); // current interim transcript
  const [displayTranscript, setDisplayTranscript] = useState([]); // for UI
  const recognitionRef = useRef(null);
  const debounceRef = useRef(null);
  const lastResultIndexRef = useRef(0); // Track last processed result index

  // Start/stop browser speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setDisplayTranscript(['[SpeechRecognition not supported in this browser]']);
      return;
    }
    if (isRecording) {
      setFinalWords([]);
      setLastSentIndex(0);
      setInterimText('');
      setDisplayTranscript([]);
      lastResultIndexRef.current = 0; // Reset on start
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event) => {
        let newFinalWords = [];
        let interim = '';
        // Only process the latest result
        const result = event.results[event.resultIndex];
        if (result.isFinal) {
          newFinalWords.push(result[0].transcript);
        } else {
          interim += result[0].transcript + ' ';
        }
        // Update finalized words
        if (newFinalWords.length > 0) {
          setFinalWords(prev => {
            const updated = [...prev, ...newFinalWords.join(' ').split(/\s+/).filter(Boolean)];
            return updated;
          });
        }
        setInterimText(interim.trim());
      };
      recognitionRef.current.onerror = (e) => {
        setDisplayTranscript(prev => [...prev, '[SpeechRecognition error: ' + e.error + ']']);
      };
      recognitionRef.current.start();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      lastResultIndexRef.current = 0; // Reset on stop
    }
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      lastResultIndexRef.current = 0; // Reset on unmount
    };
  }, [isRecording]);

  // Send any unsent words as a chunk
  const sendUnsentChunk = () => {
    if (lastSentIndex < finalWords.length) {
      const chunkWords = finalWords.slice(lastSentIndex);
      if (chunkWords.length > 0) {
        const chunk = chunkWords.join(' ');
        const contextStart = Math.max(0, lastSentIndex - CONTEXT_SIZE);
        const context = finalWords.slice(contextStart, finalWords.length).join(' ');
        if (onChunkReady) {
          onChunkReady(chunk, context);
        }
        setLastSentIndex(finalWords.length);
      }
    }
  };

  // On stop/clear, send any unsent words
  useEffect(() => {
    if (!isRecording && finalWords.length > 0 && lastSentIndex < finalWords.length) {
      sendUnsentChunk();
    }
    // eslint-disable-next-line
  }, [isRecording]);

  // Add a debounced useEffect for finalWords
  useEffect(() => {
    if (!isRecording) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      sendUnsentChunk();
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [finalWords, isRecording]);

  // Update display transcript for UI (final + interim)
  useEffect(() => {
    const display = [];
    if (finalWords.length > 0) {
      display.push(finalWords.join(' '));
    }
    if (interimText) {
      display.push(<span key="interim" style={{ color: '#aaa', fontStyle: 'italic' }}>{interimText}</span>);
    }
    setDisplayTranscript(display);
  }, [finalWords, interimText]);

  // Clear all state on clear
  useEffect(() => {
    if (!isRecording && displayTranscript.length > 0 && !loading) {
      setFinalWords([]);
      setLastSentIndex(0);
      setInterimText('');
      setDisplayTranscript([]);
    }
    // eslint-disable-next-line
  }, [loading, isRecording]);

  return (
    <div className={styles['meeting-transcript-section'] + ' glass'}>
      <div className={styles['meeting-transcript-title']}>Meeting Transcript</div>
      <div className={styles['meeting-transcript-content']}>
        <div className={styles['transcription-content-static']}>
          {displayTranscript.length > 0 ? (
            <div>{displayTranscript.map((line, idx) => <div key={idx}>{line}</div>)}</div>
          ) : (
            <div className={styles.greeting}>Welcome! Click 'Record Meeting' to start transcribing.</div>
          )}
        </div>
      </div>
      <div className={styles['meeting-transcript-controls']}>
        <button
          className={styles['record-btn'] + (isRecording ? ' ' + styles['recording'] : '')}
          onClick={isRecording ? handleStop : handleStart}
          disabled={loading}
        >
          {isRecording ? <><FaStop /> Stop</> : <><FaMicrophone /> Record Meeting</>}
        </button>
        <span className={styles['status-text']}>{statusText}</span>
        <button
          className={styles['clear-session-btn']}
          onClick={handleClear}
          title="Clear all definitions, explanations, and transcript"
        >
          Clear Session
        </button>
      </div>
    </div>
  );
};

export default MeetingTranscript; 