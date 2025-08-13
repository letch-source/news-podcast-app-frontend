import React, { useState } from "react";

// Use env var in production, fall back to localhost for local dev
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

const TOPICS = ["technology", "sports", "health", "business", "entertainment"];

export default function App() {
  const [summary, setSummary] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchSummary = async (topic) => {
    setLoading(true);
    setErrorMsg("");
    setSummary("");
    setAudioUrl("");

    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed with ${res.status}`);
      }

      const data = await res.json();
      setSummary(data.summary || "No summary returned.");
      if (data.audioUrl) setAudioUrl(data.audioUrl);
    } catch (e) {
      setErrorMsg(e.message || "Error fetching summary.");
    } finally {
      setLoading(false);
    }
  };

  const speakSummary = () => {
    if (!summary) return;
    if (!window.speechSynthesis) {
      alert("Text-to-Speech not supported in this browser.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(summary);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={{ fontFamily: "system-ui, Arial, sans-serif", maxWidth: 720, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 8 }}>Mini Podcast Generator</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        Choose a topic. We’ll fetch recent articles, summarize them, and (optionally) play audio.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "16px 0 24px" }}>
        {TOPICS.map((t) => (
          <button
            key={t}
            onClick={() => fetchSummary(t)}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ddd",
              cursor: "pointer",
              background: "#fafafa",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && <p>Loading…</p>}
      {errorMsg && <p style={{ color: "crimson" }}>Error: {errorMsg}</p>}

      {summary && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Summary</h3>
          <p style={{ lineHeight: 1.6 }}>{summary}</p>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={speakSummary}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #ddd",
                cursor: "pointer",
                background: "#f3f3f3",
              }}
            >
              🔊 Speak (Browser TTS)
            </button>
          </div>
        </div>
      )}

      {audioUrl && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ marginBottom: 8 }}>Audio</h4>
          <audio controls style={{ width: "100%" }}>
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      <div style={{ marginTop: 28, fontSize: 12, color: "#666" }}>
        <strong>API Base:</strong> {API_BASE}
      </div>
    </div>
  );
}
