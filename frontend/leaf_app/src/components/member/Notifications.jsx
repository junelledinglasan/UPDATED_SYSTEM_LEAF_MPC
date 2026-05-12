import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { getAnnouncementsAPI } from "../../api/announcements";
import { getLoansAPI } from "../../api/loans";
import "./Notifications.css";

const TYPE_META = {
  due:      { icon:"📅", color:"notif-due",      label:"Payment Due" },
  notice:   { icon:"📢", color:"notif-notice",   label:"Notice"      },
  approved: { icon:"✅", color:"notif-approved", label:"Approved"    },
  system:   { icon:"⚙",  color:"notif-system",   label:"System"      },
};

const FILTERS = ["All","Unread","Payment Due","Notice","System"];

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins} minute${mins!==1?"s":""} ago`;
  if (hrs  < 24)  return `${hrs} hour${hrs!==1?"s":""} ago`;
  if (days < 7)   return `${days} day${days!==1?"s":""} ago`;
  return new Date(dateStr).toLocaleDateString("en-PH", { month:"short", day:"numeric" });
}

export default function Notifications() {
  const ctx = useOutletContext() || {};
  const { setNotif } = ctx;

  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("All");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const build = async () => {
      setLoading(true);
      try {
        const built = [];

        // ── Announcements → Notice notifications ─────────────────────────
        const anns = await getAnnouncementsAPI().catch(() => []);
        anns.forEach(a => {
          built.push({
            id:    `ann-${a.id}`,
            type:  "notice",
            title: a.title,
            msg:   a.content || a.caption || "",
            time:  timeAgo(a.created_at || a.posted_at),
            date:  a.created_at || a.posted_at,
            read:  false,
          });
        });

        // ── Active loans → Payment Due notifications ──────────────────────
        const loans = await getLoansAPI().catch(() => []);
        loans.filter(l => l.status === "Active" || l.status === "Overdue").forEach(l => {
          built.push({
            id:    `loan-${l.id}`,
            type:  l.status === "Overdue" ? "due" : "due",
            title: l.status === "Overdue"
              ? `⚠ Overdue Payment — ${l.loan_id}`
              : `Payment Reminder — ${l.loan_id}`,
            msg:   l.status === "Overdue"
              ? `Your loan ${l.loan_id} (${l.loan_type}) is overdue. Please settle your balance of ₱${Number(l.balance).toLocaleString()} immediately.`
              : `Your monthly payment of ₱${Number(l.monthly_due).toLocaleString()} is due on ${l.next_due_date || "—"}. Please pay on time.`,
            time:  l.next_due_date ? timeAgo(l.next_due_date) : "",
            date:  l.next_due_date,
            read:  false,
          });
        });

        // ── Approved/Active loans → Approved notifications ────────────────
        loans.filter(l => l.status === "Active").forEach(l => {
          built.push({
            id:    `approved-${l.id}`,
            type:  "approved",
            title: `Loan Approved — ${l.loan_id}`,
            msg:   `Your ${l.loan_type} application for ₱${Number(l.amount).toLocaleString()} has been approved and activated. Visit the office to sign documents.`,
            time:  timeAgo(l.approved_at),
            date:  l.approved_at,
            read:  true,
          });
        });

        // Sort by date descending
        built.sort((a, b) => new Date(b.date||0) - new Date(a.date||0));
        setNotifs(built);

        // Update unread count in layout
        const unread = built.filter(n => !n.read).length;
        if (setNotif) setNotif(unread);

      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    build();
  }, []);

  const unreadCount = notifs.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    if (setNotif) setNotif(0);
  };

  const markRead = (id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const remaining = notifs.filter(n => !n.read && n.id !== id).length;
    if (setNotif) setNotif(remaining);
  };

  const filtered = notifs.filter(n => {
    if (filter === "All")         return true;
    if (filter === "Unread")      return !n.read;
    if (filter === "Payment Due") return n.type === "due";
    if (filter === "Notice")      return n.type === "notice";
    if (filter === "System")      return n.type === "system" || n.type === "approved";
    return true;
  });

  return (
    <div className="nf-wrapper">
      <div className="nf-page-header">
        <div>
          <div className="nf-page-title">Notifications</div>
          <div className="nf-page-sub">Stay updated on payments, announcements, and loan status.</div>
        </div>
        {unreadCount > 0 && (
          <button className="nf-mark-all-btn" onClick={markAllRead}>✓ Mark all as read</button>
        )}
      </div>

      <div className="nf-summary-row">
        <div className="nf-chip total"><span>{notifs.length}</span> Total</div>
        <div className="nf-chip unread"><span>{unreadCount}</span> Unread</div>
        <div className="nf-chip due"><span>{notifs.filter(n=>n.type==="due").length}</span> Payment Due</div>
        <div className="nf-chip notice"><span>{notifs.filter(n=>n.type==="notice").length}</span> Notices</div>
      </div>

      <div className="nf-filter-tabs">
        {FILTERS.map(f => (
          <button key={f} className={`nf-filter-tab ${filter===f?"active":""}`} onClick={() => setFilter(f)}>
            {f}
            {f==="Unread" && unreadCount > 0 && <span className="nf-filter-count">{unreadCount}</span>}
          </button>
        ))}
      </div>

      <div className="nf-card">
        {loading ? (
          <div className="nf-empty"><div className="nf-empty-icon">⏳</div><div className="nf-empty-text">Loading notifications...</div></div>
        ) : filtered.length === 0 ? (
          <div className="nf-empty"><div className="nf-empty-icon">🔔</div><div className="nf-empty-text">No notifications</div></div>
        ) : filtered.map(n => {
          const meta = TYPE_META[n.type] || TYPE_META.system;
          return (
            <div key={n.id}
              className={`nf-item ${!n.read?"unread":""} ${expanded===n.id?"expanded":""}`}
              onClick={() => { setExpanded(expanded===n.id?null:n.id); markRead(n.id); }}
            >
              <div className={`nf-icon-wrap ${meta.color}`}>{meta.icon}</div>
              <div className="nf-body">
                <div className="nf-item-header">
                  <div className="nf-item-title">{n.title}</div>
                  <div className="nf-item-time">{n.time}</div>
                </div>
                {expanded === n.id
                  ? <div className="nf-item-msg show">{n.msg}</div>
                  : <div className="nf-item-preview">{n.msg.slice(0,70)}...</div>
                }
              </div>
              {!n.read && <div className="nf-unread-dot"/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}