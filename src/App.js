﻿import React, { useRef, useState, useMemo } from "react";

// Use proxy locally; use full URL in production via REACT_APP_API_BASE
const API_BASE =
  process.env.NODE_ENV === "production"
    ? (process.env.REACT_APP_API_BASE || "")
    : "";
// PRODUCTION base (hardcoded for reliability); DEV uses proxy
const PROD_API_BASE = "https://fetch-bpof.onrender.com";
const API_BASE = process.env.NODE_ENV === "production" ? PROD_API_BASE : "";

const TOPICS = [
{ key: "business", label: "Business" },
@@ -19,11 +17,9 @@ const TOPICS = [
export default function App() {
const [status, setStatus] = useState("Pick topics, then build a summary.");
const [isLoading, setIsLoading] = useState(false);

  const [items, setItems] = useState([]);       // optional list
  const [combined, setCombined] = useState(null); // {id,title,summary,audioUrl}

  const [nowPlaying, setNowPlaying] = useState(null); // { title, audioUrl }
  const [items, setItems] = useState([]);
  const [combined, setCombined] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
const audioRef = useRef(null);

const [selected, setSelected] = useState(() => new Set());
@@ -43,7 +39,6 @@ export default function App() {

async function buildCombined() {
if (selectedCount === 0) return;

try {
setIsLoading(true);
setItems([]);
@@ -55,23 +50,26 @@ export default function App() {
: `Building a combined summary for ${selectedCount} topics…`
);

      const endpoint =
        selectedCount === 1 ? "/api/summarize" : "/api/summarize/batch";
      const body =
        selectedCount === 1 ? { topic: selectedList[0] } : { topics: selectedList };
      const endpoint = selectedCount === 1 ? "/api/summarize" : "/api/summarize/batch";
      const body = selectedCount === 1 ? { topic: selectedList[0] } : { topics: selectedList };
      const url = `${API_BASE}${endpoint}`;

      const res = await fetch(`${API_BASE}${endpoint}`, {
      const res = await fetch(url, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(body),
});

      const text = await res.text();
      const raw = await res.text();
let data = null;
      try { data = JSON.parse(text); } catch {}
      try { data = JSON.parse(raw); } catch {}

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text || "Server error"}`);
      if (!data) throw new Error(`Bad payload: ${text || "empty response"}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${url}: ${raw || "Server error"}`);
      }
      if (!data) {
        throw new Error(`Bad payload from ${url}: empty response`);
      }

if (data.combined) setCombined(data.combined);
if (Array.isArray(data.items)) setItems(data.items);
@@ -80,10 +78,9 @@ export default function App() {
setCombined({
id: data.items[0].id ?? "combined-0",
title: data.items[0].title ?? "Summary",
          summary:
            typeof data.items[0].summary === "string" && data.items[0].summary.trim()
              ? data.items[0].summary
              : "(No summary provided by server.)",
          summary: typeof data.items[0].summary === "string" && data.items[0].summary.trim()
            ? data.items[0].summary
            : "(No summary provided by server.)",
audioUrl: data.items[0].audioUrl ?? null,
});
}
@@ -246,98 +243,29 @@ export default function App() {
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
  page: { minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff",
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif' },
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
  topicsRow: { display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid #e5e7eb",
    paddingTop: 12, paddingBottom: 12 },
  chip: { padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: 9999, background: "#fff" },
  chipActive: { background: "#111", color: "#fff", borderColor: "#111" },
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
  actionBtn: { padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 10, background: "#fff" },
  grid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    listStyle: "none", padding: 0, margin: "12px 0 80px 0" },
  card: { border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)" },
  cardHeader: { display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", marginBottom: 8 },
  playButton: { fontSize: 12, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff",
    cursor: "pointer" },
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
  footer: { position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #e5e7eb" },
  footerInner: { maxWidth: 960, margin: "0 auto", padding: 12, display: "flex", alignItems: "center", gap: 12 },
  nowPlaying: { flex: "1 1 auto", minWidth: 0, fontWeight: 600, fontSize: 14, color: "#111",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
audioEl: { width: 320, maxWidth: "48vw" },
};