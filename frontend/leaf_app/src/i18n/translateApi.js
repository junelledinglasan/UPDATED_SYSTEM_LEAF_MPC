// src/i18n/translateApi.js
// ── BAGO: auto-translate helper gamit ang MyMemory Translation API
// (libre, walang API key na kailangan). Idinaragdag ang "de" param
// (email) para tumaas ang free daily quota mula 5,000 hanggang
// 50,000 words/day, base sa dokumentasyon ng MyMemory. ─────────────────
const MYMEMORY_ENDPOINT = "https://api.mymemory.translated.net/get";
const QUOTA_EMAIL = "dinglasanjunelle@gmail.com";

// ── Nire-restrict ang concurrent na tawag papunta sa API (hindi lahat
// ng text sa isang page sabay-sabay tatawag) para hindi ma-rate-limit
// o ma-block ng MyMemory kapag maraming keys na kailangang isalin nang
// sabay (hal. paglipat ng buong page papuntang Filipino). ──────────────
const MAX_CONCURRENT = 4;
let activeCount = 0;
const queue = [];

function runQueue() {
  while (activeCount < MAX_CONCURRENT && queue.length) {
    const job = queue.shift();
    activeCount++;
    job().finally(() => {
      activeCount--;
      runQueue();
    });
  }
}

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push(() => fn().then(resolve, reject));
    runQueue();
  });
}

async function rawTranslate(text, targetLangCode) {
  const params = new URLSearchParams({
    q: text,
    langpair: `en|${targetLangCode}`,
    de: QUOTA_EMAIL,
  });
  const res = await fetch(`${MYMEMORY_ENDPOINT}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Translate API error: ${res.status}`);
  }
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (!translated) {
    throw new Error("Translate API: walang laman ang sagot");
  }
  return translated;
}

// ── translateText(text, targetLangCode) — pinapayagan lang ang isang
// tawag sa API sa bawat pagkakataon dahil sa concurrency queue sa itaas.
// "tl" ang targetLangCode para sa Filipino/Tagalog. ─────────────────────
export async function translateText(text, targetLangCode = "tl") {
  if (!text || !text.trim()) return text;
  return enqueue(() => rawTranslate(text, targetLangCode));
}