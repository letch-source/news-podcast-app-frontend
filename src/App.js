import React, { useEffect, useRef, useState } from "react";

/**
 * --- App.js --- (POST JSON to /api/tts)
 * Podcast News — resilient audio playback
 *
 * This version calls your backend with **POST /api/tts** and body { text }
 * You also keep the diagnostic "known-good MP3" toggle.
 */

// === Configure your backend endpoints here ===
// If API is same-origin, leave as "". If separate host, set REACT_APP_API_BASE in .env
const BACKEND_URL = process.env.REACT_APP_API_BASE || ""; // e.g. "https://your-api.example.com"
const TTS_PATH = "/api/tts"; // We will POST JSON to this path

// Public test MP3 (for quick isolation)
const KNOWN_GOOD_MP3 =
  "https://file-examples.com/storage/fef4e8f6f2f3c6b6c3a6f0e/2017/11/file_example_MP3_700KB.mp3";

// ------------------- AudioBar -------------------
function AudioBar({ srcUrlOrBlob }) {
  const audioRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null); // so we can revoke

  // Unlock audio on first user gesture (Safari/iOS)
  useEffect(() => {
    const unlock = () => {
      const a = audioRef.current;
      if (!a) return;
      a.muted = true;
      a.play().then(() => a.pause()).catch(() => {});
      a.muted = false;
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // Wire status + error handlers
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onCanPlay = () => setStatus("ready");
    const onPlay = () => setStatus("playing");
    const onPause = () => setStatus("paused");
    const onStalled = () => setStatus("stalled");
    const onWaiting = () => setStatus("buffering");
    const onEnded = () => setStatus("ended");
    const onError = () => {
      const e = a.error;
      setErr(e ? `MediaError code ${e.code}` : "Unknown audio error");
      setStatus("error");
      console.warn("<audio> error:", e, a.src);
    };

    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("stalled", onStalled);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);

    return () => {
      a.removeEventListener("canplay", onCanPlay);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("stalled", onStalled);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
  }, []);

  // When src changes, set it up and load()
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !srcUrlOrBlob) return;

    setErr(null);
    setStatus("loading");

    // Cleanup previous object URL if any
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }

    if (srcUrlOrBlob instanceof Blob) {
      const url = URL.createObjectURL(srcUrlOrBlob);
      setObjectUrl(url);
      a.src = url;
    } else {
      a.src = srcUrlOrBlob;
      a.crossOrigin = "anonymous"; // if serving from a different origin
    }

    a.load();
  }, [srcUrlOrBlob]);

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const handlePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      await a.play();
    } catch (e) {
      setErr(e?.name || String(e));
      console.warn("play() failed:", e);
    }
  };

  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: 12, background: "#0B1020", color: "#FFF", boxShadow: "0 -2px 24px rgba(0,0,0,0.35)", display: "flex", alignItems: "center", gap: 12 }}>
      <button onClick={handlePlay} style={{ padding: "8px 14px", borderRadius: 12, border: 0, background: "#4F46E5", color: "#FFF", fontWeight: 600 }}>Play</button>
      <audio ref={audioRef} preload="auto" controls style={{ flex: 1 }}/>
      <div style={{ minWidth: 160, textAlign: "right", fontSize: 12, opacity: 0.9 }}>
        {status}{err ? ` – ${err}` : ""}
      </div>
    </div>
  );
}

// ------------------- App -------------------
export default function App() {
  const [topics] = useState(["Business", "Technology", "World", "Science", "Sports"]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [audioSrc, setAudioSrc] = useState(null); // string URL or Blob
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState(null);
  const [useKnownGood, setUseKnownGood] = useState(false);

  useEffect(() => {
    const fetchAudio = async () => {
      if (!selectedTopic) return;

      if (useKnownGood) {
        setAudioSrc(KNOWN_GOOD_MP3);
        return;
      }

      setLoadingAudio(true);
      setError(null);

      try {
        // POST JSON to your TTS endpoint
        const res = await fetch(`${BACKEND_URL}${TTS_PATH}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "audio/mpeg, audio/wav, audio/ogg, */*",
          },
          body: JSON.stringify({ text: `Latest ${selectedTopic} news summary` }),
        });

        if (!res.ok) {
          throw new Error(`TTS request failed: ${res.status} ${res.statusText}`);
        }

        const ctype = res.headers.get("Content-Type") || "";
        if (!ctype.startsWith("audio/")) {
          console.warn("Unexpected Content-Type:", ctype);
        }

        const blob = await res.blob();
        if (blob.size === 0) throw new Error("Empty audio Blob");

        setAudioSrc(blob);
      } catch (e) {
        console.error(e);
        setError(e.message || String(e));
        setAudioSrc(null);
      } finally {
        setLoadingAudio(false);
      }
    };

    fetchAudio();
  }, [selectedTopic, useKnownGood]);

  const handleTopicClick = (t) => {
    setSelectedTopic(t);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#EAEAF1", paddingBottom: 96 }}>
      <header style={{ padding: 24, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <h1 style={{ margin: 0, fontSize: 24, letterSpacing: 0.3 }}>Podcast News</h1>
        <p style={{ marginTop: 6, opacity: 0.8 }}>Click a topic to generate and play the latest summary audio.</p>
      </header>

      <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => handleTopicClick(t)}
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: selectedTopic === t ? "#1E293B" : "#111827",
                color: "#EAEAF1",
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={useKnownGood} onChange={(e) => setUseKnownGood(e.target.checked)} />
            Use known‑good MP3 (diagnostic)
          </label>
        </div>

        <section style={{ marginTop: 24 }}>
          {selectedTopic ? (
            <div>
              <h2 style={{ marginTop: 0 }}>{selectedTopic} summary</h2>
              {loadingAudio && <div style={{ opacity: 0.8 }}>Generating audio…</div>}
              {error && (
                <div style={{ color: "#FCA5A5" }}>
                  Audio error: {error}
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
                    Ensure your server handles <code>POST {TTS_PATH}</code>, returns <code>Content-Type: audio/mpeg</code>, and that API routes are defined before the SPA fallback.
                  </div>
                </div>
              )}
              {!loadingAudio && !error && !audioSrc && (
                <div style={{ opacity: 0.8 }}>Select a topic to generate audio.</div>
              )}
            </div>
          ) : (
            <div style={{ opacity: 0.8 }}>Pick a topic above to start.</div>
          )}
        </section>
      </main>

      {/* Docked player */}
      {audioSrc && <AudioBar srcUrlOrBlob={audioSrc} />}
    </div>
  );
}
