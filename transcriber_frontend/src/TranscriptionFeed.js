import React, { useEffect, useState } from "react";

const WEBSOCKET_URL = "ws://localhost:8001/ws"; // Adjust if running elsewhere

export default function TranscriptionFeed() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(WEBSOCKET_URL);

    ws.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };

    ws.onopen = () => {
      // Keep the connection alive
      setInterval(() => ws.send("ping"), 10000);
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div>
      <h2>Live Transcription</h2>
      <ul>
        {messages.map((msg, idx) => (
          <li key={idx}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}