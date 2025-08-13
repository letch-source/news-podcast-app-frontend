import React, { useRef, useState, useMemo } from "react";

// In dev, CRA proxy will forward /api/* to http://localhost:3001
const API_BASE = ""; // keep empty in dev

const TOPICS = [
  { key: "business", label: "Business" },
  { key: "technology", label: "Technology" },
  { key: "sports", label: "Sports" },
  { key: "entertainment", label: "Entertainment" },
  { key: "science", label: "Science" },
  { key: "world", label: "World" },
  { key: "health", label: "Health" },
];

export default function App() {
  const [status, setStatus] = useState("Pick topics, then build a summary.");
  const [isLoading, setIsLoading] = useState(false);

  // Per-item list (optional; may include per-article bullets)
  const [items, setItems] = useState([]); // [{id,title,summary,audioUrl,topic?}]
  // Combined mega-summary
  const [combined, setCombined] = useState(null); // {id,title,summary,audioUrl}

  // Audio
  const [nowPlaying, setNowPlaying] = useState(null); // { title, audioUrl }
  const audioRef = useRef(null);

  // Topic selection
  const [selected, setSelected] = useState(() => new Set());
  const selectedCount = selected.size;
  const selectedList = useMemo(() => Array.from(selected), [selected]);

  function toggleTopic(key) {
    setCombined(null);
    setItems([]);
    setStatus("Configuring…");
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
          ? `Building summary for ${selectedList[0]}…`
          : `Building a combined summary for ${selectedCount} topics…`
      );

      const endpoint =
        selectedCount === 1 ? "/api/summarize" : "/api/summarize/batch";

      const body =
        selectedCount === 1
          ? { topic: selectedList[0] }
          : { topics: selectedList };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        /* ignore */
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text || "Server error"}`);
      if (!data) throw new Error(`Bad payload: ${text || "empty response"}`);

      // Preferred shape for batch: { combined, items? }
      // For single: { items: [...] } — keep backward compatible
      if (data.combined) setCombined(data.combined);
      if (Array.isArray(data.items)) setItems(data.items);

      if (!data.combined && Array.isArray(data.items) && data.items.length > 0) {
        // Back-compat: treat the first item as the "combined" card if none provided
        setCombined({
          id: data.items[0].id ?? "combined-0",
          title: data.items[0].title ?? "Summary",
          summary:
            typeof data.items[0].summary === "string" &&
            data.items[0].summary.trim()
              ? data.items[0].summary
              : "(No summary provided by server.)",
          audioUrl: data.items[0].audioUrl ?? null,
        });
      }

      setStatus("Summary ready");
    } catch (err) {
      console.error(err);
      setItems([]);
      setCombined(null);
      setNowPlaying(null);
      setStatus(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  function handlePlay(item) {
    if (!item?.audioUrl) {
      console.log("No audioUrl on item; nothing to play.");
      return;
    }
    setNowPlaying({ title: item.title, audioUrl: item.audioUrl });
    setTimeout(() => {
      const el = audioRef.current;
      if (!el) return;
      el.play().catch((e) => {
        console.log("Audio play() was blocked or failed:", e?.message || e);
      });
    }, 0);
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.container}>
          <h1 style={styles.h1}>Podcast News</h1>
          <p style={styles.status}>{status}</p>
        </div>
      </header>

      {/* Topic chips */}
      <div style={{ ...styles.container, ...styles.topicsRow }}>
        {TOPICS.map((t) => {
          const active = selected.has(t.key);
          return (
            <button
              key={t.key}
              onClick={() => toggleTopic(t.key)}
              disabled={isLoading}
              style={{
                ...styles.chip,
                ...(active ? styles.chipActive : {}),
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ ...styles.container, ...styles.actions }}>
        <button
          onClick={buildCombined}
          disabled={isLoading || selectedCount === 0}
          style={{
            ...styles.actionBtn,
            opacity: isLoading || selectedCount === 0 ? 0.6 : 1,
            cursor: isLoading || selectedCount === 0 ? "not-allowed" : "pointer",
          }}
        >
          {selectedCount >= 2
            ? `Build Combined Summary (${selectedCount})`
            : selectedCount === 1
            ? "Build Summary"
            : "Select topics"}
        </button>

        {selectedCount > 0 && (
          <button
            onClick={() => {
              setSelected(new Set());
              setCombined(null);
              setItems([]);
              setNowPlaying(null);
              setStatus("Selection cleared.");
            }}
            style={styles.actionBtn}
          >
            Clear
          </button>
        )}
      </div>

      {/* Results */}
      <main style={styles.container}>
        {/* Combined card */}
        {combined && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ fontWeight: 700 }}>{combined.title}</div>
              {combined.audioUrl ? (
                <button
                  onClick={() => handlePlay(combined)}
                  style={styles.playButton}
                  title="Play combined summary"
                >
                  Play
                </button>
              ) : null}
            </div>
            <p style={styles.summary}>{combined.summary}</p>
          </div>
        )}

        {/* Optional per-item list */}
        {Array.isArray(items) && items.length > 0 && (
          <ul style={styles.grid}>
            {items.map((it) => (
              <li key={it.id ?? it.title} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={{ fontWeight: 600, lineHeight: 1.3 }}>
                    {it.title}
                  </div>
                  {it.audioUrl ? (
                    <button
                      onClick={() => handlePlay(it)}
                      style={styles.playButton}
                      title="Play this item"
                    >
                      Play
                    </button>
                  ) : null}
                </div>
                {it.summary && <p style={styles.summary}>{it.summary}</p>}
              </li>
            ))}
          </ul>
        )}

        {!combined && items.length === 0 && !isLoading && (
          <div style={{ color: "#6b7280", marginTop: 8 }}>
            No items yet. Select topics and build a summary.
          </div>
        )}
      </main>

      {/* Bottom audio bar — only render when we have audio to play */}
      {nowPlaying?.audioUrl ? (
        <footer style={styles.footer}>
          <div style={styles.footerInner}>
            <div style={styles.nowPlaying} title={nowPlaying.title || ""}>
              {nowPlaying.title || "Now Playing"}
            </div>
            <audio
              ref={audioRef}
              controls
              src={nowPlaying.audioUrl}
              style={styles.audioEl}
              onError={(e) => console.log("Audio error", e.currentTarget?.error)}
              onCanPlay={() => console.log("Audio can play")}
              onPlay={() => console.log("Playing")}
            />
          </div>
        </footer>
      ) : null}
    </div>
  );
}

/* ---------- minimal inline styles (works even without Tailwind) ---------- */
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#fff",
    fontFamily:
      'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  container: { maxWidth: 960, margin: "0 auto", padding: "16px" },
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
  },
  grid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    listStyle: "none",
    padding: 0,
    margin: "12px 0 80px 0", // space above footer
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
  footer: {
    position: "sticky",
    bottom: 0,
    background: "#fff",
    borderTop: "1px solid #e5e7eb",
  },
  footerInner: {
    maxWidth: 960,
    margin: "0 auto",
    padding: 12,
    display: "flex",
    alignItems: "center",
    gap: 12,
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
