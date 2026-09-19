import { useEffect, useRef, useState } from "react";
import { WifiOff, RotateCw } from "lucide-react";
import { BASE_URL } from "../../api/axiosInstance";
import "./OfflineOverlay.css";

// ── BAGO: 15 segundo ang pagitan ng bawat awtomatikong "ping" check, at
// 5 segundo ang timeout bago ituring na "walang sagot" ang server. ──────
const PING_INTERVAL_MS = 15000;
const PING_TIMEOUT_MS  = 5000;

// ── BAGO: totoong pag-susubok kung naaabot pa ba ang backend server —
// hindi na "navigator.onLine" lang (na tumitingin lang kung may network
// adapter/connection ang device, hindi kung may totoong access sa
// internet). Kahit anong HTTP status ang isasagot (200, 404, atbp.),
// ibig sabihin naabot ang server, kaya "online" pa rin. "Network Error"
// o timeout lang (walang sagot AT ALL) ang ituturing na "offline". ──────
async function checkConnectivity() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    await fetch(BASE_URL, { method: "GET", cache: "no-store", signal: controller.signal });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

// ── BAGO: full-screen na overlay na lumalabas kapag TALAGANG walang
// internet connection ang device (hindi lang mabagal — yun ang trabaho
// ng WeakConnectionBanner). Dalawang paraan ng detection ang pinagsama:
// (1) native na "online"/"offline" events ng browser — mabilis, pero
//     hindi nahuhuli ang kaso ng "may WiFi/naka-connect, pero walang
//     totoong internet" (hal. router na walang internet access); at
// (2) periodic na "ping" papunta sa backend server mismo — ito ang
//     sumasakop sa kasong iyon, dahil kung paulit-ulit na "Network
//     Error"/timeout ang nangyayari, ibig sabihin walang totoong
//     internet kahit "connected" ang WiFi.
// Naka-mount ito ISANG BESES lang sa App.jsx (sa labas ng <Routes>),
// kaya gumagana ito sa LAHAT ng portal (Admin/Staff/Member). ─────────────
export default function OfflineOverlay() {
  const [adapterOffline, setAdapterOffline] = useState(!navigator.onLine);
  const [pingFailed,     setPingFailed]     = useState(false);
  const [checking,       setChecking]       = useState(false);
  const cancelledRef = useRef(false);

  const runPing = async () => {
    const ok = await checkConnectivity();
    if (!cancelledRef.current) setPingFailed(!ok);
    return ok;
  };

  useEffect(() => {
    cancelledRef.current = false;

    // ── Unang check agad pagka-mount (para mahuli rin ang "connected
    // na WiFi, pero walang internet" kaso mula pa sa simula). ──────────
    runPing();
    const interval = setInterval(runPing, PING_INTERVAL_MS);

    const goOffline = () => setAdapterOffline(true);
    // ── Sa sandaling bumalik ang adapter (WiFi/network) sa "online",
    // hindi agad ito paniniwalaan — mag-ping muna para ma-kumpirma na
    // may TOTOONG internet access na (hindi lang "connected" ang WiFi). ──
    const goOnline = () => {
      setAdapterOffline(false);
      runPing();
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online",  goOnline);

    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online",  goOnline);
    };
  }, []);

  const isOffline = adapterOffline || pingFailed;
  if (!isOffline) return null;

  const handleRetry = async () => {
    setChecking(true);
    await runPing();
    setChecking(false);
  };

  return (
    <div className="off-overlay" role="alert" aria-live="assertive">
      <div className="off-card">
        <div className="off-icon"><WifiOff size={38} /></div>
        <div className="off-title">You're Offline</div>
        <div className="off-text">
          Walang internet connection. I-check ang iyong Wi-Fi o mobile data —
          awtomatiko itong mawawala kapag bumalik na ang totoong koneksyon.
        </div>
        <button className="off-retry-btn" onClick={handleRetry} disabled={checking}>
          <RotateCw size={14} className={checking ? "off-spin" : ""} />
          {checking ? "Checking..." : "Try Again"}
        </button>
      </div>
    </div>
  );
}