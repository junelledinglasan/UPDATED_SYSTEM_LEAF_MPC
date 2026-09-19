import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { WEAK_SIGNAL_EVENT } from "../../api/axiosInstance";
import "./WeakConnectionBanner.css";

// ── BAGO: global banner na nagpapakita kapag may request na tumagal ng
// 3+ segundo bago sumagot ang server (tingnan ang axiosInstance.js —
// "markSlowStart/markSlowEnd"). Naka-mount ito ISANG BESES lang sa
// App.jsx (sa labas ng <Routes>) kaya gumagana ito sa LAHAT ng portal
// (Admin/Staff/Member) nang hindi na kailangang kopyahin sa bawat Layout. ──
export default function WeakConnectionBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleWeakSignal = (e) => setVisible(!!e.detail?.active);
    window.addEventListener(WEAK_SIGNAL_EVENT, handleWeakSignal);
    return () => window.removeEventListener(WEAK_SIGNAL_EVENT, handleWeakSignal);
  }, []);

  if (!visible) return null;

  return (
    <div className="wcb-banner" role="status" aria-live="polite">
      <WifiOff size={15} className="wcb-icon" />
      <span>Mahina ang signal — please wait, nilo-load pa...</span>
    </div>
  );
}