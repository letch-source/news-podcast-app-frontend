// App.js (React)
import React, { useState, useRef } from "react";

// If you used Vite: import.meta.env.VITE_API_BASE
// If CRA: process.env.REACT_APP_API_BASE
const API_BASE =
  import.meta?.env?.VITE_API_BASE ||
  process.env.REACT_APP_API_BASE ||
  ""; // rely on dev proxy when empty

const TOPICS = [
  { key: "business", label: "Business" },
  { key: "technology", label: "Technology" },
  { key: "sports", label: "Sports" },
  { key: "entertainment", label: "Entertainment" },
];

export default function App() {
  const [status, setStatus] = useState("Pick a topic to fetch & summarize.");
  const [items, setItems] = useState([]); // your summarized stories
  const [isLoading, setIsLoading] = useState(false);

  // Simple audio player state
  const [nowPlaying, setNowPlaying] = useState(null); // { title, audioUrl }
  const audioRef = useRef(null);

  async function fetchSummaries(topic) {
    try {
      setIsLoading(true);
      setStatus(`Fetching & summarizing latest ${topic} news…`);

      // Example: POST to your backend route
      // Adjust URL to your server route: e.g., "/api/summarize?topic=business"
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
      // Expecting: { items: [{ id, title, summary, audioUrl? }, ...] }
      setItems(Array.isArray(data.items) ? data.items : []);
      setStatus(`Showing ${topic} summaries`);
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handlePlay(item) {
    setNowPlaying(item);
    // Allow React to render the <audio> with the new src, then play
    setTimeout(() => {
      audioRef.current?.play().catch(() => {});
    }, 0);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b">
        <h1 className="text-xl font-semibold">Podcast News</h1>
        <p className="text-sm text-gray-600">{status}</p>
      </header>

      {/* Topic buttons (this is what triggers the backend call) */}
      <div className="p-4 flex gap-2 flex-wrap">
        {TOPICS.map((t) => (
          <button
            key={t.key}
            onClick={() => fetchSummaries(t.key)}
            disabled={isLoading}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-60"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <main className="p-4 flex-1">
        {items.length === 0 && !isLoading && (
          <div className="text-gray-500">No items yet.</div>
        )}

        <ul className="space-y-4">
          {items.map((it) => (
            <li
              key={it.id ?? it.title}
              className="border rounded-xl p-4 flex flex-col gap-2"
            >
              <div className="font-medium">{it.title}</div>
              <div className="text-sm text-gray-700">{it.summary}</div>

              {/* Optional play button if your backend provides TTS/audio URLs */}
              {it.audioUrl && (
                <div>
                  <button
                    className="text-sm px-3 py-2 border rounded-lg hover:bg-gray-50"
                    onClick={() => handlePlay(it)}
                  >
                    Play
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>

      {/* Bottom audio bar */}
      <footer className="sticky bottom-0 border-t bg-white">
        <div className="p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {nowPlaying?.title ?? "Nothing playing"}
            </div>
          </div>

          <audio
            ref={audioRef}
            controls
            src={nowPlaying?.audioUrl ?? ""}
            style={{ width: 300 }}
          />
        </div>
      </footer>
    </div>
  );
}
