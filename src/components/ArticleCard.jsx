import React from "react";

/**
 * Sentence-aware clip:
 * - Take up to maxWords words.
 * - If more text exists, snap back to the last sentence terminator (., !, ?)
 *   inside the clip. If none exists, return the word-limited clip as-is.
 * - Returns { text, truncated }
 */
function sentenceClip(text = "", maxWords = 30) {
  const clean = (text || "").trim();
  if (!clean) return { text: "", truncated: false };

  const words = clean.split(/\s+/);
  if (words.length <= maxWords) return { text: clean, truncated: false };

  const clipped = words.slice(0, maxWords).join(" ");

  // Find last sentence terminator in the clipped string
  const match = clipped.match(/^[\s\S]*[\.!\?](?=[^\.!\?]*$)/);
  if (match) {
    return { text: match[0].trim(), truncated: true };
  }
  return { text: clipped.trim(), truncated: true };
}

export default function ArticleCard({ item, maxWords = 30 }) {
  const summary = (item?.summary || "").trim();
  if (!summary) return null; // no preview -> don't render the bubble

  const { text, truncated } = sentenceClip(summary, maxWords);

  // Figure out the external link
  let href = item?.url?.trim() || "";
  if (href && !/^https?:\/\//i.test(href)) href = "https://" + href;

  return (
    <div
      className="article-card"
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: 12,
        padding: 14,
        background: "#fff",
      }}
    >
      <div
        className="article-title"
        style={{ display: "flex", alignItems: "baseline", gap: 8 }}
      >
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
          {item?.title || "Untitled"}
        </h4>
      </div>

      {(item?.topic || item?.source) && (
        <div style={{ marginTop: 4, color: "#6b7280", fontSize: 12 }}>
          {(item?.source || "")}
          {item?.topic ? ` · Topic: ${item.topic}` : ""}
        </div>
      )}

      <p style={{ marginTop: 8, marginBottom: 10, fontSize: 13, lineHeight: 1.35 }}>
        {text}
        {truncated ? "…" : ""}
      </p>

      {href && (
        <a
          className="read-article"
          href={href}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            padding: "6px 10px",
            borderRadius: 8,
            background: "#000",
            color: "#fff",
            border: "1px solid #e5e7eb",
          }}
        >
          Read article
        </a>
      )}
    </div>
  );
}
