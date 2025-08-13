import React, { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
const TOPICS = ["technology", "business", "entertainment", "health", "science", "sports", "world", "politics"];

export default function App() {
  const prefersDark = useMemo(
    () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches,
    []
  );
  const [dark, setDark] = useState(prefersDark);

  const [activeTopic, setActiveTopic] = useState("");
  const [summary, setSummary] = useState("");
  const [audioUrl, setAudioUrl] = useState(""); // <-- when set, the bottom bar appears
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
      if (data.audioUrl) setAudioUrl(data.audioUrl); // <-- show player if backend gave us audio
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

  // Minimal inline styles (kept here so you don’t need extra files)
  const styles = {
    page: {
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      color: "var(--text, #0f172a)",
      background: "var(--bg, #ffffff)",
      minHeight: "100vh",
      margin: 0,
    },
    header: {
      position: "sticky",
      top: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 20px",
      borderBottom: "1px solid var(--border, #e5e7eb)",
      background: "rgba(255,255,255,0.9)",
      backdropFilter: "blur(6px)",
      zIndex: 5,
    },
    container: { maxWidth: 920, margin: "24px auto", padding: "0 16px" },
    card: {
      background: "var(--bg-elev, #f8fafc)",
      border: "1px solid var(--border, #e5e7eb)",
      borderRadius: 16,
      padding: 22,
      boxShadow: "0 6px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)",
    },
    chips: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 },
    chip: {
      border: "1px solid var(--border, #e5e7eb)",
      background: "var(--bg, #fff)",
      padding: "8px 12px",
      borderRadius: 999,
      cursor: "pointer",
    },
    loading: { marginTop: 12, color: "#64748b" },
    error: {
      marginTop: 12,
      padding: "10px 12px",
      borderRadius: 10,
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fecaca",
    },
    actionsRow: { display: "flex", gap: 8, marginTop: 12 },
    btn: {
      background: "#2563eb",
      color: "#fff",
      border: "0",
      borderRadius: 10,
      padding: "8px 12px",
      cursor: "pointer",
    },
    btnGhost: {
      background: "transparent",
      color: "inherit",
      border: "1px solid var(--border, #e5e7eb)",
      borderRadius: 10,
      padding: "8px 12px",
      cursor: "pointer",
    },
    footer: {
      padding: "18px 20px",
      borderTop: "1px solid var(--border, #e5e7eb)",
      fontSize: 13,
      color: "#64748b",
      textAlign: "center",
      marginTop: 40,
    },
    // Sticky bottom audio bar
    audioBar: {
      position: "fixed",
      left: 12,
      right: 12,
      bottom: 12,
      zIndex: 9999,
      display: "grid",
      gridTemplateColumns: "1fr auto",
      alignItems: "center",
      gap: 12,
      padding: "10px 12px",
      background: "rgba(30,41,59,0.92)",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 14,
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      backdropFilter: "blur(6px)",
    },
    audioTitle: {
      fontSize: 14,
      marginBottom: 6,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    audioControls: { width: "100%" },
    audioRight: { display: "flex", alignItems: "center", gap: 8 },
    closeBtn: {
      background: "transparent",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.2)",
      borderRadius: 10,
      padding: "6px 10px",
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🎙️</span>
          <h1 style={{ margin: 0, fontSize: 18 }}>Mini Podcast Generator</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            title={`API: ${API_BASE}`}
            style={{ fontSize: 12, color: "#64748b", border: "1px dashed #e5e7eb", padding: "2px 6px", borderRadius: 6 }}
          >
            API
          </span>
          <button
            onClick={() => setDark((d) => !d)}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              border: "1px solid var(--border, #e5e7eb)",
              background: "var(--bg-elev, #f8fafc)",
              borderRadius: 10,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            {dark ? "🌙" : "☀️"}
          </button>
        </div>
      </header>

      <main style={styles.container}>
        <section style={styles.card}>
          <h2 style={{ margin: "6px 0 14px", fontSize: 18 }}>Choose a topic</h2>

          <div style={styles.chips}>
            {TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => fetchSummary(t)}
                disabled={loading && activeTopic === t}
                style={{
                  ...styles.chip,
                  borderColor: activeTopic === t ? "#2563eb" : "var(--border, #e5e7eb)",
                  opacity: loading && activeTopic !== t ? 0.6 : 1,
                }}
              >
                {t}
                {loading && activeTopic === t ? " ⏳" : ""}
              </button>
            ))}
          </div>

          {loading && <div style={styles.loading}>Fetching & summarizing latest {activeTopic} news…</div>}

          {errorMsg && (
            <div style={styles.error} role="alert" aria-live="assertive">
              <strong>Error:</strong> {errorMsg}
            </div>
          )}

          {!!summary && !loading && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <h3 style={{ margin: 0 }}>Summary</h3>
                <div style={styles.actionsRow}>
                  <button style={styles.btn} onClick={speakSummary}>🔊 Speak</button>
                  {audioUrl && (
                    <a style={styles.btnGhost} href={audioUrl} download>
                      ⤓ Download
                    </a>
                  )}
                </div>
              </div>

              <p style={{ lineHeight: 1.65 }}>{summary}</p>
            </div>
          )}
        </section>
      </main>

      {/* Sticky bottom audio player (appears only when audioUrl is set) */}
      {audioUrl && (
        <div style={styles.audioBar} role="region" aria-label="Mini podcast player">
          <div>
            <div style={styles.audioTitle}>
              {activeTopic ? `Latest ${activeTopic} briefing` : "Now playing"}
            </div>
            <audio
              controls
              preload="none"
              src={audioUrl}
              style={styles.audioControls}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
          <div style={styles.audioRight}>
            <a
              href={audioUrl}
              download
              style={{ ...styles.closeBtn, borderColor: "rgba(255,255,255,0.35)" }}
              aria-label="Download audio"
            >
              ⤓
            </a>
            <button
              onClick={() => setAudioUrl("")}
              style={styles.closeBtn}
              aria-label="Close player"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <footer style={styles.footer}>Made for quick daily briefings.</footer>
    </div>
  );
}
