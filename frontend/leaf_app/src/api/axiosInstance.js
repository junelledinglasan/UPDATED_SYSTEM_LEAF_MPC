import axios from "axios";

// ─── Dynamic BASE URL ─────────────────────────────────────────────────────────
const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`;
  }
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://127.0.0.1:8000/api";
  }
  return `http://${hostname}:8000/api`;
};

// ── BAGO: "export" na ito — kailangan ito ng OfflineOverlay.jsx para
// gamitin bilang target ng periodic "ping" check (tingnan ang
// components/common/OfflineOverlay.jsx). ──────────────────────────────
export const BASE_URL = getBaseURL();

const api = axios.create({
  baseURL: BASE_URL,
  // ── REMOVED hardcoded Content-Type ─────────────────────────────────────────
  // Dati: headers: { "Content-Type": "application/json" }
  // Ito ang nagdudulot ng error kapag nag-upload ng image (FormData)
  // Hayaan na si axios mag-auto-set ng tamang Content-Type
});

// ─── BAGO: "Weak Signal" detection ────────────────────────────────────────────
// Layunin: ipakita ang isang "Weak connection — please wait" banner kapag may
// request na humigit-sa SLOW_THRESHOLD_MS (default 3s) bago pa man makatanggap
// ng response. Hindi ito nag-a-abort o nag-re-retry ng kahit ano — pure UI
// signal lang ito, dagdag sa ibabaw ng existing na token-refresh logic (hindi
// ito ginalaw/binago). Gumagamit ng CustomEvent sa `window` para hindi na
// kailangan mag-import ng React Context dito sa isang plain axios file —
// makikinig na lang ang <WeakConnectionBanner /> sa event na ito kahit saan
// man ito i-mount sa App.jsx. ──────────────────────────────────────────────────
const SLOW_THRESHOLD_MS = 3000;
export const WEAK_SIGNAL_EVENT = "leaf:weak-signal";

// Bilang ng mga request na CURRENTLY "matagal na" (lumagpas na sa threshold)
// — kailangan itong bilang (hindi lang true/false) dahil posibleng may
// ilang request na sabay-sabay na tumatagal; dapat manatiling "true" ang
// banner hangga't may kahit isa pang matagal, at "false" lang kapag
// naubos na LAHAT. ─────────────────────────────────────────────────────────
let slowRequestCount = 0;

function setWeakSignal(active) {
  window.dispatchEvent(new CustomEvent(WEAK_SIGNAL_EVENT, { detail: { active } }));
}

function markSlowStart() {
  slowRequestCount += 1;
  if (slowRequestCount === 1) setWeakSignal(true);
}

function markSlowEnd() {
  slowRequestCount = Math.max(0, slowRequestCount - 1);
  if (slowRequestCount === 0) setWeakSignal(false);
}

// ─── Attach JWT token + Smart Content-Type + Slow-request timer ──────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("leaf_access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Kapag FormData (file upload) — huwag mag-set ng Content-Type
    // Kapag regular JSON request — i-set ang application/json
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }

    // ── BAGO: simulan ang "slow request" timer. Kung hindi pa nakakabalik
    // ang response bago mag-3s, ituturing itong "mahina ang signal" at
    // ipapakita ang banner. Naka-store ang timer id sa config mismo para
    // ma-clear ito sa response/error interceptor. ──────────────────────
    config._weakSignalFired = false;
    config._weakSignalTimer = setTimeout(() => {
      config._weakSignalFired = true;
      markSlowStart();
    }, SLOW_THRESHOLD_MS);

    return config;
  },
  (error) => Promise.reject(error)
);

// Tinatawag ito sa parehong success at error path — kailangan laging
// i-clear ang timer at i-decrement ang counter kung na-trigger na ito,
// kahit anong klaseng resulta ang natanggap. ────────────────────────────
function clearWeakSignal(config) {
  if (!config) return;
  if (config._weakSignalTimer) {
    clearTimeout(config._weakSignalTimer);
    config._weakSignalTimer = null;
  }
  if (config._weakSignalFired) {
    config._weakSignalFired = false;
    markSlowEnd();
  }
}

// ─── Auto refresh token kapag 401 ────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    clearWeakSignal(response.config);
    return response;
  },
  async (error) => {
    const original = error.config;
    clearWeakSignal(original);

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem("leaf_refresh_token");
        if (!refresh) throw new Error("No refresh token");
        const res = await axios.post(`${BASE_URL}/token/refresh/`, { refresh });
        const newAccess = res.data.access;
        localStorage.setItem("leaf_access_token", newAccess);
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch {
        localStorage.removeItem("leaf_access_token");
        localStorage.removeItem("leaf_refresh_token");
        localStorage.removeItem("leaf_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;