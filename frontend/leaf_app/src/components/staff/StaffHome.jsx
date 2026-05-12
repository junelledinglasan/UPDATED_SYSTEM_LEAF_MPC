import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./StaffHome.css";

// ─── Mock Data (palitan ng API calls later) ───────────────────────────────────
const TODAY_STATS = [
  { label: "Today's Collections",    value: "₱4,200", icon: "💰", sub: "3 payments recorded"       },
  { label: "Pending Loan Approvals", value: "6",      icon: "⏳", sub: "Needs review today"         },
  { label: "New Applications",       value: "2",      icon: "📋", sub: "Online applicants waiting"  },
  { label: "Overdue Loans",          value: "3",      icon: "⚠️", sub: "Past due date"              },
];

const QUICK_ACTIONS = [
  { label: "Record F2F Payment",    icon: "💸", path: "/staff/loan-payment",  color: "qa-green"  },
  { label: "Review Applications",   icon: "📋", path: "/staff/applications",  color: "qa-blue"   },
  { label: "Process Loan Approval", icon: "✅", path: "/staff/loan-approval", color: "qa-teal"   },
  { label: "Manage Members",        icon: "👥", path: "/staff/members",       color: "qa-purple" },
  { label: "Post Announcement",     icon: "📢", path: "/staff/announcement",  color: "qa-orange" },
];

const COLLECTION_DAYS = [3, 7, 10, 14, 17, 20, 24, 28];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const ACTIVITY_LOG = [
  { id:1, type:"payment",     text:"Member LEAF-100-32 made a payment of ₱100",           time:"Today, 3:56 PM"     },
  { id:2, type:"application", text:"New online application received from Juan Dela Cruz",  time:"Today, 2:41 PM"     },
  { id:3, type:"pending",     text:"Loan approval pending review — LEAF-098-11",           time:"Today, 1:15 PM"     },
  { id:4, type:"register",    text:"Member registered: Maria Santos (LEAF-101-05)",        time:"Today, 11:30 AM"    },
  { id:5, type:"declined",    text:"Loan declined: LEAF-095-22 — insufficient collateral", time:"Yesterday, 4:20 PM" },
  { id:6, type:"payment",     text:"F2F Payment recorded — ₱500 by LEAF-088-03",          time:"Yesterday, 3:05 PM" },
];

const ACTIVITY_COLORS = {
  payment:     "#4caf50",
  application: "#1565c0",
  pending:     "#f57c00",
  register:    "#4caf50",
  declined:    "#e53935",
};

// ─── Collection Calendar ──────────────────────────────────────────────────────
function CollectionCalendar() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay      = new Date(year, month, 1).getDay();
  const totalDays     = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  return (
    <div className="sh-card">
      <div className="sh-card-header">
        <div>
          <div className="sh-card-title">Collection Calendar</div>
          <div className="sh-card-sub">{MONTHS[month]} {year}</div>
        </div>
        <div className="sh-legend">
          <div className="sh-legend-item">
            <div className="sh-legend-dot" style={{ background:"#2e7d32" }} />Today
          </div>
          <div className="sh-legend-item">
            <div className="sh-legend-dot" style={{ background:"#c8e6c9" }} />Collection
          </div>
        </div>
      </div>

      <div className="sh-cal-nav">
        <button className="sh-cal-btn" onClick={prev}>◀</button>
        <span className="sh-cal-month">{MONTHS[month]} {year}</span>
        <button className="sh-cal-btn" onClick={next}>▶</button>
      </div>

      <div className="sh-cal-grid">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="sh-cal-label">{d}</div>
        ))}
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`p${i}`} className="sh-cal-day other-month">
            {prevMonthDays - firstDay + 1 + i}
          </div>
        ))}
        {Array.from({ length: totalDays }, (_, i) => {
          const d        = i + 1;
          const isToday  = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const hasEvent = COLLECTION_DAYS.includes(d);
          let cls = "sh-cal-day";
          if (isToday)        cls += " today";
          else if (hasEvent)  cls += " has-event";
          return <div key={d} className={cls}>{d}</div>;
        })}
      </div>
    </div>
  );
}

// ─── Main StaffHome ───────────────────────────────────────────────────────────
export default function StaffHome() {
  const navigate        = useNavigate();
  const [greeting,  setGreeting]  = useState("");
  const [dateStr,   setDateStr]   = useState("");

  useEffect(() => {
    const update = () => {
      const now  = new Date();
      const hour = now.getHours();
      const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const mons = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const pad  = n => String(n).padStart(2, "0");

      if      (hour < 12) setGreeting("Good morning");
      else if (hour < 18) setGreeting("Good afternoon");
      else                setGreeting("Good evening");

      setDateStr(`${days[now.getDay()]}, ${mons[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} — ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="sh-wrap">

      {/* ── Welcome Banner ── */}
      <div className="sh-banner">
        <div className="sh-banner-left">
          <div className="sh-welcome">{greeting}, Staff! 👋</div>
          <div className="sh-date">{dateStr}</div>
          <div className="sh-tagline">Here's what needs your attention today.</div>
        </div>
        <div className="sh-banner-badge">
          <div className="sh-badge-avatar">S</div>
          <div>
            <div className="sh-badge-name">Staff01</div>
            <div className="sh-badge-role">Staff · Leaf MPC</div>
          </div>
        </div>
      </div>

      {/* ── Today's Stats ── */}
      <div className="sh-stats-grid">
        {TODAY_STATS.map((s, i) => (
          <div key={i} className="sh-stat-card">
            <div className="sh-stat-top">
              <div className="sh-stat-icon">{s.icon}</div>
              <div className="sh-stat-value">{s.value}</div>
            </div>
            <div className="sh-stat-label">{s.label}</div>
            <div className="sh-stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div className="sh-section-title">Quick Actions</div>
      <div className="sh-actions-grid">
        {QUICK_ACTIONS.map((a, i) => (
          <button
            key={i}
            className={`sh-action-btn ${a.color}`}
            onClick={() => navigate(a.path)}
          >
            <span className="sh-action-icon">{a.icon}</span>
            <span className="sh-action-label">{a.label}</span>
          </button>
        ))}
      </div>

      {/* ── Calendar + Activity ── */}
      <div className="sh-bottom-row">
        <CollectionCalendar />

        <div className="sh-card">
          <div className="sh-card-header">
            <div>
              <div className="sh-card-title">Recent Activity</div>
              <div className="sh-card-sub">Latest system events</div>
            </div>
          </div>
          <div className="sh-activity-list">
            {ACTIVITY_LOG.map(item => (
              <div key={item.id} className="sh-activity-item">
                <div
                  className="sh-activity-dot"
                  style={{ background: ACTIVITY_COLORS[item.type] || "#aaa" }}
                />
                <div>
                  <div className="sh-activity-text">{item.text}</div>
                  <div className="sh-activity-time">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}