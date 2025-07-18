import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop } from 'react-icons/fa';

const CHUNK_SIZE = 15;
const CHUNK_OVERLAP = 5;
const CONTEXT_SIZE = 100;

const MeetingTranscript = ({
  isRecording,
  loading,
  handleStart,
  handleStop,
  handleClear,
  statusText,
  onChunkReady // new prop
}) => {
  const [transcript, setTranscript] = useState([]); // array of lines
  const [allWords, setAllWords] = useState([]); // array of all words
  const [lastChunkStart, setLastChunkStart] = useState(0); // index of last chunk start
  const recognitionRef = useRef(null);

  // Start/stop browser speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscript(['[SpeechRecognition not supported in this browser]']);
      return;
    }
    if (isRecording) {
      setTranscript([]);
      setAllWords([]);
      setLastChunkStart(0);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = [];
        for (let i = 0; i < event.results.length; ++i) {
          finalTranscript.push(event.results[i][0].transcript);
        }
        setTranscript(finalTranscript);
        // Flatten all transcript lines into a single string, then split into words
        const joined = finalTranscript.join(' ');
        const words = joined.trim().split(/\s+/).filter(Boolean);
        setAllWords(words);
      };
      recognitionRef.current.onerror = (e) => {
        setTranscript(prev => [...prev, '[SpeechRecognition error: ' + e.error + ']']);
      };
      recognitionRef.current.start();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    }
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [isRecording]);

  // Detect new chunk and notify parent
  useEffect(() => {
    if (!isRecording) return;
    if (allWords.length < CHUNK_SIZE) return;
    // Calculate the start index for the next chunk
    let nextChunkStart = lastChunkStart;
    while (nextChunkStart + CHUNK_SIZE <= allWords.length) {
      // Prepare chunk and context
      const chunk = allWords.slice(nextChunkStart, nextChunkStart + CHUNK_SIZE).join(' ');
      const contextStart = Math.max(0, nextChunkStart + CHUNK_SIZE - CONTEXT_SIZE);
      const context = allWords.slice(contextStart, nextChunkStart + CHUNK_SIZE).join(' ');
      if (onChunkReady) {
        onChunkReady(chunk, context);
      }
      nextChunkStart += (CHUNK_SIZE - CHUNK_OVERLAP);
    }
    setLastChunkStart(nextChunkStart);
  }, [allWords, isRecording]);

  // Clear transcript when session is cleared
  useEffect(() => {
    if (!isRecording && transcript.length > 0 && !loading) {
      setTranscript([]);
      setAllWords([]);
      setLastChunkStart(0);
    }
  }, [loading, isRecording]);

  return (
    <div className="meeting-transcript-section glass">
      <div className="meeting-transcript-title">Meeting Transcript</div>
      <div className="meeting-transcript-content">
        <div className="transcription-content-static">
          {transcript.length > 0 ? (
            <div>{transcript.map((line, idx) => <div key={idx}>{line}</div>)}</div>
          ) : (
            <div className="greeting">Welcome! Click 'Record Meeting' to start transcribing.</div>
          )}
        </div>
      </div>
      <div className="meeting-transcript-controls">
        <button
          className={`record-btn${isRecording ? ' recording' : ''}`}
          onClick={isRecording ? handleStop : handleStart}
          disabled={loading}
        >
          {isRecording ? <><FaStop /> Stop</> : <><FaMicrophone /> Record Meeting</>}
        </button>
        <span className="status-text">{statusText}</span>
        <button
          className="clear-session-btn"
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