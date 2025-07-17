import React from "react";
import TranscriptionFeed from "./TranscriptionFeed";

function App() {
  return (
    <div className="App" style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>System Audio Live Transcription</h1>
      <TranscriptionFeed />
    </div>
  );
}

export default App;
