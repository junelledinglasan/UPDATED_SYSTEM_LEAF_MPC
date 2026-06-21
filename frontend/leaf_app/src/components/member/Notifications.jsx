import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
  CalendarClock, Megaphone, CheckCircle2, XCircle,
  Trophy, Settings, AlertTriangle, Bell, Clock, X
} from "lucide-react";
import { getAnnouncementsAPI } from "../../api/announcements";
import { getLoansAPI } from "../../api/loans";
import { getMyApplicationAPI, getMyOnlineAppAPI } from "../../api/members";
import { useAuth } from "../../context/AuthContext";
import "./Notifications.css";

const TYPE_META = {
  due:        { icon: <CalendarClock size={20} color="#e65100"/>, color:"notif-due",        label:"Payment Due",  bg:"#fff8e1", border:"#ffe082", text:"#e65100" },
  notice:     { icon: <Megaphone     size={20} color="#1565c0"/>, color:"notif-notice",     label:"Notice",       bg:"#e3f2fd", border:"#90caf9", text:"#1565c0" },
  approved:   { icon: <CheckCircle2  size={20} color="#1b5e20"/>, color:"notif-approved",   label:"Approved",     bg:"#e8f5e9", border:"#a5d6a7", text:"#1b5e20" },
  rejected:   { icon: <XCircle       size={20} color="#c62828"/>, color:"notif-rejected",   label:"Rejected",     bg:"#ffebee", border:"#ef9a9a", text:"#c62828" },
  membership: { icon: <Trophy        size={20} color="#1b5e20"/>, color:"notif-membership", label:"Membership",   bg:"#e8f5e9", border:"#a5d6a7", text:"#1b5e20" },
  system:     { icon: <Settings      size={20} color="#555"/>,    color:"notif-system",     label:"System",       bg:"#f5f5f5", border:"#e0e0e0", text:"#555"    },
  overdue:    { icon: <AlertTriangle size={20} color="#c62828"/>, color:"notif-overdue",    label:"Overdue",      bg:"#ffebee", border:"#ef9a9a", text:"#c62828" },
};

