import React, { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { useUserLocation } from "./hooks/useUserLocation";

const PROD_API_BASE = "https://fetch-bpof.onrender.com";
const API_BASE = process.env.NODE_ENV === "production" ? PROD_API_BASE : "";

// Ensure https:// for external article links
function normalizeHttpUrl(u) {
  const s = (u || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return "https://" + s;
}

// Keep existing media normalization for audio etc.
function normalizeMediaUrl(u) {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/media")) return `${API_BASE}${u}`;
  return u;
}

// Sentence-aware clip to last full sentence within maxWords
function sentenceClip(text = "", maxWords = 30) {
  const clean = (text || "").trim();
  if (!clean) return { text: "", truncated: false };
  const words = clean.split(/\s+/);
  if (words.length <= maxWords) return { text: clean, truncated: false };

  const clipped = words.slice(0, maxWords).join(" ");
  const match = clipped.match(/^[\s\S]*[\.!\?](?=[^\.!\?]*$)/);
  if (match) return { text: match[0].trim(), truncated: true };
  return { text: clipped.trim(), truncated: true };
}

const CORE_TOPICS = [
  { key: "business", label: "Business" },
  { key: "entertainment", label: "Entertainment" },
  { key: "general", label: "General" },
  { key: "health", label: "Health" },
  { key: "science", label: "Science" },
  { key: "sports", label: "Sports" },
  { key: "technology", label: "Technology" },
  { key: "world", label: "World" },
];

const LENGTH_OPTIONS = [
  { key: "short", label: "Short", words: 200 },
  { key: "medium", label: "Medium", words: 1000 },
  { key: "long", label: "Long", words: 2000 },
];

const FOOTER_HEIGHT = 68;

function AuthModal({ onClose, onLogin, onSignup }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      if (mode === "login") await onLogin(email, password);
      else await onSignup(email, password);
      onClose();
    } catch {
      setErr("Failed. Check email/password.");
    }
  }

  return (
    <div style={styles.modalBackdrop}>
      <form onSubmit={submit} style={styles.modalCard}>
        <strong>{mode === "login" ? "Sign in" : "Create account"}</strong>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {err && <div style={{ color: "#b91c1c", fontSize: 12 }}>{err}</div>}
        <button type="submit" style={{ padding: "8px 10px" }}>
          {mode === "login" ? "Sign in" : "Sign up"}
        </button>
        <button type="button" onClick={onClose} style={{ padding: "6px 10px" }}>
          Cancel
        </button>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {mode === "login" ? (
            <>
              No account?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                style={styles.inlineLinkBtn}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                style={styles.inlineLinkBtn}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [combined, setCombined] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);

  const audioRef = useRef(null);
  const [selected, setSelected] = useState(() => new Set());
  const [selectedLength, setSelectedLength] = useState("short");
  const [phase, setPhase] = useState("idle");
  const [isDirty, setIsDirty] = useState(true);

  // ---- Auth (inline, cookie-based) ----
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  // Stable API helper for ESLint deps
  const api = useCallback(async (path, opts = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || "Request failed");
    }
    return res.json();
  }, []);

  // ---- Location (for Local topic) ----
  const {
    location,
    status: locStatus,
    requestPermission,
    clearLocation,
  } = useUserLocation();

  const stateLabel = useMemo(() => {
    if (!location) return "";
    return location.region || location.country || "Local";
  }, [location]);

  // ---- Custom topics ----
  const [userTopics, setUserTopics] = useState([]); // [{key,label}]

  const refreshCustomTopics = useCallback(async () => {
    if (!user) {
      setUserTopics([]);
      return;
    }
    try {
      const r = await api("/api/user/topics");
      setUserTopics(Array.isArray(r.topics) ? r.topics : []);
    } catch {
      setUserTopics([]);
    }
  }, [api, user]);

  const loadLastPreset = useCallback(async () => {
    try {
      const last = await api("/api/user/presets/last");
      if (Array.isArray(last.topicKeys) && last.topicKeys.length) {
        setSelected(new Set(last.topicKeys));
        setIsDirty(true);
      }
    } catch {}
  }, [api]);

  async function login(email, password) {
    const u = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(u);
    await refreshCustomTopics();
    await loadLastPreset();
    return u;
  }

  async function signup(email, password) {
    const u = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(u);
    await refreshCustomTopics();
    await loadLastPreset();
    return u;
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    setUserTopics([]);
  }

  // For delete flow
  const customKeysSet = useMemo(
    () => new Set(userTopics.map((t) => t.key)),
    [userTopics]
  );
  const selectedCustomKeys = useMemo(
    () => Array.from(selected).filter((k) => customKeysSet.has(k)),
    [selected, customKeysSet]
  );

  const topicsToRender = useMemo(() => {
    const base = [...CORE_TOPICS];
    if (userTopics.length) base.push(...userTopics);
    return location ? [{ key: "local", label: stateLabel || "Local" }, ...base] : base;
  }, [location, stateLabel, userTopics]);

  const selectedCount = selected.size;
  const selectedList = useMemo(() => Array.from(selected), [selected]);

  function toggleTopic(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setIsDirty(true);
  }

  function handleClearLocation() {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete("local");
      return next;
    });
    clearLocation();
    setIsDirty(true);
  }

  function currentButtonLabel() {
    switch (phase) {
      case "gather":
        return "Gathering sources…";
      case "summarize":
        return "Building summary…";
      case "tts":
        return "Recording audio…";
      default:
        return "Fetch the News";
    }
  }

  function fetchBtnStyle() {
    const disabled = isLoading || selectedCount === 0 || phase !== "idle" || !isDirty;
    if (disabled) return { ...styles.actionBtn, ...styles.actionBtnDisabled };
    return { ...styles.actionBtn, ...styles.actionBtnPrimary };
  }

  async function buildCombined() {
    if (selectedCount === 0 || phase !== "idle" || !isDirty) return;

    const lengthObj =
      LENGTH_OPTIONS.find((l) => l.key === selectedLength) || LENGTH_OPTIONS[0];
    const wordCount = lengthObj.words;

    try {
      setIsLoading(true);
      setItems([]);
      setCombined(null);
      setNowPlaying(null);

      setPhase("gather");

      const geo = location
        ? {
            city: location.city || "",
            region: location.region || "",
            country: location.countryCode || "",
          }
        : null;

      const isSingle = selectedCount === 1;
      const endpoint = isSingle ? "/api/summarize" : "/api/summarize/batch";

      let body;
      if (isSingle) {
        const topic = selectedList[0];
        body = { topic, wordCount };
        if (topic === "local" && geo) body.geo = geo;
      } else {
        body = { topics: selectedList, wordCount };
        if (selectedList.includes("local") && geo) body.geo = geo;
      }

      const summarizePhaseTimer = setTimeout(() => setPhase("summarize"), 300);

      const url = `${API_BASE}${endpoint}?noTts=1`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      clearTimeout(summarizePhaseTimer);

      const raw = await res.text();
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch {}
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${raw || "Server error"}`);
      if (!data || typeof data !== "object")
        throw new Error(`Bad payload: ${raw || "empty"}`);

      const gotCombined = data.combined ?? null;

      if (
        gotCombined &&
        gotCombined.title &&
        selectedList.includes("local") &&
        location &&
        location.region
      ) {
        gotCombined.title = `Top local — ${location.region}`;
      }

      const gotItems = Array.isArray(data.items) ? data.items : [];

      if (gotCombined) gotCombined.audioUrl = normalizeMediaUrl(gotCombined.audioUrl);
      gotItems.forEach((it) => {
        it.audioUrl = normalizeMediaUrl(it.audioUrl);
      });

      const combinedToSet =
        gotCombined ||
        (gotItems[0] && {
          id: gotItems[0].id ?? `combined-${Date.now()}`,
          title: gotItems[0].title ?? "Summary",
          summary: gotItems[0].summary || "(No summary provided.)",
          audioUrl: normalizeMediaUrl(gotItems[0].audioUrl),
        }) ||
        null;

      setCombined(combinedToSet);
      setItems(gotItems);

      if (combinedToSet?.summary) {
        setPhase("tts");
        try {
          const ttsRes = await fetch(`${API_BASE}/api/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: combinedToSet.summary }),
          });
          const ttsData = await ttsRes.json();
          const audioUrl = normalizeMediaUrl(ttsData?.audioUrl || "");
          if (audioUrl)
            setCombined((prev) => (prev ? { ...prev, audioUrl } : prev));
        } catch (e) {
          console.error("TTS error:", e);
        }
      }

      setIsDirty(false);
    } catch (err) {
      console.error(err);
      setIsDirty(true);
    } finally {
      setIsLoading(false);
      setPhase("idle");
    }
  }

  function handlePlayAudio(title, audioUrl) {
    const src = normalizeMediaUrl(audioUrl);
    if (!src) return;
    setNowPlaying({ title, audioUrl: src });
    setTimeout(() => {
      try {
        audioRef.current?.play?.();
      } catch {}
    }, 50);
  }

  const displayableItems = items.filter(
    (it) => (it?.summary || "").trim().length > 0
  );

  // ---- Load auth + user topics + last preset on mount ----
  useEffect(() => {
    (async () => {
      try {
        const me = await api("/api/auth/me");
        if (me.user) {
          setUser(me.user);
          await refreshCustomTopics();
          await loadLastPreset();
        }
      } catch {
      } finally {
        setAuthLoading(false);
      }
    })();
  }, [api, refreshCustomTopics, loadLastPreset]);

  // ---- Custom topic creation (label & key are the SAME) ----
  const [customEntry, setCustomEntry] = useState("");

  async function addCustomTopic() {
    if (!user) return setShowAuth(true);
    const v = customEntry.trim();
    if (!v) return;
    await api("/api/user/topics", {
      method: "POST",
      body: JSON.stringify({ key: v, label: v }),
    });
    setCustomEntry("");
    await refreshCustomTopics();
  }

  // ---- Delete topics flow ----
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hoverDelete, setHoverDelete] = useState(false);

  async function confirmDeleteSelected() {
    for (const k of selectedCustomKeys) {
      try {
        await fetch(`${API_BASE}/api/user/topics/${encodeURIComponent(k)}`, {
          method: "DELETE",
          credentials: "include",
        });
      } catch {}
    }
    setSelected((prev) => {
      const next = new Set(prev);
      selectedCustomKeys.forEach((k) => next.delete(k));
      return next;
    });
    await refreshCustomTopics();
    setShowDeleteModal(false);
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.container}>
          <h1 style={styles.h1}>Fetch News</h1>
        <div style={styles.subtitle}>Custom News Updates</div>
        </div>
      </header>

      <main style={styles.container}>
        {/* Account bar */}
        <div style={styles.accountBar}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {authLoading
              ? "Checking account…"
              : user
              ? `Signed in as ${user.email}`
              : "Not signed in"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!user ? (
              <button onClick={() => setShowAuth(true)} style={styles.actionBtn}>
                Sign in
              </button>
            ) : (
              <button onClick={logout} style={styles.actionBtn}>
                Sign out
              </button>
            )}
          </div>
        </div>

        {/* Location CTA */}
        {!location ? (
          <div style={styles.locationRow}>
            <button
              onClick={requestPermission}
              disabled={locStatus === "locating"}
              style={{
                ...styles.lengthBtn,
                ...(locStatus === "locating" ? styles.actionBtnDisabled : {}),
              }}
              title="Add a Local topic based on your area"
            >
              {locStatus === "locating" ? "Finding your location…" : "Use my location"}
            </button>
          </div>
        ) : (
          <div style={styles.locationHintRow}>
            <span>Added “{location.region || location.country || "Local"}” as Location</span>
            <button onClick={handleClearLocation} style={styles.textLinkBtn}>
              change
            </button>
          </div>
        )}

        {/* Custom topic creator + Delete Topic */}
        {user && (
          <div style={styles.customBar}>
            <div style={styles.customLeft}>
              <input
                placeholder="Custom topic (used as label & key)"
                value={customEntry}
                onChange={(e) => setCustomEntry(e.target.value)}
                style={styles.customInput}
              />
              <button onClick={addCustomTopic} style={styles.actionBtn}>
                Add Topic
              </button>
            </div>

            <div style={styles.customRight}>
              <button
                onMouseEnter={() => setHoverDelete(true)}
                onMouseLeave={() => setHoverDelete(false)}
                onClick={() => setShowDeleteModal(true)}
                disabled={selectedCustomKeys.length === 0}
                style={{
                  ...styles.actionBtn,
                  ...(selectedCustomKeys.length === 0
                    ? styles.actionBtnDisabled
                    : {}),
                  ...(hoverDelete && selectedCustomKeys.length > 0
                    ? styles.actionBtnDangerHover
                    : {}),
                }}
                title={
                  selectedCustomKeys.length
                    ? `Delete ${selectedCustomKeys.length} selected custom topic${selectedCustomKeys.length > 1 ? "s" : ""}`
                    : "Select custom topics to delete"
                }
              >
                Delete Topic
              </button>
            </div>
          </div>
        )}

        {/* Topics */}
        <div style={styles.topicsRow}>
          {topicsToRender.map((t) => {
            const active = selected.has(t.key);
            return (
              <button
                key={`${t.key}`}
                onClick={() => toggleTopic(t.key)}
                aria-pressed={active}
                style={{ ...styles.chip, ...(active ? styles.chipActive : null) }}
                title={user && customKeysSet.has(t.key) ? "Custom topic" : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Length options */}
        <div style={styles.lengthRow}>
          {LENGTH_OPTIONS.map((opt) => {
            const active = selectedLength === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => {
                  setSelectedLength(opt.key);
                  setIsDirty(true);
                }}
                aria-pressed={active}
                style={{
                  ...styles.lengthBtn,
                  ...(active ? styles.lengthBtnActive : null),
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button
            disabled={
              isLoading || selectedCount === 0 || phase !== "idle" || !isDirty
            }
            onClick={buildCombined}
            style={fetchBtnStyle()}
          >
            {currentButtonLabel()}
          </button>
          <button
            disabled={isLoading && phase !== "idle"}
            onClick={() => {
              setSelected(new Set());
              setItems([]);
              setCombined(null);
              setNowPlaying(null);
              setSelectedLength("short");
              setPhase("idle");
              setIsDirty(true);
            }}
            style={styles.actionBtn}
          >
            Reset
          </button>

          {/* Save + Load last setup (signed-in only) */}
          {user && (
            <>
              <button
                onClick={async () => {
                  const topicKeys = Array.from(selected);
                  if (!topicKeys.length) return;
                  await api("/api/user/presets/last", {
                    method: "POST",
                    body: JSON.stringify({ topicKeys }),
                  });
                }}
                style={styles.actionBtn}
              >
                Save this setup
              </button>
              <button
                onClick={async () => {
                  await loadLastPreset();
                }}
                style={styles.actionBtn}
              >
                Load last setup
              </button>
            </>
          )}
        </div>

        {/* MAIN summary */}
        {combined && (
          <section style={styles.heroSection}>
            <div style={styles.heroCard}>
              <div style={styles.cardHeader}>
                <strong>{combined.title}</strong>
                <button
                  onClick={() => handlePlayAudio(combined.title, combined.audioUrl)}
                  disabled={!combined?.audioUrl}
                  style={{
                    ...styles.playButton,
                    ...(!combined?.audioUrl ? styles.playButtonDisabled : null),
                  }}
                  title={combined?.audioUrl ? "Play summary" : "Audio not ready yet"}
                >
                  ▶ Play
                </button>
              </div>
              <p style={styles.summary}>{combined.summary}</p>
            </div>
          </section>
        )}

        {/* Sub summaries (articles) */}
        {displayableItems.length > 0 && (
          <ul style={styles.grid}>
            {displayableItems.map((it) => {
              const { text, truncated } = sentenceClip(it.summary, 30);
              if (!text.trim()) return null;

              const href = normalizeHttpUrl(it.url);

              return (
                <li key={it.id || it.url || it.title} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <strong>{it.title}</strong>
                  </div>

                  {!!it.topic && (
                    <div
                      style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}
                    >
                      {it.source ? `${it.source} · ` : ""}Topic: {it.topic}
                    </div>
                  )}

                  <p style={{ ...styles.summary, marginBottom: 10 }}>
                    {text}
                    {truncated ? "…" : ""}
                  </p>

                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.readBtn}
                      title="Open full article"
                    >
                      Read article
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {/* Fixed footer player */}
      <footer style={styles.footer}>
        <div style={styles.container}>
          <div style={styles.footerInner}>
            <div style={styles.nowPlaying}>
              {nowPlaying?.title
                ? `Now playing: ${nowPlaying.title}`
                : "Nothing playing"}
            </div>
            <audio
              ref={audioRef}
              style={styles.audioEl}
              src={nowPlaying?.audioUrl || ""}
              controls
            />
          </div>
        </div>
      </footer>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onLogin={login}
          onSignup={signup}
        />
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.confirmCard}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Delete custom topic{selectedCustomKeys.length > 1 ? "s" : ""}?
            </div>
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 12 }}>
              {selectedCustomKeys.length
                ? `Are you sure you want to delete “${selectedCustomKeys.join(", ")}”?`
                : "No custom topics selected."}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={styles.confirmCancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSelected}
                disabled={selectedCustomKeys.length === 0}
                style={styles.confirmDeleteBtn}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
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
    paddingBottom: FOOTER_HEIGHT,
  },
  container: { maxWidth: 960, margin: "0 auto", padding: "16px" },
  header: { borderBottom: "1px solid #e5e7eb", background: "#fff" },
  h1: { fontSize: 22, fontWeight: 600, margin: 0 },
  subtitle: { color: "#6b7280", marginTop: 6, fontSize: 14 },

  accountBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },

  locationRow: {
    display: "flex",
    justifyContent: "center",
    paddingTop: 12,
  },
  locationHintRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    color: "#6b7280",
    fontSize: 12,
    paddingTop: 8,
  },
  textLinkBtn: {
    border: "none",
    background: "transparent",
    color: "#111",
    textDecoration: "underline",
    cursor: "pointer",
    padding: 0,
    fontSize: 12,
  },

  customBar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  customLeft: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flex: "1 1 auto",
  },
  customRight: {
    marginLeft: "auto",
  },
  customInput: {
    flex: "1 1 320px",
    padding: 8,
    border: "1px solid #d1d5db",
    borderRadius: 8,
  },

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
    cursor: "pointer",
  },
  chipActive: {
    background: "#111",
    color: "#fff",
    border: "1px solid #111",
  },

  lengthRow: { display: "flex", gap: 8, paddingTop: 12, paddingBottom: 12 },
  lengthBtn: {
    padding: "6px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
  },
  lengthBtnActive: {
    background: "#111",
    color: "#fff",
    border: "1px solid #111",
  },

  actions: { display: "flex", gap: 8, paddingTop: 8, flexWrap: "wrap" },
  actionBtn: {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#fff",
    cursor: "pointer",
    transition: "opacity 0.15s ease, background 0.15s ease, color 0.15s ease",
  },
  actionBtnPrimary: {
    background: "#111",
    color: "#fff",
    border: "1px solid #111",
  },
  actionBtnDisabled: {
    background: "#f3f4f6",
    color: "#9ca3af",
    border: "1px solid #e5e7eb",
    cursor: "not-allowed",
  },
  actionBtnDangerHover: {
    background: "#dc2626",
    color: "#fff",
    border: "1px solid #dc2626",
  },

  heroSection: { marginTop: 12, marginBottom: 12 },
  heroCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
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
  playButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  readBtn: {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 600,
    textDecoration: "none",
    padding: "6px 10px",
    borderRadius: 8,
    background: "#000",
    color: "#fff",
    border: "1px solid #e5e7eb",
  },

  summary: { color: "#374151", fontSize: 14, margin: 0 },

  footer: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    background: "#fff",
    borderTop: "1px solid #e5e7eb",
    zIndex: 100,
    height: FOOTER_HEIGHT,
    display: "flex",
    alignItems: "center",
  },
  footerInner: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
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

  // Modals
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 9999,
  },
  modalCard: {
    background: "#fff",
    padding: 16,
    borderRadius: 12,
    width: 320,
    display: "grid",
    gap: 8,
  },
  inlineLinkBtn: {
    border: "none",
    background: "none",
    textDecoration: "underline",
    cursor: "pointer",
    padding: 0,
    color: "#111",
  },
  confirmCard: {
    background: "#fff",
    padding: 16,
    borderRadius: 12,
    width: 380,
    display: "grid",
    gap: 8,
  },
  confirmCancelBtn: {
    background: "transparent",
    color: "#111",
    border: "none",
    cursor: "pointer",
    padding: 0,
    fontWeight: 600,
  },
  confirmDeleteBtn: {
    background: "transparent",
    color: "#dc2626",
    border: "none",
    cursor: "pointer",
    padding: 0,
    fontWeight: 700,
  },
};
