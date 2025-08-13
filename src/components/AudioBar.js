import React from "react";
import { createPortal } from "react-dom";
import "./AudioBar.css";

export default function AudioBar({ nowPlaying, audioRef }) {
  if (!nowPlaying?.audioUrl) return null;

  // Render outside your app’s DOM to avoid layout/style shifts
  return createPortal(
    <div className="pn-audiobar" role="region" aria-label="Audio player">
      <div className="pn-audiobar__inner">
        <div className="pn-audiobar__meta" title={nowPlaying.title || ""}>
          {nowPlaying.title || "Now Playing"}
        </div>
        <audio
          ref={audioRef}
          className="pn-audiobar__audio"
          controls
          src={nowPlaying.audioUrl}
        />
      </div>
    </div>,
    document.body
  );
}