const FILTERS = ["All", "Unread", "Payment Due", "Notice", "Membership", "System"];

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  if (hrs  < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  if (days < 7)  return `${days} day${days !== 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function NotifModal({ notif, onClose, onNavigate }) {
  if (!notif) return null;
  const meta = TYPE_META[notif.type] || TYPE_META.system;
  return (
    <div className="nf-modal-overlay" onClick={onClose}>
      <div className="nf-modal-box" onClick={e => e.stopPropagation()}>
        <div className="nf-modal-header" style={{ borderBottom: `3px solid ${meta.border}` }}>
          <div className="nf-modal-icon-wrap" style={{ background: meta.bg, borderRadius: 12, width: 52, height: 52, display:"flex", alignItems:"center", justifyContent:"center", flexShrink: 0 }}>
            {notif.type === "due"        && <CalendarClock size={28} color="#e65100"/>}
            {notif.type === "notice"     && <Megaphone     size={28} color="#1565c0"/>}
            {notif.type === "approved"   && <CheckCircle2  size={28} color="#1b5e20"/>}
            {notif.type === "rejected"   && <XCircle       size={28} color="#c62828"/>}
            {notif.type === "membership" && <Trophy        size={28} color="#1b5e20"/>}
            {notif.type === "system"     && <Settings      size={28} color="#555"/>}
            {notif.type === "overdue"    && <AlertTriangle size={28} color="#c62828"/>}
          </div>
          <div className="nf-modal-header-info">
            <div className="nf-modal-type-badge" style={{ background: meta.bg, color: meta.text, border: `1px solid ${meta.border}` }}>
              {meta.label}
            </div>
            <div className="nf-modal-time">{notif.time}</div>
          </div>
          <button className="nf-modal-close" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="nf-modal-body">
          <div className="nf-modal-title">{notif.title}</div>
          <div className="nf-modal-msg">{notif.msg}</div>
        </div>
        <div className="nf-modal-footer">
          <button className="nf-modal-btn-close" onClick={onClose}>Close</button>
          {notif.route && (
            <button className="nf-modal-btn-go" onClick={() => { onClose(); onNavigate(notif.route); }}>
              {notif.actionLabel || "View Details"} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const STORAGE_KEY = "leaf_read_notifs";
function getReadIds() { try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { return new Set(); } }
function saveReadIds(ids) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids])); } catch {} }

export default function Notifications() {
  const ctx      = useOutletContext() || {};
  const { setNotif } = ctx;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isUser = user?.role === 'user'; // ── not yet official member

  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("All");
  const [selected, setSelected] = useState(null);
  const [readIds,  setReadIds]  = useState(getReadIds);

  useEffect(() => {
    const build = async () => {
      setLoading(true);
      try {
        const built = [];

        // Membership status — use online app API for user role
        try {
          const app = isUser ? await getMyOnlineAppAPI() : await getMyApplicationAPI();
          if (app?.application_status === "Approved") {
            built.push({ id:"membership-approved", type:"membership",
              title:"Membership Application Approved!",
              msg:`Congratulations! Your membership application (${app.app_id}) has been approved. Please visit the LEAF MPC office to complete the process and become an official member.`,
              time:timeAgo(app.reviewed_at||app.created_at), date:app.reviewed_at||app.created_at,
              read:false, route:"/member/profile", actionLabel:"View Profile" });
          } else if (app?.application_status === "Rejected") {
            built.push({ id:"membership-rejected", type:"rejected",
              title:"Membership Application Not Approved",
              msg:`Your membership application (${app.app_id}) was not approved.${app.reject_reason?" Reason: "+app.reject_reason:""} You may re-apply or visit the office for more information.`,
              time:timeAgo(app.reviewed_at||app.created_at), date:app.reviewed_at||app.created_at,
              read:false, route:"/member/apply-membership", actionLabel:"Re-apply" });
          } else if (app?.application_status === "Pending") {
            built.push({ id:"membership-pending", type:"system",
              title:"Membership Application Under Review",
              msg:`Your application (${app.app_id}) has been submitted and is currently under review. You will be notified once it has been processed.`,
              time:timeAgo(app.created_at), date:app.created_at, read:true, route:null });
          }
        } catch {}

        // ── Announcements — always fetch ──
        try {
          const anns = await getAnnouncementsAPI();
          anns.forEach(a => built.push({
            id:`ann-${a.id}`, type:"notice", title:a.title,
            msg:a.body || a.caption || a.content || "No content available.",
            time:timeAgo(a.created_at||a.posted_at), date:a.created_at||a.posted_at,
            read:false, route:"/member/announcements", actionLabel:"View Announcement",
          }));
        } catch(e) { console.error("Announcements fetch error:", e); }

        // ── Skip loans for non-official members (role='user') ──
        const loans = isUser ? [] : await getLoansAPI().catch(() => []);
        loans.filter(l => l.status==="Overdue").forEach(l => built.push({
          id:`overdue-${l.id}`, type:"overdue",
          title:`Overdue Payment — ${l.loan_id}`,
          msg:`Your ${l.loan_type} loan (${l.loan_id}) is overdue. Please settle your balance of ₱${Number(l.balance).toLocaleString()} immediately to avoid penalties.`,
          time:timeAgo(l.next_due_date), date:l.next_due_date,
          read:false, route:"/member/my-loans", actionLabel:"View My Loans",
        }));
        loans.filter(l => l.status==="Active").forEach(l => built.push({
          id:`due-${l.id}`, type:"due",
          title:`Payment Reminder — ${l.loan_id}`,
          msg:`Your monthly payment of ₱${Number(l.monthly_due).toLocaleString()} for your ${l.loan_type} (${l.loan_id}) is due on ${l.next_due_date||"—"}. Please pay on time to avoid penalties.`,
          time:timeAgo(l.next_due_date), date:l.next_due_date,
          read:false, route:"/member/my-loans", actionLabel:"View My Loans",
        }));
        loans.filter(l => l.status==="Active").forEach(l => built.push({
          id:`approved-${l.id}`, type:"approved",
          title:`Loan Approved — ${l.loan_id}`,
          msg:`Your ${l.loan_type} application for ₱${Number(l.amount).toLocaleString()} has been approved and activated. Visit the office to sign the necessary documents.`,
          time:timeAgo(l.approved_at), date:l.approved_at,
          read:true, route:"/member/my-loans", actionLabel:"View Loan Details",
        }));

        // ── Sort: unread first, then by date ──
        built.sort((a,b) => {
          if (!a.read && b.read) return -1;
          if (a.read && !b.read) return 1;
          return new Date(b.date||0) - new Date(a.date||0);
        });
        const currentReadIds = getReadIds();
        const withRead = built.map(n => ({ ...n, read: n.read || currentReadIds.has(n.id) }));
        setNotifs(withRead);
        if (setNotif) setNotif(withRead.filter(n => !n.read).length);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    build();
  }, [isUser]);

  const unreadCount = notifs.filter(n => !n.read).length;

  const markAllRead = () => {
    const allIds = new Set(notifs.map(n => n.id));
    saveReadIds(allIds);
    setReadIds(allIds);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    if (setNotif) setNotif(0);
  };

  const handleClick = (notif) => {
    const newReadIds = new Set([...readIds, notif.id]);
    saveReadIds(newReadIds);
    setReadIds(newReadIds);
    setNotifs(prev => prev.map(n => n.id===notif.id ? { ...n, read:true } : n));
    if (setNotif) setNotif(notifs.filter(n => !n.read && n.id!==notif.id).length);
    setSelected({ ...notif, read:true });
  };

  const filtered = notifs.filter(n => {
    if (filter==="All")         return true;
    if (filter==="Unread")      return !n.read;
    if (filter==="Payment Due") return n.type==="due"||n.type==="overdue";
    if (filter==="Notice")      return n.type==="notice";
    if (filter==="Membership")  return n.type==="membership"||n.type==="rejected";
    if (filter==="System")      return n.type==="system"||n.type==="approved";
    return true;
  });

  return (
    <div className="nf-wrapper">
      {selected && <NotifModal notif={selected} onClose={() => setSelected(null)} onNavigate={navigate}/>}

      <div className="nf-page-header">
        <div>
          <div className="nf-page-title">Notifications</div>
          <div className="nf-page-sub">Stay updated on payments, announcements, and loan status.</div>
        </div>
        {unreadCount > 0 && (
          <button className="nf-mark-all-btn" onClick={markAllRead}>
            <CheckCircle2 size={13}/> Mark all as read
          </button>
        )}
      </div>

      <div className="nf-summary-row">
        <div className="nf-chip total">  <span>{notifs.length}</span> Total</div>
        <div className="nf-chip unread"> <span>{unreadCount}</span> Unread</div>
        <div className="nf-chip due">    <span>{notifs.filter(n=>n.type==="due"||n.type==="overdue").length}</span> Payment Due</div>
        <div className="nf-chip notice"> <span>{notifs.filter(n=>n.type==="notice").length}</span> Notices</div>
      </div>

      <div className="nf-filter-tabs">
        {FILTERS.map(f => (
          <button key={f} className={`nf-filter-tab ${filter===f?"active":""}`} onClick={() => setFilter(f)}>
            {f}
            {f==="Unread" && unreadCount>0 && <span className="nf-filter-count">{unreadCount}</span>}
          </button>
        ))}
      </div>

      <div className="nf-card">
        {loading ? (
          <div className="nf-empty">
            <div className="nf-empty-icon"><Clock size={36} color="#ccc"/></div>
            <div className="nf-empty-text">Loading notifications...</div>
          </div>
        ) : filtered.length===0 ? (
          <div className="nf-empty">
            <div className="nf-empty-icon"><Bell size={36} color="#ccc"/></div>
            <div className="nf-empty-text">No notifications</div>
          </div>
        ) : filtered.map(n => {
          const meta = TYPE_META[n.type] || TYPE_META.system;
          return (
            <div key={n.id} className={`nf-item ${!n.read?"unread":""}`} onClick={() => handleClick(n)}>
              <div className="nf-icon-wrap" style={{ background: meta.bg, borderRadius: 10, width: 40, height: 40, minWidth: 40, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {meta.icon}
              </div>
              <div className="nf-body">
                <div className="nf-item-header">
                  <div className="nf-item-title">{n.title}</div>
                  <div className="nf-item-time">{n.time}</div>
                </div>
                <div className="nf-item-preview">
                  {n.msg.length > 80 ? n.msg.slice(0,80)+"..." : n.msg}
                </div>
                {n.route && (
                  <div className="nf-item-action" style={{ color: meta.text }}>
                    {n.actionLabel} →
                  </div>
                )}
              </div>
              {!n.read && <div className="nf-unread-dot"/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}