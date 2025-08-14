import React, { useRef, useState, useMemo } from "react";

/**
 * App.js — Podcast News (CRA)
 * - In production, call your Render backend directly.
 * - In dev, CRA proxy (package.json "proxy") forwards to localhost:3001.
 */

const PROD_API_BASE = "https://fetch-bpof.onrender.com"; // <-- your backend on Render
const API_BASE = process.env.NODE_ENV === "production" ? PROD_API_BASE : "";

/** Ensure media urls are absolute in prod */
function normalizeMediaUrl(u) {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;      // already absolute
  if (u.startsWith("/media")) return `${API_BASE}${u}`; // served by backend
  return u;
}

/** Available topics */
const TOPICS = [
  { key: "business", label: "Business" },
  { key: "entertainment", label: "Entertainment" },
  { key: "general", label: "General" },
  { key: "health", label: "Health" },
  { key: "science", label: "Science" },
  { key: "sports", label: "Sports" },
  { key: "technology", label: "Technology" },
  { key: "world", label: "World" },
];

// Height of the fixed footer so content doesn't get hidden underneath
const FOOTER_HEIGHT = 68;

export default function App() {
  const [status, setStatus] = useState("Pick topics, then build a summary.");
  const [isLoading, setIsLoading] = useState(false);

  const [items, setItems] = useState([]);           // [{id,title,summary,url,source,topic,audioUrl}]
  const [combined, setCombined] = useState(null);   // {id,title,summary,audioUrl}
  const [nowPlaying, setNowPlaying] = useState(null); // { title, audioUrl }

  const audioRef = useRef(null);
  const [selected, setSelected] = useState(() => new Set());

  const selectedCount = selected.size;
  const selectedList = useMemo(() => Array.from(selected), [selected]);

  function toggleTopic(key) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function buildCombined() {
    if (selectedCount === 0) return;

    try {
      setIsLoading(true);
      setItems([]);
      setCombined(null);
      setNowPlaying(null);

      setStatus(
        selectedCount === 1
          ? `Building a summary for ${selectedList[0]}…`
          : `Building a combined summary for ${selectedCount} topics…`
      );

      const endpoint =
        selectedCount === 1 ? "/api/summarize" : "/api/summarize/batch";
      const body =
        selectedCount === 1 ? { topic: selectedList[0] } : { topics: selectedList };
      const url = `${API_BASE}${endpoint}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // Read as text first to surface any HTML/error bodies
      const raw = await res.text();
      let data = null;
      try { data = JSON.parse(raw); } catch {}

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${url}: ${raw || "Server error"}`);
      }
      if (!data || typeof data !== "object") {
        throw new Error(`Bad payload from ${url}: ${raw || "empty response"}`);
      }

      // Normalize API result
      const gotCombined = data.combined ?? null;
      const gotItems = Array.isArray(data.items) ? data.items : [];

      // Normalize audio URLs
      if (gotCombined) {
        gotCombined.audioUrl = normalizeMediaUrl(gotCombined.audioUrl);
      }
      gotItems.forEach(it => {
        it.audioUrl = normalizeMediaUrl(it.audioUrl);
      });

      // If only items came back, synthesize a combined card
      if (!gotCombined && gotItems.length > 0) {
        const first = gotItems[0] || {};
        setCombined({
          id: first.id ?? `combined-${Date.now()}`,
          title: first.title ?? "Summary",
          summary:
            typeof first.summary === "string" && first.summary.trim()
              ? first.summary
              : "(No summary provided by server.)",
          audioUrl: normalizeMediaUrl(first.audioUrl),
        });
      } else {
        setCombined(gotCombined);
      }

      setItems(gotItems);
      setStatus("Done.");
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err?.message || "Server error"}`);
    } finally {
      setIsLoading(false);
    }
  }

  function handlePlayAudio(title, audioUrl) {
    const src = normalizeMediaUrl(audioUrl);
    if (!src) return;
    setNowPlaying({ title, audioUrl: src });
    setTimeout(() => {
      try { audioRef.current?.play?.(); } catch {}
    }, 50);
  }

  return (
    <div style={styles.page}>
      <header style={{ ...styles.header }}>
        <div style={styles.container}>
          <h1 style={styles.h1}>Podcast News</h1>
          <div style={styles.status}>{status}</div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Topic chips */}
        <div style={styles.topicsRow}>
          {TOPICS.map((t) => {
            const active = selected.has(t.key);
            return (
              <button
                key={t.key}
                onClick={() => toggleTopic(t.key)}
                style={{ ...styles.chip, ...(active ? styles.chipActive : null) }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button
            disabled={isLoading || selectedCount === 0}
            onClick={buildCombined}
            style={styles.actionBtn}
          >
            {isLoading ? "Working…" : "Summarize & Generate Audio"}
          </button>
          <button
            disabled={isLoading}
            onClick={() => {
              setSelected(new Set());
              setItems([]);
              setCombined(null);
              setNowPlaying(null);
              setStatus("Pick topics, then build a summary.");
            }}
            style={styles.actionBtn}
          >
            Reset
          </button>
        </div>

        {/* Combined summary + items */}
        {combined && (
          <ul style={styles.grid}>
            <li style={styles.card}>
              <div style={styles.cardHeader}>
                <strong>{combined.title}</strong>
                <button
                  style={styles.playButton}
                  onClick={() => handlePlayAudio(combined.title, combined.audioUrl)}
                  disabled={!combined.audioUrl}
                  title={combined.audioUrl ? "Play summary" : "No audio"}
                >
                  ▶ Play
                </button>
              </div>
              <p style={styles.summary}>{combined.summary}</p>
            </li>

            {items.map((it) => (
              <li key={it.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <strong>{it.title}</strong>
                  <div style={{ display: "flex", gap: 8 }}>
                    <a
                      href={it.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.playButton}
                    >
                      Link
                    </a>
                    <button
                      style={styles.playButton}
                      onClick={() => handlePlayAudio(it.title, it.audioUrl)}
                      disabled={!it.audioUrl}
                    >
                      ▶
                    </button>
                  </div>
                </div>
                {!!it.topic && (
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                    {it.source ? `${it.source} · ` : ""}Topic: {it.topic}
                  </div>
                )}
                <p style={styles.summary}>{it.summary || "(No summary)"}</p>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Fixed footer audio bar */}
      <footer style={styles.footer} role="contentinfo">
        <div style={styles.footerInner}>
          <div style={styles.nowPlaying}>
            {nowPlaying?.title ? `Now playing: ${nowPlaying.title}` : "Nothing playing"}
          </div>
          <audio
            ref={audioRef}
            style={styles.audioEl}
            src={nowPlaying?.audioUrl || ""}
            controls
          />
        </div>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#fff",
    fontFamily:
      'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif',
    paddingBottom: FOOTER_HEIGHT, // ensures content never hides under fixed footer
  },
  main: { maxWidth: 960, margin: "0 auto", padding: "16px" },
  header: { borderBottom: "1px solid #e5e7eb", background: "#fff" },
  h1: { fontSize: 22, fontWeight: 600, margin: 0 },
  status: { color: "#6b7280", marginTop: 6, fontSize: 14 },

  topicsRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    borderBottom: "1px solid #e5e7eb",
    paddingTop: 12,
    paddingBottom: 12,
  },
  chip: {
    padding: "6px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 9999,
    background: "#fff",
    cursor: "pointer",
  },
  chipActive: {
    background: "#111",
    color: "#fff",
    borderColor: "#111",
  },

  actions: { display: "flex", gap: 8, paddingTop: 8 },
  actionBtn: {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#fff",
    cursor: "pointer",
  },

  grid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    listStyle: "none",
    padding: 0,
    margin: "12px 0 80px 0",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "space-between",
    marginBottom: 8,
  },
  playButton: {
    fontSize: 12,
    padding: "6px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
  },
  summary: { color: "#374151", fontSize: 14, margin: 0 },

  // Fixed footer
  footer: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    background: "#fff",
    borderTop: "1px solid #e5e7eb",
    zIndex: 100,
    height: FOOTER_HEIGHT,
    display: "flex",
    alignItems: "center",
  },
  footerInner: {
    maxWidth: 960,
    margin: "0 auto",
    padding: 12,
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  nowPlaying: {
    flex: "1 1 auto",
    minWidth: 0,
    fontWeight: 600,
    fontSize: 14,
    color: "#111",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  audioEl: { width: 320, maxWidth: "48vw" },
};
