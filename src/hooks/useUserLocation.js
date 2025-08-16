import { useCallback, useMemo, useState } from "react";

const LS_KEY = "fetchnews.location.v1";

function safeParse(json) {
  try { return JSON.parse(json); } catch { return null; }
}

async function reverseGeocode(lat, lon, signal) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  url.searchParams.set("zoom", "10");
  url.searchParams.set("addressdetails", "1");

  const r = await fetch(url.toString(), {
    headers: { "Accept": "application/json", "User-Agent": "FetchNews/1.0" },
    signal
  });
  if (!r.ok) throw new Error("reverse geocode failed");
  const j = await r.json();
  const a = j.address || {};
  return {
    city: a.city || a.town || a.village || a.county || "",
    region: a.state || a.region || "",
    country: a.country || "",
    countryCode: (a.country_code || "").toUpperCase(),
    lat, lon, source: "gps"
  };
}

async function ipFallback(signal) {
  const r = await fetch("https://ipapi.co/json/", { signal });
  if (!r.ok) throw new Error("ip lookup failed");
  const j = await r.json();
  return {
    city: j.city || "",
    region: j.region || "",
    country: j.country_name || "",
    countryCode: (j.country || "").toUpperCase(),
    lat: j.latitude ?? null,
    lon: j.longitude ?? null,
    source: "ip"
  };
}

export function useUserLocation() {
  const [location, setLocation] = useState(() => safeParse(localStorage.getItem(LS_KEY)));
  const [status, setStatus] = useState(location ? "ready" : "idle"); // idle | locating | ready | error
  const [error, setError] = useState(null);

  // NEW: track the *permission* result from the browser (independent of IP fallback)
  // 'unknown' | 'granted' | 'denied'
  const [permission, setPermission] = useState("unknown");

  const save = useCallback((loc) => {
    setLocation(loc);
    localStorage.setItem(LS_KEY, JSON.stringify({ ...loc, cachedAt: Date.now() }));
  }, []);

  // CHANGED: returns Promise<boolean> -> true only when geolocation was granted.
  const requestPermission = useCallback(() => {
    setStatus("locating"); setError(null);

    return new Promise((resolve) => {
      const ac = new AbortController(); const { signal } = ac;

      const onSuccess = async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const loc = await reverseGeocode(latitude, longitude, signal);
          save(loc);
          setStatus("ready");
          setPermission("granted");
          resolve(true); // user granted precise location
        } catch {
          // Geolocation worked but reverse geocoding failed; still honored as granted
          setPermission("granted");
          try { const loc = await ipFallback(signal); save(loc); setStatus("ready"); }
          catch (e2) { setError(e2?.message || "Location lookup failed"); setStatus("error"); }
          resolve(true);
        }
      };

      const onError = async () => {
        // User denied or geolocation failed -> keep permission 'denied'
        setPermission("denied");
        try { const loc = await ipFallback(signal); save(loc); setStatus("ready"); }
        catch (e2) { setError(e2?.message || "Location lookup failed"); setStatus("error"); }
        resolve(false); // important: let UI know the user did NOT grant
      };

      if (!("geolocation" in navigator)) {
        // No geolocation — treat as denied for the prompt logic
        setPermission("denied");
        onError();
        return () => ac.abort();
      }

      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true, maximumAge: 5*60*1000, timeout: 10*1000
      });

      // We don’t expose the abort handle since callers await the Promise
      // but we keep AC for fetches inside reverse geocode / ip fallback.
    });
  }, [save]);

  const clearLocation = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    setLocation(null);
    setStatus("idle");
    setError(null);
    setPermission("unknown");
  }, []);

  const pretty = useMemo(() => {
    if (!location) return "";
    const parts = [location.city, location.region].filter(Boolean);
    return parts.length ? parts.join(", ") : location.country || "My Location";
  }, [location]);

  return {
    location,
    pretty,
    status,        // idle | locating | ready | error
    permission,    // unknown | granted | denied   <-- used to keep the CTA visible on denial
    error,
    requestPermission, // Promise<boolean>
    clearLocation
  };
}
