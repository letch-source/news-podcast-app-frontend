/* eslint-disable react-hooks/exhaustive-deps */
import React, { useRef, useState, useMemo, useEffect } from "react";
import { useUserLocation } from "./hooks/useUserLocation";

const PROD_API_BASE = "https://fetch-bpof.onrender.com";
const API_BASE =
  process.env.REACT_APP_API_BASE ??
  (process.env.NODE_ENV === "production" ? PROD_API_BASE : "");

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

const FOOTER_HEIGHT = 72; // slightly taller so controls aren’t clipped

// ---------- Auth / Modals ----------
function AuthModal({ onClose, onLogin, onSignup, onForgot }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  // helper: unwrap backend error message
  function humanError(e) {
    const msg = e?.message || "";
    try {
      const j = JSON.parse(msg);
      if (j?.error) return j.error;
    } catch {}
    if (/Email in use/i.test(msg)) return "Email already in use";
    if (/Invalid credentials/i.test(msg)) return "Invalid email or password";
    if (/Missing fields/i.test(msg)) return "Missing fields";
    return "Failed. Check your details.";
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setInfo("");
    try {
      if (mode === "login") {
        await onLogin(email, password);
      } else {
        await onSignup(email, password, firstName);
      }
      onClose();
    } catch (ex) {
      setErr(humanError(ex));
    }
  }

  async function forgotPwd() {
    setErr("");
    setInfo("");
    try {
      await onForgot(email);
      setInfo("If that email exists, a reset link has been sent.");
    } catch {
      setInfo("If that email exists, a reset link has been sent.");
    }
  }

  const canSubmit =
    mode === "login"
      ? email.trim() && password.trim()
      : email.trim() && password.trim() && firstName.trim();

  return (
    <div style={styles.modalBackdrop}>
      <form onSubmit={submit} style={styles.modalCard}>
        <strong>{mode === "login" ? "Sign in" : "Create account"}</strong>

        {mode === "signup" && (
          <input
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        )}

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
        {info && <div style={{ color: "#065f46", fontSize: 12 }}>{info}</div>}

        <button
          type="submit"
          style={{ ...styles.primaryBtn, ...(canSubmit ? null : styles.actionBtnDisabled) }}
          disabled={!canSubmit}
        >
          {mode === "login" ? "Sign in" : "Sign up"}
        </button>
        <button type="button" onClick={onClose} style={styles.actionBtn}>
          Cancel
        </button>

        {mode === "login" && (
          <div style={{ marginTop: 6 }}>
            <button
              type="button"
              onClick={forgotPwd}
              style={styles.inlineLinkBtn}
            >
              Forgot password?
            </button>
          </div>
        )}

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

function ResetPasswordModal({ token, onClose, onReset }) {
  const [password, setPassword] = useState("");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      await onReset(token, password);
      setOk(true);
      setTimeout(onClose, 1200);
    } catch {
      setErr("Reset failed. The link may be expired.");
    }
  }

  return (
    <div style={styles.modalBackdrop}>
      <form onSubmit={submit} style={styles.modalCard}>
        <strong>Reset password</strong>
        <input
          placeholder="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {err && <div style={{ color: "#b91c1c", fontSize: 12 }}>{err}</div>}
        {ok && <div style={{ color: "#065f46", fontSize: 12 }}>Password updated!</div>}
        <button type="submit" style={styles.primaryBtn}>
          Set new password
        </button>
        <button type="button" onClick={onClose} style={styles.actionBtn}>
          Close
        </button>
      </form>
    </div>
  );
}

