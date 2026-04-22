import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Notifications.css";

const INITIAL_NOTIFS = [
  { id:1,  type:"due",      title:"Payment Reminder",            msg:"Your monthly payment of ₱1,200 is due on April 1, 2026. Please pay on time to avoid penalties.",  time:"2 days ago",  date:"2026-03-19", read:false },
  { id:2,  type:"notice",   title:"Collection Schedule — March", msg:"Collection days for March 2026: 3, 7, 10, 14, 17, 20, 24, and 28. Please visit the office.",         time:"3 days ago",  date:"2026-03-18", read:false },
  { id:3,  type:"approved", title:"Loan Application Approved",   msg:"Your loan application LN-2026-004 (Salary Loan ₱12,000) has been approved. Visit the office to sign documents and claim your funds.", time:"1 week ago", date:"2026-03-14", read:true },
  { id:4,  type:"system",   title:"Account Activated",           msg:"Your LEAF MPC membership has been approved by the admin. Welcome to the cooperative!",                time:"2 weeks ago", date:"2026-03-07", read:true },
  { id:5,  type:"notice",   title:"Annual Assembly — March 15",  msg:"You are invited to the Annual General Assembly on March 15, 2026, 9:00 AM at Lucena City Hall.",     time:"3 weeks ago", date:"2026-02-28", read:true },
  { id:6,  type:"due",      title:"Payment Reminder — February", msg:"Your monthly payment of ₱1,200 was due on February 15. Please settle your balance.",                  time:"1 month ago", date:"2026-02-13", read:true },
];

const TYPE_META = {
  due:      { icon:"📅", color:"notif-due",      label:"Payment Due" },
  notice:   { icon:"📢", color:"notif-notice",   label:"Notice"      },
  approved: { icon:"✅", color:"notif-approved",  label:"Approved"    },
  system:   { icon:"⚙",  color:"notif-system",   label:"System"      },
};

const FILTERS = ["All","Unread","Payment Due","Notice","System"];

export default function Notifications() {
  const ctx = useOutletContext() || {};
  const { setNotif } = ctx;
  const [notifs,    setNotifs]   = useState(INITIAL_NOTIFS);
  const [filter,    setFilter]   = useState("All");
  const [expanded,  setExpanded] = useState(null);

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
          <button className="nf-mark-all-btn" onClick={markAllRead}>
            ✓ Mark all as read
          </button>
        )}
      </div>

      {/* Summary chips */}
      <div className="nf-summary-row">
        <div className="nf-chip total"><span>{notifs.length}</span> Total</div>
        <div className="nf-chip unread"><span>{unreadCount}</span> Unread</div>
        <div className="nf-chip due"><span>{notifs.filter(n=>n.type==="due").length}</span> Payment Due</div>
        <div className="nf-chip notice"><span>{notifs.filter(n=>n.type==="notice").length}</span> Notices</div>
      </div>

      {/* Filter tabs */}
      <div className="nf-filter-tabs">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`nf-filter-tab ${filter===f?"active":""}`}
            onClick={() => setFilter(f)}
          >
            {f}
            {f==="Unread" && unreadCount > 0 && (
              <span className="nf-filter-count">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div className="nf-card">
        {filtered.length === 0 ? (
          <div className="nf-empty">
            <div className="nf-empty-icon">🔔</div>
            <div className="nf-empty-text">No notifications</div>
          </div>
        ) : filtered.map(n => {
          const meta = TYPE_META[n.type] || TYPE_META.system;
          return (
            <div
              key={n.id}
              className={`nf-item ${!n.read ? "unread" : ""} ${expanded===n.id?"expanded":""}`}
              onClick={() => { setExpanded(expanded===n.id?null:n.id); markRead(n.id); }}
            >
              <div className={`nf-icon-wrap ${meta.color}`}>{meta.icon}</div>
              <div className="nf-body">
                <div className="nf-item-header">
                  <div className="nf-item-title">{n.title}</div>
                  <div className="nf-item-time">{n.time}</div>
                </div>
                <div className={`nf-item-msg ${expanded===n.id?"show":""}`}>{n.msg}</div>
                {expanded !== n.id && (
                  <div className="nf-item-preview">{n.msg.slice(0,70)}...</div>
                )}
              </div>
              {!n.read && <div className="nf-unread-dot" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}