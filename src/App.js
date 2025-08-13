// App.js
import React, { useState, useRef } from "react";

// If Vite: import.meta.env.VITE_API_BASE
// If CRA: process.env.REACT_APP_API_BASE
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  process.env.REACT_APP_API_BASE ||
  ""; // empty => rely on dev proxy (e.g., /api/*)

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
  const [items, setItems] = useState([]); // [{ id, title, summary, audioUrl }]
  const [isLoading, setIsLoading] = useState(false);

  // Bottom audio bar
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

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setStatus(`Showing ${topic} summaries`);
    } catch (err) {
      console.error(err);
      setItems([]);
      setStatus(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  function handlePlay(item) {
    setNowPlaying({ title: item.title, audioUrl: item.audioUrl });
    // Let React render the <audio> with the new src, then play
    setTimeout(() => audioRef.current?.play().catch(() => {}), 0);
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="p-4 border-b">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-semibold tracking-tight">Podcast News</h1>
          <p className="text-sm text-gray-600 mt-1">{status}</p>
        </div>
      </header>

      {/* Topic buttons */}
      <div className="p-4 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-5xl mx-auto flex gap-2 flex-wrap">
          {TOPICS.map((t) => (
            <button
              key={t.key}
              onClick={() => fetchSummaries(t.key)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-full border text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto p-4">
          {items.length === 0 && !isLoading && (
            <div className="text-gray-500">No items yet. Choose a topic above.</div>
          )}

          <ul className="grid gap-4 md:grid-cols-2">
            {items.map((it) => (
              <li
                key={it.id ?? it.title}
                className="border rounded-2xl p-4 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium leading-snug">{it.title}</div>
                    {it.source && (
                      <div className="text-xs text-gray-500 mt-0.5">{it.source}</div>
                    )}
                  </div>

                  {it.audioUrl && (
                    <button
                      className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50 shrink-0"
                      onClick={() => handlePlay(it)}
                      title="Play this summary"
                    >
                      Play
                    </button>
                  )}
                </div>

                {it.summary && (
                  <p className="text-sm text-gray-700 mt-2">{it.summary}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Bottom audio bar (integrated, minimal visual footprint) */}
      <footer className="sticky bottom-0 border-t bg-white">
        <div className="max-w-5xl mx-auto p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">
              {nowPlaying?.title ?? "Nothing playing"}
            </div>
          </div>
          <audio
            ref={audioRef}
            controls
            src={nowPlaying?.audioUrl ?? ""}
            className="w-[320px] max-w-[48vw]"
          />
        </div>
      </footer>
    </div>
  );
}
