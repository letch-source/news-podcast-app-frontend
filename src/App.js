import React, { useRef, useState, useMemo } from "react";

const PROD_API_BASE = "https://fetch-bpof.onrender.com";
const API_BASE = process.env.NODE_ENV === "production" ? PROD_API_BASE : "";

function normalizeMediaUrl(u) {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/media")) return `${API_BASE}${u}`;
  return u;
}

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

const LENGTH_OPTIONS = [
  { key: "short", label: "Short", words: 200 },
  { key: "medium", label: "Medium", words: 1000 },
  { key: "long", label: "Long", words: 2000 },
];

const FOOTER_HEIGHT = 68;

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [combined, setCombined] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);

  const audioRef = useRef(null);
  const [selected, setSelected] = useState(() => new Set());
  const [selectedLength, setSelectedLength] = useState("short");

  // Progress phase for the fetch button: 'idle' | 'gather' | 'summarize' | 'tts'
  const [phase, setPhase] = useState("idle");

  // Track if user changed inputs since last successful fetch
  const [isDirty, setIsDirty] = useState(true); // start enabled/black

  const selectedCount = selected.size;
  const selectedList = useMemo(() => Array.from(selected), [selected]);

  function toggleTopic(key) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setIsDirty(true);
  }

  function currentButtonLabel() {
    switch (phase) {
      case "gather": return "Gathering sources…";
      case "summarize": return "Building summary…";
      case "tts": return "Recording audio…";
      default: return "Fetch the News";
    }
  }

  function fetchBtnStyle() {
    const disabled = (isLoading || selectedCount === 0 || phase !== "idle" || !isDirty);
    if (disabled) return { ...styles.actionBtn, ...styles.actionBtnDisabled };
    // idle + dirty (ready to fetch) -> black primary
    return { ...styles.actionBtn, ...styles.actionBtnPrimary };
  }

  async function buildCombined() {
    if (selectedCount === 0 || phase !== "idle" || !isDirty) return;

    const lengthObj = LENGTH_OPTIONS.find(l => l.key === selectedLength) || LENGTH_OPTIONS[0];
    const wordCount = lengthObj.words;

    try {
      setIsLoading(true);
      setItems([]);
      setCombined(null);
      setNowPlaying(null);

      setPhase("gather");

      const endpoint = selectedCount === 1 ? "/api/summarize" : "/api/summarize/batch";
      const body = selectedCount === 1 ? { topic: selectedList[0], wordCount } : { topics: selectedList, wordCount };

      const summarizePhaseTimer = setTimeout(() => setPhase("summarize"), 300);

      // fast text-first path
      const url = `${API_BASE}${endpoint}?noTts=1`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      clearTimeout(summarizePhaseTimer);

      const raw = await res.text();
      let data = null;
      try { data = JSON.parse(raw); } catch {}

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${raw || "Server error"}`);
      if (!data || typeof data !== "object") throw new Error(`Bad payload: ${raw || "empty"}`);

      const gotCombined = data.combined ?? null;
      const gotItems = Array.isArray(data.items) ? data.items : [];

      if (gotCombined) gotCombined.audioUrl = normalizeMediaUrl(gotCombined.audioUrl);
      gotItems.forEach(it => { it.audioUrl = normalizeMediaUrl(it.audioUrl); });

      const combinedToSet =
        gotCombined ||
        (gotItems[0] && {
          id: gotItems[0].id ?? `combined-${Date.now()}`,
          title: gotItems[0].title ?? "Summary",
          summary: gotItems[0].summary || "(No summary provided.)",
          audioUrl: normalizeMediaUrl(gotItems[0].audioUrl),
        }) || null;

      setCombined(combinedToSet);
      setItems(gotItems);

      // TTS phase
      if (combinedToSet?.summary) {
        setPhase("tts");
        try {
          const ttsRes = await fetch(`${API_BASE}/api/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: combinedToSet.summary }),
          });
          const ttsData = await ttsRes.json();
          const audioUrl = normalizeMediaUrl(ttsData?.audioUrl || "");
          if (audioUrl) setCombined(prev => (prev ? { ...prev, audioUrl } : prev));
        } catch (e) {
          console.error("TTS error:", e);
        }
      }

      // Successful run: mark clean so fetch button greys out
      setIsDirty(false);
    } catch (err) {
      console.error(err);
      // keep dirty so user can retry
      setIsDirty(true);
    } finally {
      setIsLoading(false);
      setPhase("idle");
    }
  }

  function handlePlayAudio(title, audioUrl) {
    const src = normalizeMediaUrl(audioUrl);
    if (!src) return;
    setNowPlaying({ title, audioUrl: src });
    setTimeout(() => { try { audioRef.current?.play?.(); } catch {} }, 50);
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.container}>
          <h1 style={styles.h1}>Fetch News</h1>
          <div style={styles.subtitle}>Custom news updates.</div>
        </div>
      </header>

      <main style={styles.container}>
        {/* Topics */}
        <div style={styles.topicsRow}>
          {TOPICS.map(t => {
            const active = selected.has(t.key);
            return (
              <button
                key={t.key}
                onClick={() => toggleTopic(t.key)}
                aria-pressed={active}
                style={{ ...styles.chip, ...(active ? styles.chipActive : null) }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Length options */}
        <div style={styles.lengthRow}>
          {LENGTH_OPTIONS.map(opt => {
            const active = selectedLength === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => { setSelectedLength(opt.key); setIsDirty(true); }}
                aria-pressed={active}
                style={{ ...styles.lengthBtn, ...(active ? styles.lengthBtnActive : null) }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button
            disabled={isLoading || selectedCount === 0 || phase !== "idle" || !isDirty}
            onClick={buildCombined}
            style={fetchBtnStyle()}
          >
            {currentButtonLabel()}
          </button>
          <button
            disabled={isLoading && phase !== "idle"}
            onClick={() => {
              setSelected(new Set());
              setItems([]);
              setCombined(null);
              setNowPlaying(null);
              setSelectedLength("short");
              setPhase("idle");
              setIsDirty(true);
            }}
            style={styles.actionBtn}
          >
            Reset
          </button>
        </div>

        {/* MAIN summary */}
        {combined && (
          <section style={styles.heroSection}>
            <div style={styles.heroCard}>
              <div style={styles.cardHeader}>
                <strong>{combined.title}</strong>
                <button
                  onClick={() => handlePlayAudio(combined.title, combined.audioUrl)}
                  disabled={!combined?.audioUrl}
                  style={{
                    ...styles.playButton,
                    ...(!combined?.audioUrl ? styles.playButtonDisabled : null),
                  }}
                  title={combined?.audioUrl ? "Play summary" : "Audio not ready yet"}
                >
                  ▶ Play
                </button>
              </div>
              <p style={styles.summary}>{combined.summary}</p>
            </div>
          </section>
        )}

        {/* Sub summaries (sources) */}
        {items.length > 0 && (
          <ul style={styles.grid}>
            {items.map(it => (
              <li key={it.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <strong>{it.title}</strong>
                  <a
                    href={it.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.linkButton}
                    title="Open source article"
                  >
                    Link
                  </a>
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

      {/* Fixed footer player */}
      <footer style={styles.footer}>
        <div style={styles.container}>
          <div style={styles.footerInner}>
            <div style={styles.nowPlaying}>
              {nowPlaying?.title ? `Now playing: ${nowPlaying.title}` : "Nothing playing"}
            </div>
            <audio ref={audioRef} style={styles.audioEl} src={nowPlaying?.audioUrl || ""} controls />
          </div>
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
    paddingBottom: FOOTER_HEIGHT,
  },
  container: { maxWidth: 960, margin: "0 auto", padding: "16px" },
  header: { borderBottom: "1px solid #e5e7eb", background: "#fff" },
  h1: { fontSize: 22, fontWeight: 600, margin: 0 },
  subtitle: { color: "#6b7280", marginTop: 6, fontSize: 14 },

  topicsRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    borderBottom: "1px solid #e5e7eb",
    paddingTop: 12,
    paddingBottom: 12,
  },

  // Topic chips
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
    border: "1px solid #111",
  },

  // Length selector
  lengthRow: { display: "flex", gap: 8, paddingTop: 12, paddingBottom: 12 },
  lengthBtn: {
    padding: "6px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
  },
  lengthBtnActive: {
    background: "#111",
    color: "#fff",
    border: "1px solid #111",
  },

  // Actions (Fetch / Reset)
  actions: { display: "flex", gap: 8, paddingTop: 8 },
  actionBtn: {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#fff",
    cursor: "pointer",
    transition: "opacity 0.15s ease, background 0.15s ease, color 0.15s ease",
  },
  actionBtnPrimary: {
    background: "#111",
    color: "#fff",
    border: "1px solid #111",
  },
  actionBtnDisabled: {
    background: "#f3f4f6",
    color: "#9ca3af",
    border: "1px solid #e5e7eb",
    cursor: "not-allowed",
  },

  // Main summary card
  heroSection: { marginTop: 12, marginBottom: 12 },
  heroCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
  },

  // Sub summaries grid
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

  // Buttons
  playButton: {
    fontSize: 12,
    padding: "6px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
  },
  playButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  linkButton: {
    fontSize: 12,
    padding: "6px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#fff",
    textDecoration: "none",
    display: "inline-block",
  },

  summary: { color: "#374151", fontSize: 14, margin: 0 },

  // Fixed footer audio bar
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