function ProfileModal({ user, location, onClose, onLogout, onChangeLocation }) {
  const locText = location
    ? `Location set as “${location.region || location.country || "Local"}”`
    : "Location not set";
  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.profileCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={styles.avatarCircle}>
            {(user.firstName || user.email || "?").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>{user.firstName || "Profile"}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{user.email}</div>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 13, color: "#374151" }}>{locText}</div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onChangeLocation} style={styles.actionBtn}>Change location</button>
          <button onClick={onLogout} style={styles.actionBtn}>Sign out</button>
          <button onClick={onClose} style={styles.actionBtn}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ---------- App ----------
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

  // Auth
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [resetToken, setResetToken] = useState("");

  // Location
  const { location, status: locStatus, requestPermission, clearLocation } = useUserLocation();

  // State label for "local" chip
  const stateLabel = useMemo(() => {
    if (!location) return "";
    return location.region || location.country || "Local";
  }, [location]);

  // Custom topics
  const [userTopics, setUserTopics] = useState([]); // [{key,label}]
  const customKeysSet = useMemo(
    () => new Set(userTopics.map((t) => t.key)),
    [userTopics]
  );
  const selectedCustomKeys = useMemo(
    () => Array.from(selected).filter((k) => customKeysSet.has(k)),
    [selected, customKeysSet]
  );

  // For rendering, split core vs custom
  const coreTopicsToRender = useMemo(() => {
    const base = [...CORE_TOPICS];
    return location ? [{ key: "local", label: stateLabel || "Local" }, ...base] : base;
  }, [location, stateLabel]);

  const topicsToRenderCustom = useMemo(() => userTopics, [userTopics]);

  const selectedCount = selected.size;
  const selectedList = useMemo(() => Array.from(selected), [selected]);

  // ---------- API helper ----------
  async function api(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
    if (!res.ok) {
      // throw friendlier error
      const msg = data?.error ? JSON.stringify({ error: data.error }) : raw || "Request failed";
      throw new Error(msg);
    }
    return data ?? {};
  }

  async function login(email, password) {
    const u = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(u);
    await refreshCustomTopics(); // ensure custom topics reload after login
    await loadLastPreset();
    return u;
  }

  async function signup(email, password, firstName) {
    const u = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, firstName }),
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
    setShowProfile(false);
  }

  async function requestReset(email) {
    await api("/api/auth/request-reset", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async function performReset(token, password) {
    await api("/api/auth/reset", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  async function refreshCustomTopics() {
    if (!user) return setUserTopics([]);
    try {
      const r = await api("/api/user/topics");
      setUserTopics(Array.isArray(r.topics) ? r.topics : []);
    } catch {
      setUserTopics([]);
    }
  }

  async function loadLastPreset() {
    try {
      const last = await api("/api/user/presets/last");
      if (Array.isArray(last.topicKeys) && last.topicKeys.length) {
        setSelected(new Set(last.topicKeys));
        setIsDirty(true);
      }
    } catch {}
  }

  // ---------- Topic selection ----------
  function toggleTopic(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
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
    if (disabled) return { ...styles.primaryBtn, ...styles.actionBtnDisabled };
    return styles.primaryBtn;
  }

  // ---------- Fetch news ----------
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

  // ---------- Mount: check auth, topics, last preset; parse reset token ----------
  useEffect(() => {
    (async () => {
      try {
        const me = await api("/api/auth/me");
        if (me.user) {
          setUser(me.user);
          await refreshCustomTopics(); // ensure topics immediately after restored session
          await loadLastPreset();
        }
      } catch {
      } finally {
        setAuthLoading(false);
      }
    })();

    // Parse reset token from URL
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("resetToken");
    if (t) {
      setResetToken(t);
      // Clean the URL (no reload)
      const url = new URL(window.location.href);
      url.searchParams.delete("resetToken");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // ---------- Custom topic creation ----------
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

  // Delete topics modal
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

  // Change location flow from Profile
  async function changeLocationFlow() {
    try {
      const granted = await requestPermission();
      if (!granted) return; // user declined — keep as-is
      // Success -> just mark dirty so summaries can use geo
      setIsDirty(true);
    } catch {
      // ignore
    }
  }

  // ---------- UI ----------
  const canAddTopic = customEntry.trim().length > 0;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.containerHeader}>
          <div>
            <h1 style={styles.h1}>Fetch News</h1>
            <div style={styles.subtitle}>Custom News Updates</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!user ? (
              <button onClick={() => setShowAuth(true)} style={styles.actionBtn}>
                Sign in
              </button>
            ) : (
              <button
                onClick={() => setShowProfile(true)}
                title="Profile"
                style={styles.avatarButton}
              >
                {(user.firstName || user.email || "?").slice(0, 1).toUpperCase()}
              </button>
            )}
          </div>
        </div>
        <div style={styles.subtitleWrap}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {authLoading ? "Checking account…" : user ? `Welcome, ${user.firstName || user.email}` : "Not signed in"}
          </div>
        </div>
      </header>

      <main style={styles.container}>
        {/* Custom topic creator + Delete Topic + Location CTA */}
        {user && (
          <div style={styles.customBar}>
            <div style={styles.customLeft}>
              <input
                placeholder="Custom topic"
                value={customEntry}
                onChange={(e) => setCustomEntry(e.target.value)}
                style={styles.customInput}
              />
              <button
                onClick={addCustomTopic}
                style={{
                  ...styles.actionBtn,
                  ...(canAddTopic ? styles.actionBtnPrimary : styles.actionBtnDisabled),
                }}
                disabled={!canAddTopic}
              >
                Add Topic
              </button>

              {/* Location CTA (only if no saved location) */}
              {!location && (
                <button
                  type="button"
                  onClick={async () => {
                    const granted = await requestPermission();
                    // If denied, location remains null => this stays visible.
                    if (granted) setIsDirty(true);
                  }}
                  style={styles.textLinkBtn}
                  title="Enable location to add a Local topic based on your area"
                >
                  Allow location for local news?
                </button>
              )}
            </div>

            <div style={styles.customRight}>
              <button
                onMouseEnter={() => setHoverDelete(true)}
                onMouseLeave={() => setHoverDelete(false)}
                onClick={() => setShowDeleteModal(true)}
                disabled={selectedCustomKeys.length === 0}
                style={{
                  ...styles.actionBtn,
                  ...(selectedCustomKeys.length === 0 ? styles.actionBtnDisabled : {}),
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

        {/* Core topics */}
        <div style={styles.topicsRow}>
          {coreTopicsToRender.map((t) => {
            const active = selected.has(t.key);
            return (
              <button
                key={t.key}
                onClick={() => toggleTopic(t.key)}
                aria-pressed={active}
                style={{ ...styles.chip, ...(active ? styles.chipActive : null) }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Custom topics on their own line */}
        {topicsToRenderCustom.length > 0 && (
          <div style={{ ...styles.topicsRow, marginTop: 4 }}>
            {topicsToRenderCustom.map((t) => {
              const active = selected.has(t.key);
              return (
                <button
                  key={t.key}
                  onClick={() => toggleTopic(t.key)}
                  aria-pressed={active}
                  style={{
                    ...styles.chip,
                    ...(active ? styles.chipActive : null),
                    // subtle badge for custom
                    boxShadow: "inset 0 0 0 1px #e5e7eb",
                  }}
                  title="Custom topic"
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Divider between topics and length */}
        <hr style={styles.hr} />

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

        {/* Actions (centered) */}
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

        {/* Sub summaries (articles with sources) */}
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

                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                    {it.source ? `${it.source} · ` : ""}
                    Topic: {it.topic}
                  </div>

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
          onForgot={requestReset}
        />
      )}

      {showProfile && user && (
        <ProfileModal
          user={user}
          location={location}
          onClose={() => setShowProfile(false)}
          onLogout={logout}
          onChangeLocation={changeLocationFlow}
        />
      )}

      {resetToken && (
        <ResetPasswordModal
          token={resetToken}
          onClose={() => setResetToken("")}
          onReset={performReset}
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
    paddingBottom: FOOTER_HEIGHT + 8, // ensure audio bar never clips
  },
  container: { maxWidth: 960, margin: "0 auto", padding: "16px" },

  header: { borderBottom: "1px solid #e5e7eb", background: "#fff" },
  containerHeader: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },
  h1: { fontSize: 22, fontWeight: 600, margin: 0, lineHeight: 1.1 },
  subtitleWrap: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "0 16px 12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  subtitle: { fontSize: 14, fontWeight: 400, color: "#374151", marginTop: 2 },

  topicsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },

  hr: {
    height: 1,
    background: "#e5e7eb",
    border: "none",
    margin: "8px 0 12px 0",
  },

  lengthRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },

  chip: {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  chipActive: {
    background: "#111827",
    color: "#fff",
    borderColor: "#111827",
  },

  lengthBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  lengthBtnActive: {
    background: "#111827",
    color: "#fff",
    borderColor: "#111827",
  },

  actions: {
    display: "flex",
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
    justifyContent: "center",
  },

  actionBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #111827",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  actionBtnPrimary: {
    background: "#111827",
    color: "#fff",
    borderColor: "#111827",
  },
  actionBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  actionBtnDangerHover: {
    background: "#b91c1c",
    color: "#fff",
    borderColor: "#991b1b",
  },

  textLinkBtn: {
    background: "transparent",
    border: "none",
    padding: 0,
    color: "#374151",
    textDecoration: "underline",
    cursor: "pointer",
    fontSize: 14,
    marginLeft: 8,
  },

  heroSection: { marginTop: 8, marginBottom: 16 },
  heroCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    background: "#fff",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  playButton: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  playButtonDisabled: { opacity: 0.5, cursor: "not-allowed" },

  summary: { fontSize: 14, lineHeight: 1.6, color: "#111827", margin: 0 },

  grid: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 12,
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
    background: "#fff",
  },
  readBtn: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    textDecoration: "none",
    fontSize: 14,
  },

  footer: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    height: FOOTER_HEIGHT,
    borderTop: "1px solid #e5e7eb",
    background: "#fafafa",
    zIndex: 40,
  },
  footerInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    height: FOOTER_HEIGHT,
  },
  nowPlaying: { fontSize: 12, color: "#374151" },
  audioEl: { width: 360, maxWidth: "100%" },

  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 50,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: 16,
    display: "grid",
    gap: 10,
  },

  profileCard: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: 16,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#111827",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 18,
  },

  inlineLinkBtn: {
    background: "transparent",
    border: "none",
    padding: 0,
    color: "#2563eb",
    textDecoration: "underline",
    cursor: "pointer",
    fontSize: 12,
  },

  customBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  customLeft: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  customRight: { display: "flex", alignItems: "center" },
  customInput: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 14,
    minWidth: 180,
  },

  confirmCard: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: 16,
  },
  confirmCancelBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  confirmDeleteBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #b91c1c",
    background: "#b91c1c",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
};
