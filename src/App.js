import React, { useState, useEffect } from "react";

// If your backend is same-origin in prod, leave blank.
// For local dev with a separate server, set REACT_APP_API_BASE in .env (e.g., http://localhost:5000)
const BACKEND_URL = process.env.REACT_APP_API_BASE || "";

// ---- Safe JSON POST helper: always reads body and throws readable errors ----
async function postJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });

  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text(); // read once; parse later if JSON

  let data = null;
  if (contentType.includes("application/json") && raw) {
    try {
      data = JSON.parse(raw);
    } catch (_) {
      /* fall through */
    }
  }

  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${res.statusText} — ${raw.slice(0, 400) || "no body"}`
    );
  }
  if (!data) {
    throw new Error(`Expected JSON but got: ${raw.slice(0, 400) || "empty body"}`);
  }
  return data;
}

// Fixed bottom audio bar
function AudioBar({ src }) {
  if (!src) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        padding: "12px 16px",
        background: "rgba(255,255,255,0.95)",
        borderTop: "1px solid #e5e7eb",
        boxShadow: "0 -4px 10px rgba(0,0,0,0.06)",
        zIndex: 50,
      }}
    >
      <audio src={src} controls style={{ width: "100%" }} />
    </div>
  );
}

export default function App() {
  const [topic, setTopic] = useState("business");
  const [customText, setCustomText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [useKnownGood, setUseKnownGood] = useState(false);

  // Known-good MP3 for isolating front-end audio problems
  const KNOWN_GOOD_MP3 =
    "https://file-examples.com/storage/fef4e8f6f2f3c6b6c3a6f0e/2017/11/file_example_MP3_700KB.mp3";

  async function handleSummarize() {
    setErr("");
    setLoading(true);
    setSummary("");
    setAudioUrl("");

    try {
      if (useKnownGood) {
        setAudioUrl(KNOWN_GOOD_MP3);
        setSummary("(diagnostic) Playing known-good MP3.");
        return;
      }

      const data = await postJson(`${BACKEND_URL}/api/summarize`, {
        topic: topic.trim(),
        text: customText.trim() || undefined,
      });

      const url =
        data?.combined?.audioUrl ??
        data?.audioUrl ??
        data?.result?.audioUrl ??
        "";

      if (!url) {
        throw new Error("Server responded but missing combined.audioUrl");
      }

      setSummary(data?.combined?.summary || "");
      setAudioUrl(url);
    } catch (e) {
      console.error("Audio error:", e);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  // basic UI
  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 8 }}>Podcast News — Summarize to Audio</h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        Generates a summary and returns <code>combined.audioUrl</code> from{" "}
        <code>POST /api/summarize</code>.
      </p>

      <label style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>
        Topic
      </label>
      <select
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        style={{ padding: 8, marginBottom: 16 }}
      >
        <option value="business">Business</option>
        <option value="technology">Technology</option>
        <option value="world">World</option>
        <option value="science">Science</option>
        <option value="sports">Sports</option>
      </select>

      <label style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>
        (Optional) Custom text to summarize
      </label>
      <textarea
        rows={6}
        placeholder="Paste your own text to summarize (optional)"
        value={customText}
        onChange={(e) => setCustomText(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 16 }}
      />

      <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 16px" }}>
        <input
          type="checkbox"
          checked={useKnownGood}
          onChange={(e) => setUseKnownGood(e.target.checked)}
        />
        Use known-good test MP3 (diagnostic)
      </label>

      <button
        onClick={handleSummarize}
        disabled={loading}
        style={{
          padding: "10px 14px",
          fontWeight: 600,
          borderRadius: 8,
          border: "1px solid #111827",
          background: loading ? "#e5e7eb" : "#111827",
          color: loading ? "#111827" : "white",
          cursor: loading ? "default" : "pointer",
        }}
      >
        {loading ? "Working…" : "Summarize & Generate Audio"}
      </button>

      {err && (
        <pre
          style={{
            marginTop: 16,
            padding: 12,
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: 8,
            whiteSpace: "pre-wrap",
          }}
        >
          {err}
        </pre>
      )}

      {summary && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
          }}
        >
          <strong>Summary</strong>
          <p style={{ marginTop: 8 }}>{summary}</p>
        </div>
      )}

      <AudioBar src={audioUrl} />
      <div style={{ height: 80 }} />
    </div>
  );
}
