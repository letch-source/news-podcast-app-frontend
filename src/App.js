import React, { useRef, useState, useMemo } from "react";

// PRODUCTION base (hardcoded for reliability); DEV uses proxy
const PROD_API_BASE = "https://fetch-bpof.onrender.com";
const API_BASE = process.env.NODE_ENV === "production" ? PROD_API_BASE : "";

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
  const [items, setItems] = useState([]);
  const [combined, setCombined] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const audioRef = useRef(null);

  const [selected, setSelected] = useState(() => new Set());
  const selectedList = useMemo(() => Array.from(selected), [selected]);
  const selectedCount = selectedList.length;

  function toggleTopic(key) {
    setCombined(null);
    setItems([]);
    setStatus("Configuring…");
    setSelected((prev) => {
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
          ? `Building summary for ${selectedList[0]}…`
          : `Building a combined summary for ${selectedCount} topics…`
      );

      const endpoint = selectedCount === 1 ? "/api/summarize" : "/api/summarize/batch";
      const body = selectedCount === 1 ? { topic: selectedList[0] } : { topics: selectedList };
      const url = `${API_BASE}${endpoint}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const raw = await res.text();
      let data = null;
      try { data = JSON.parse(raw); } catch {}

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${url}: ${raw || "Server error"}`);
      }
      if (!data) {
        throw new Error(`Bad payload from ${url}: empty response`);
      }

      if (data.combined) setCombined(data.combined);
      if (Array.isArray(data.items)) setItems(data.items);

      if (!data.combined && Array.isArray(data.items) && data.items.length > 0) {
        setCombined({
          id: data.items[0].id ?? "combined-0",
          title: data.items[0].title ?? "Summary",
          summary: typeof data.items[0].summary === "string" && data.items[0].summary.trim()
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
    if (!item?.audioUrl) return;
    setNowPlaying({ title: item.title, audioUrl: item.audioUrl });
    setTimeout(() => {
      audioRef.current?.play().catch((e) =>
        console.log("Audio play() blocked/failed:", e?.message || e)
      );
    }, 0);
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.container}>
          <h1 style={styles.h1}>Podcast News</h1>
          <p style={styles.status}>{status}</p>
        </div>
      </header>

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

      <main style={styles.container}>
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

const styles = {
  page: { minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff",
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif' },
  container: { maxWidth: 960, margin: "0 auto", padding: "16px" },
  header: { borderBottom: "1px solid #e5e7eb", background: "#fff" },
  h1: { fontSize: 22, fontWeight: 600, margin: 0 },
  status: { color: "#6b7280", marginTop: 6, fontSize: 14 },
  topicsRow: { display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid #e5e7eb",
    paddingTop: 12, paddingBottom: 12 },
  chip: { padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: 9999, background: "#fff" },
  chipActive: { background: "#111", color: "#fff", borderColor: "#111" },
  actions: { display: "flex", gap: 8, paddingTop: 8 },
  actionBtn: { padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 10, background: "#fff" },
  grid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    listStyle: "none", padding: 0, margin: "12px 0 80px 0" },
  card: { border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)" },
  cardHeader: { display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", marginBottom: 8 },
  playButton: { fontSize: 12, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff",
    cursor: "pointer" },
  summary: { color: "#374151", fontSize: 14, margin: 0 },
  footer: { position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #e5e7eb" },
  footerInner: { maxWidth: 960, margin: "0 auto", padding: 12, display: "flex", alignItems: "center", gap: 12 },
  nowPlaying: { flex: "1 1 auto", minWidth: 0, fontWeight: 600, fontSize: 14, color: "#111",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  audioEl: { width: 320, maxWidth: "48vw" },
};
