// src/context/LanguageContext.jsx
// ── Language switcher para sa member portal — English/Filipino.
// Naka-save sa localStorage (hindi sensitive na data, katulad ng
// ibang UI preferences — walang security risk kung persistent). ─────
//
// ── BAGO: hindi na kailangang mano-manong isulat ang Filipino version
// ng BAWAT text sa translations.js. Sa halip:
//   1) Kung may manual entry sa translations.fil[key] — GAGAMITIN pa
//      rin ito (bilang override — para sa mga terminong gusto mong
//      i-correct nang mano-mano, hal. tamang salita para sa "cooperative"
//      o iba pang legal/pinansyal na termino).
//   2) Kung wala — titingnan muna ang localStorage cache ng dating
//      na-auto-translate na resulta.
//   3) Kung wala pa rin sa cache — awtomatikong tatawag sa MyMemory
//      Translation API sa background (translateApi.js), ise-save ang
//      resulta sa cache, at mag-re-render para ipakita ang bagong
//      salin. Habang naghihintay, ipinapakita muna ang English (para
//      hindi kailanman blangko/nakakalitong text ang lumalabas). ──────
import { createContext, useContext, useState, useCallback, useRef } from "react";
import { translations } from "../i18n/translations";
import { translateText } from "../i18n/translateApi";
import { translationCache } from "../i18n/translationCache";

const LanguageContext = createContext(null);
const STORAGE_KEY = "leaf_language";

// ── Tinatanggal muna ang mga {placeholder} bago ipadala sa translation
// API (para hindi ito masira o ma-translate mismo ang laman nito), at
// ibinabalik pagkatapos matanggap ang salin. ────────────────────────────
const PLACEHOLDER_RE = /\{[^}]+\}/g;

function protectPlaceholders(str) {
  const tokens = [];
  const safe = str.replace(PLACEHOLDER_RE, (match) => {
    tokens.push(match);
    return `@@${tokens.length - 1}@@`;
  });
  return { safe, tokens };
}

function restorePlaceholders(str, tokens) {
  return str.replace(/@@\s*(\d+)\s*@@/g, (_, i) => tokens[Number(i)] ?? "");
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "fil" ? "fil" : "en";
    } catch {
      return "en";
    }
  });

  // ── "tick" — ginagamit lang para i-trigger ang re-render ng lahat ng
  // component na gumagamit ng t() sa sandaling may bagong dating na
  // auto-translation mula sa API. Hindi ito binabasa kahit saan. ────────
  const [, setTick] = useState(0);
  const pendingRef = useRef(new Set()); // keys na kasalukuyang tinatawag sa API

  const setLanguage = (lang) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* no-op */
    }
  };

  const toggleLanguage = () => setLanguage(language === "en" ? "fil" : "en");

  const fetchAndCache = useCallback((key, englishTemplate) => {
    if (pendingRef.current.has(key)) return; // hindi na double-fetch ang parehong key
    pendingRef.current.add(key);

    const { safe, tokens } = protectPlaceholders(englishTemplate);
    translateText(safe, "tl")
      .then((translatedSafe) => {
        const translated = restorePlaceholders(translatedSafe, tokens);
        translationCache.set(key, translated);
      })
      .catch((err) => {
        // ── Kapag na-fail (walang internet, na-rate-limit ang API,
        // atbp.) — hindi na natin ise-save sa cache, babalik lang muna
        // sa English sa ngayon at susubukan ulit sa susunod na render. ──
        console.error(`[translate] hindi na-translate ang "${key}":`, err);
      })
      .finally(() => {
        pendingRef.current.delete(key);
        setTick((v) => v + 1);
      });
  }, []);

  // ── t(key, vars) — kunin ang translation, palitan ang {placeholders}
  // gamit ang vars object. ─────────────────────────────────────────────
  const t = (key, vars = {}) => {
    const englishTemplate = translations.en[key] ?? key;
    let template = englishTemplate;

    if (language === "fil") {
      const manualOverride = translations.fil?.[key];
      if (manualOverride) {
        // (1) manual override — priyoridad kung meron
        template = manualOverride;
      } else {
        const cached = translationCache.get(key);
        if (cached) {
          // (2) dating na-auto-translate na — galing sa cache
          template = cached;
        } else {
          // (3) unang beses lang makikita ang key na 'to — i-trigger ang
          // background translation, English muna ang ipapakita samantala
          fetchAndCache(key, englishTemplate);
        }
      }
    }

    let str = template;
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replaceAll(`{${k}}`, v);
    });
    return str;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}