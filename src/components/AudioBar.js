import React, { useEffect, useRef, useState } from "react";
import "./AudioBar.css";

export default function AudioBar({ src, title, visible, onClose, autoPlay = true }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [seeking, setSeeking] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onLoaded = () => setDuration(el.duration || 0);
    const onTime = () => !seeking && setCurrent(el.currentTime || 0);
    const onEnd = () => setIsPlaying(false);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);

    if (src) {
      // reload source when it changes
      el.pause();
      el.load();
      setIsPlaying(false);
      setCurrent(0);
      if (autoPlay) {
        el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
    };
  }, [src, seeking, autoPlay]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const format = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
    };

  const onSeekStart = () => setSeeking(true);
  const onSeek = (e) => {
    if (!seeking) return;
    setCurrent(Number(e.target.value));
  };
  const onSeekEnd = (e) => {
    const el = audioRef.current;
    const t = Number(e.target.value);
    setSeeking(false);
    setCurrent(t);
    if (el) el.currentTime = t;
  };

  if (!visible) return null;

  return (
    <div className="audio-bar" role="region" aria-label="Mini podcast player">
      <audio ref={audioRef}>
        <source src={src} type="audio/mpeg" />
      </audio>

      <button className="audio-bar__btn" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
        {isPlaying ? "⏸" : "▶️"}
      </button>

      <div className="audio-bar__meta">
        <div className="audio-bar__title" title={title || "Now playing"}>
          {title || "Now playing"}
        </div>
        <div className="audio-bar__timeline">
          <span className="time">{format(current)}</span>
          <input
            className="seek"
            type="range"
            min={0}
            max={duration || 0}
            step="1"
            value={Math.min(current, duration || 0)}
            onMouseDown={onSeekStart}
            onTouchStart={onSeekStart}
            onChange={onSeek}
            onMouseUp={onSeekEnd}
            onTouchEnd={onSeekEnd}
            aria-label="Seek"
          />
          <span className="time">{format(duration)}</span>
        </div>
      </div>

      <a className="audio-bar__btn" href={src} download aria-label="Download audio">⤓</a>

      <button className="audio-bar__btn close" onClick={onClose} aria-label="Close player">
        ✕
      </button>
    </div>
  );
}
