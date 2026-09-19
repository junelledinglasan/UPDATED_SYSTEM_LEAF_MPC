// src/i18n/translationCache.js
// ── BAGO: localStorage-backed cache ng mga auto-translated (API) na
// text, keyed by translation key (hal. "dash_welcome"). Layunin: hindi
// na paulit-ulit tatawag sa MyMemory API kada reload/session — sa
// unang pagkakataon lang talaga tatawag ang API sa bawat key, pagkatapos
// nasa cache na ito habang-buhay (o hanggang i-clear ng user browser data). ──
const CACHE_KEY = "leaf_translation_cache_fil";

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ── Kung puno na ang localStorage o naka-disable (private browsing),
    // hindi na natin ito ituturing na fatal error — babalik lang ulit
    // sa pagtawag sa API sa susunod, hindi masisira ang UI. ──────────────
  }
}

export const translationCache = {
  get(key) {
    return loadCache()[key];
  },
  set(key, value) {
    const cache = loadCache();
    cache[key] = value;
    saveCache(cache);
  },
  clear() {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      /* no-op */
    }
  },
};