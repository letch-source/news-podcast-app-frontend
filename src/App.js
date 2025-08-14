import React, { useRef, useState } from "react";

// Always call your live backend in production, local in dev
const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://fetch-bpof.onrender.com"
    : "";

const TOPICS = [
  { key: "business", label: "Business" },
  { key: "technology", label: "Technology" },
  { key: "sports", label: "Sports" },
  { key: "entertainment", label: "Entertainment" },
  { key: "science", label: "Science" },
  { key: "world", label: "World" },
];

export default function App() {
  const [status, setStatus] = useState("Pick a topic to fetch & summarize.");
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState([]); // [{id,title,summary,audioUrl}]
  const [nowPlaying, setNowPlaying] = useState(null); // { title, audioUrl }
  const audioRef = useRef(null);

  async function fetchSummaries(topic) {
    try {
      setIsLoading(true);
      setStatus(`Fetching & summarizing latest ${topic} news…`);

      const res = await fetch(`${API_BASE}/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const raw = await res.text();
      let data = null;
      try { data = JSON.parse(raw); } catch {}

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${raw || "Server error"}`);
      }
      if (!data) {
        throw new Error(`Bad payload: empty response`);
      }

      // Accept both shapes
      let list = Array.isArray(data.items) ? data.items : [];
      if (!list.length && data.combined) {
        const c = data.combined;
        list = [{
          id: c.id ?? "combined-0",
          title: c.title ?? "Summary",
          summary: typeof c.summary === "string" ? c.summary : "(No summary provided by server.)",
          audioUrl: c.audioUrl ?? null,
        }];
      }

      if (!list.length) {
        throw new Error(
          `Bad payload: missing items[]. Server said: ${typeof raw === "string" ? raw.slice(0, 200) : ""}`
        );
      }

      const normalized = list.map((it, i) => ({
        id: it.id ?? `item-${i}`,
        title: it.title ?? "Untitled",
        summary: typeof it.summary === "string" && it.summary.trim()
          ? it.summary
          : "(No summary provided by server.)",
        audioUrl: it.audioUrl ?? null,
      }));

      setItems(normalized);
      setStatus(`Showing ${topic} summaries`);

      if (!normalized.some(x => x.audioUrl)) {
        setNowPlaying(null);
      }
    } catch (err) {
      console.error(err);
      setItems([]);
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
      audioRef.current?.play().catch(() => {});
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
        {TOPICS.map((t) => (
          <button
            key={t.key}
            onClick={() => fetchSummaries(t.key)}
            disabled={isLoading}
            style={{
              ...styles.chip,
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main style={styles.container}>
        {items.length === 0 && !isLoading && (
          <div style={{ color: "#6b7280", marginTop: 8 }}>
            No items yet. Choose a topic above.
          </div>
        )}

        <ul style={styles.grid}>
          {items.map((it) => (
            <li key={it.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{it.title}</div>
                {it.audioUrl ? (
                  <button
                    onClick={() => handlePlay(it)}
                    style={styles.playButton}
                    title="Play this summary"
                  >
                    Play
                  </button>
                ) : null}
              </div>
              <p style={styles.summary}>{it.summary}</p>
            </li>
          ))}
        </ul>
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
