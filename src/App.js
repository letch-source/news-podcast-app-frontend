import React, { useMemo, useState, useEffect } from "react";
import "./App.css";

const DEFAULT_TOPICS = [
  "technology",
  "business",
  "entertainment",
  "health",
  "science",
  "sports",
  "world",
  "politics",
];

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

export default function App() {
  const prefersDark = useMemo(
    () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches,
    []
  );

  const [dark, setDark] = useState(prefersDark);
  const [topics] = useState(DEFAULT_TOPICS);
  const [activeTopic, setActiveTopic] = useState("");
  const [summary, setSummary] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  async function fetchSummary(topic) {
    setLoading(true);
    setErrorMsg("");
    setSummary("");
    setAudioUrl("");
    setActiveTopic(topic);

    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      setSummary(data.summary || "No summary returned.");
      if (data.audioUrl) setAudioUrl(data.audioUrl);
    } catch (e) {
      setErrorMsg(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function speakSummary() {
    if (!summary) return;
    if (!window.speechSynthesis) {
      setErrorMsg("Text-to-Speech not supported in this browser.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(summary);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">
          <span className="brand__logo">🎙️</span>
          <h1 className="brand__title">Mini Podcast Generator</h1>
        </div>

        <div className="header__right">
          <span className="api-hint" title={`API: ${API_BASE}`}>API</span>
          <button
            className="toggle"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setDark((d) => !d)}
          >
            {dark ? "🌙" : "☀️"}
          </button>
        </div>
      </header>

      <main className="container">
        <section className="card">
          <h2 className="card__title">Choose a topic</h2>
          <div className="chips">
            {topics.map((t) => {
              const isActive = activeTopic === t && loading;
              return (
                <button
                  key={t}
                  className={`chip ${activeTopic === t ? "chip--active" : ""}`}
                  onClick={() => fetchSummary(t)}
                  disabled={loading && isActive}
                >
                  {t}
                  {isActive && <span className="chip__spinner" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          {loading && (
            <div className="loading" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true" />
              Fetching & summarizing latest {activeTopic} news…
            </div>
          )}

          {errorMsg && (
            <div className="alert alert--error" role="alert" aria-live="assertive">
              <strong>Error:</strong> {errorMsg}
            </div>
          )}

          {!!summary && !loading && (
            <div className="summary">
              <div className="summary__header">
                <h3>Summary</h3>
                <div className="summary__actions">
                  <button className="btn" onClick={speakSummary}>🔊 Speak</button>
                  {audioUrl && (
                    <a className="btn btn--ghost" href={audioUrl} download>
                      ⤓ Download
                    </a>
                  )}
                </div>
              </div>

              <p className="summary__text">{summary}</p>

              {audioUrl && (
                <div className="audio">
                  <audio controls preload="none">
                    <source src={audioUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <span>Made for quick daily briefings.</span>
      </footer>
    </div>
  );
}
