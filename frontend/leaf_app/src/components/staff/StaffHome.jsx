import { useState, useEffect } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  CreditCard, FileText, ClipboardCheck,
  Users, Megaphone, BarChart2,
} from "lucide-react";
import { getOverviewAPI, getMonthlyCollectionAPI, getLoanStatusAPI, getLoanTypeAPI } from "../../api/reports";
import { getApplicationsAPI } from "../../api/members";
import { getDueDatesAPI, getLoansAPI } from "../../api/loans";
import { getActivityLogAPI } from "../../api/activity";
import { getPaymentStatsAPI } from "../../api/payments";
import "./StaffHome.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const ACTIVITY_DOT_COLORS = { payment:"#4caf50", application:"#1565c0", pending:"#f57c00", register:"#4caf50", declined:"#e53935" };

const STAFF_ROLE_LABELS = {
  cashier:     "Cashier",
  collector:   "Collector",
  bookkeeper:  "Bookkeeper",
  admin_clerk: "Administrative Clerk",
};

const QUICK_ACTIONS_BY_ROLE = {
  cashier: [
    { label: "Record F2F Payment",    icon: <CreditCard size={16} />,      path: "/staff/loan-payment", color: "qa-green"  },
  ],
  collector: [
    { label: "Record F2F Payment",    icon: <CreditCard size={16} />,      path: "/staff/loan-payment", color: "qa-green"  },
  ],
  bookkeeper: [
    { label: "View Reports",          icon: <BarChart2 size={16} />,        path: "/staff/reports",      color: "qa-blue"   },
  ],
  admin_clerk: [
    { label: "Review Applications",   icon: <FileText size={16} />,         path: "/staff/applications",  color: "qa-blue"   },
    { label: "Process Loan Approval", icon: <ClipboardCheck size={16} />,   path: "/staff/loan-approval", color: "qa-teal"   },
    { label: "Manage Members",        icon: <Users size={16} />,            path: "/staff/members",       color: "qa-purple" },
    { label: "Post Announcement",     icon: <Megaphone size={16} />,        path: "/staff/announcement",  color: "qa-orange" },
    { label: "View Reports",          icon: <BarChart2 size={16} />,        path: "/staff/reports",       color: "qa-teal"   },
  ],
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
      <div className="stat-icon">{icon}</div>
    </div>
  );
}

// ─── Due Date Modal ───────────────────────────────────────────────────────────
function DueDateModal({ date, members, onClose }) {
  if (!date) return null;
  const formatted = new Date(date + "T00:00:00").toLocaleDateString("en-PH", {
    weekday:"long", year:"numeric", month:"long", day:"numeric"
  });
  return (
    <div className="cal-modal-overlay" onClick={onClose}>
      <div className="cal-modal-box" onClick={e => e.stopPropagation()}>
        <div className="cal-modal-header">
          <div>
            <div className="cal-modal-title">📅 Collection Due</div>
            <div className="cal-modal-sub">{formatted}</div>
          </div>
          <button className="cal-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cal-modal-body">
          {members.length === 0 ? (
            <div className="cal-modal-empty">No members due on this date.</div>
          ) : (
            <div className="cal-due-list">
              {members.map((m, i) => (
                <div key={i} className={`cal-due-item ${m.status === "Overdue" ? "overdue" : ""}`}>
                  <div className="cal-due-avatar">{(m.member_name || "M")[0]}</div>
                  <div className="cal-due-info">
                    <div className="cal-due-name">{m.member_name}</div>
                    <div className="cal-due-meta">{m.member_id} · {m.loan_type}</div>
                  </div>
                  <div className="cal-due-amount">
                    <div className="cal-due-monthly">₱{Number(m.monthly_due).toLocaleString()}</div>
                    <div className="cal-due-label">monthly due</div>
                    {m.status === "Overdue" && <div className="cal-overdue-tag">OVERDUE</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="cal-modal-footer">
          <div className="cal-modal-total">
            Total: <strong>₱{members.reduce((s, m) => s + Number(m.monthly_due), 0).toLocaleString()}</strong> from <strong>{members.length}</strong> member{members.length !== 1 ? "s" : ""}
          </div>
          <button className="cal-modal-done" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Collection Calendar ──────────────────────────────────────────────────────
function CollectionCalendar() {
  const today = new Date();
  const [year,     setYear]     = useState(today.getFullYear());
  const [month,    setMonth]    = useState(today.getMonth());
  const [dueDates, setDueDates] = useState({});
  const [selDate,  setSelDate]  = useState(null);
  const [loading,  setLoading]  = useState(false);

  const firstDay      = new Date(year, month, 1).getDay();
  const totalDays     = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  useEffect(() => {
    setLoading(true);
    const mm = String(month + 1).padStart(2, "0");
    getDueDatesAPI(`${year}-${mm}`)
      .then(data => setDueDates(data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [year, month]);

  const handleDayClick = (d) => {
    const mm  = String(month + 1).padStart(2, "0");
    const dd  = String(d).padStart(2, "0");
    const key = `${year}-${mm}-${dd}`;
    if (dueDates[key]?.length > 0) setSelDate(key);
  };

  return (
    <>
      {selDate && (
        <DueDateModal
          date={selDate}
          members={dueDates[selDate] || []}
          onClose={() => setSelDate(null)}
        />
      )}
      <div className="chart-card">
        <div className="card-header">
          <div>
            <div className="card-title">Collection Calendar</div>
            <div className="card-sub">{MONTHS[month]} {year}</div>
          </div>
          <div className="legend">
            <div className="legend-item"><div className="legend-dot" style={{ background:"#2e7d32" }}/>Today</div>
            <div className="legend-item"><div className="legend-dot" style={{ background:"#c8e6c9" }}/>Due Date</div>
          </div>
        </div>
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={prev}>◀</button>
          <span className="cal-month-label">{MONTHS[month]} {year}</span>
          <button className="cal-nav-btn" onClick={next}>▶</button>
        </div>
        <div className="cal-grid">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="cal-day-label">{d}</div>
          ))}
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`prev-${i}`} className="cal-day other-month">
              {prevMonthDays - firstDay + 1 + i}
            </div>
          ))}
          {Array.from({ length: totalDays }, (_, i) => {
            const d   = i + 1;
            const mm  = String(month + 1).padStart(2, "0");
            const dd  = String(d).padStart(2, "0");
            const key = `${year}-${mm}-${dd}`;
            const isToday    = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const hasDue     = dueDates[key]?.length > 0;
            const hasOverdue = dueDates[key]?.some(m => m.status === "Overdue");
            let cls = "cal-day";
            if (isToday)         cls += " today";
            else if (hasOverdue) cls += " has-overdue";
            else if (hasDue)     cls += " has-event clickable";
            if (hasDue && !isToday) cls += " clickable";
            return (
              <div
                key={d}
                className={cls}
                onClick={() => handleDayClick(d)}
                title={hasDue ? `${dueDates[key].length} member(s) due` : ""}
                style={{ position:"relative" }}
              >
                {d}
                {hasDue && <span className="cal-due-dot">{dueDates[key].length}</span>}
              </div>
            );
          })}
        </div>
        {loading && (
          <div style={{ textAlign:"center", fontSize:11, color:"#aaa", padding:"4px 0" }}>
            Loading due dates...
          </div>
        )}
      </div>
    </>
  );
}

// ─── Activity Log ─────────────────────────────────────────────────────────────
function ActivityLog({ log }) {
  return (
    <div className="chart-card">
      <div className="card-header">
        <div>
          <div className="card-title">Recent Activity Log</div>
          <div className="card-sub">Latest system events</div>
        </div>
      </div>
      <div className="activity-list">
        {log.length === 0 ? (
          <div style={{ textAlign:"center", color:"#aaa", padding:"20px 0", fontSize:13 }}>
            No recent activity yet.
          </div>
        ) : log.map((item, i) => (
          <div key={i} className="activity-item">
            <div className="activity-dot" style={{ background: ACTIVITY_DOT_COLORS[item.type] || "#aaa" }}/>
            <div>
              <div className="activity-text">{item.text}</div>
              <div className="activity-time">{item.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main StaffHome ───────────────────────────────────────────────────────────
export default function StaffHome() {
  const navigate      = useNavigate();
  const { user }      = useAuth();
  const staffRole     = user?.staff_role ?? "";
  const roleLabel     = STAFF_ROLE_LABELS[staffRole] ?? "Staff";
  const quickActions  = QUICK_ACTIONS_BY_ROLE[staffRole] ?? [];

  const [greeting, setGreeting] = useState("");
  const [dateStr,  setDateStr]  = useState("");
  const [stats,    setStats]    = useState({ totalCollection:0, activeMembers:0, pendingLoanApprovals:0, activeLoans:0, overdueLoans:0, onlineApplicants:0 });
  const [monthly,  setMonthly]  = useState([]);
  const [loanStat, setLoanStat] = useState({});
  const [loanType, setLoanType] = useState({});
  const [actLog,   setActLog]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  // ── Clock ──
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

  // ── Fetch Data ──
  useEffect(() => {
    const load = async () => {
      try {
        const [overview, mon, ls, lt, apps, activity, allLoans, payStats] = await Promise.allSettled([
          getOverviewAPI(),
          getMonthlyCollectionAPI(),
          getLoanStatusAPI(),
          getLoanTypeAPI(),
          getApplicationsAPI(),
          getActivityLogAPI(7),
          getLoansAPI(),
          getPaymentStatsAPI(),
        ]);

        const activeLoans  = allLoans.status === "fulfilled" ? allLoans.value.filter(l => l.status === "Active")  : [];
        const overdueLoans = allLoans.status === "fulfilled" ? allLoans.value.filter(l => l.status === "Overdue") : [];
        const pendingLoans = allLoans.status === "fulfilled" ? allLoans.value.filter(l => l.status === "Pending") : [];
        const pendingApps  = apps.status     === "fulfilled" ? apps.value.filter(a => a.status === "Pending")     : [];

        const todayStr = new Date().toISOString().split("T")[0];
        let todayTotal = 0;
        if (payStats.status === "fulfilled") {
          const todayEntry = (payStats.value.payments_by_date || []).find(p => p.date === todayStr);
          todayTotal = todayEntry ? Number(todayEntry.total) : 0;
        }

        let activeMembers = 0;
        if (overview.status === "fulfilled") activeMembers = overview.value.active_members || 0;

        setStats({
          totalCollection:      todayTotal,
          activeMembers,
          pendingLoanApprovals: pendingLoans.length,
          activeLoans:          activeLoans.length,
          overdueLoans:         overdueLoans.length,
          onlineApplicants:     pendingApps.length,
        });

        if (mon.status === "fulfilled") setMonthly(mon.value);
        if (ls.status  === "fulfilled") setLoanStat(ls.value);

        if (allLoans.status === "fulfilled") {
          const breakdown = {};
          activeLoans.forEach(l => {
            const t = l.loan_type || "Other";
            breakdown[t] = (breakdown[t] || 0) + 1;
          });
          if (Object.keys(breakdown).length > 0) setLoanType(breakdown);
          else if (lt.status === "fulfilled")     setLoanType(lt.value);
        }

        if (activity.status === "fulfilled") setActLog(activity.value);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Chart Data ──
  const monthLabels = monthly.map(m => m.month);
  const monthValues = monthly.map(m => m.total);

  const lineData = {
    labels: monthLabels.length ? monthLabels : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    datasets: [{
      label: "Collection",
      data: monthValues.length ? monthValues : Array(12).fill(0),
      borderColor: "#2e7d32", backgroundColor: "rgba(46,125,50,0.08)",
      fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: "#2e7d32", borderWidth: 2,
    }],
  };

  const barLabels = Object.keys(loanStat);
  const barData = {
    labels: barLabels.length ? barLabels : ["Approved","Pending","Declined","Active","Completed"],
    datasets: [{
      data: barLabels.length ? Object.values(loanStat) : [0,0,0,0,0],
      backgroundColor: ["#2e7d32","#f57c00","#e53935","#1565c0","#a5d6a7"],
      borderRadius: 5, borderSkipped: false,
    }],
  };

  const donutLabels = Object.keys(loanType);
  const doughnutData = {
    labels: donutLabels.length ? donutLabels : ["Regular Loan","Emergency","Salary","Housing","Business"],
    datasets: [{
      data: donutLabels.length ? Object.values(loanType) : [0,0,0,0,0],
      backgroundColor: ["#2e7d32","#4caf50","#f57c00","#1565c0","#a5d6a7"],
      borderWidth: 0, hoverOffset: 4,
    }],
  };

  const lineOptions     = { responsive:true, plugins:{ legend:{display:false}, tooltip:{mode:"index",intersect:false} }, scales:{ x:{grid:{display:false}}, y:{grid:{color:"#f0f4f1"}, ticks:{callback:v=>"₱"+v.toLocaleString()}} } };
  const barOptions      = { responsive:true, plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false}}, y:{grid:{color:"#f0f4f1"}} } };
  const doughnutOptions = { responsive:true, cutout:"68%", plugins:{ legend:{position:"bottom",labels:{boxWidth:8,padding:8,font:{size:10}}} } };

  // ── Role-based stat cards ──
  const getStatCards = () => {
    if (staffRole === "cashier" || staffRole === "collector") return [
      { label:"Today's Collections", value: loading ? "..." : `₱${stats.totalCollection.toLocaleString()}`, icon:"💰" },
      { label:"Active Loans",        value: loading ? "..." : stats.activeLoans,                            icon:"📋" },
      { label:"Overdue Loans",       value: loading ? "..." : stats.overdueLoans,                           icon:"⚠️" },
    ];
    if (staffRole === "bookkeeper") return [
      { label:"Today's Collections", value: loading ? "..." : `₱${stats.totalCollection.toLocaleString()}`, icon:"💰" },
      { label:"Active Members",      value: loading ? "..." : stats.activeMembers,                          icon:"👤" },
      { label:"Active Loans",        value: loading ? "..." : stats.activeLoans,                            icon:"📋" },
    ];
    return [
      { label:"Pending Loan Approvals", value: loading ? "..." : stats.pendingLoanApprovals, icon:"⏳" },
      { label:"Online Applicants",      value: loading ? "..." : stats.onlineApplicants,     icon:"🌐" },
      { label:"Active Members",         value: loading ? "..." : stats.activeMembers,         icon:"👤" },
      { label:"Overdue Loans",          value: loading ? "..." : stats.overdueLoans,          icon:"⚠️" },
    ];
  };

  return (
    <div className="dashboard-content">

      {/* ── Welcome Banner ── */}
      <div className="sh-banner">
        <div className="sh-banner-left">
          <div className="sh-welcome">{greeting}, {user?.name ?? "Staff"}! 👋</div>
          <div className="sh-date">{dateStr}</div>
          <div className="sh-tagline">Here's what needs your attention today.</div>
        </div>
        <div className="sh-banner-badge">
          <div className="sh-badge-avatar">
            {user?.name?.charAt(0)?.toUpperCase() ?? "S"}
          </div>
          <div>
            <div className="sh-badge-name">{user?.name ?? "Staff"}</div>
            <div className="sh-badge-role">{roleLabel} · Leaf MPC</div>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      {quickActions.length > 0 && (
        <div className="sh-actions-wrap">
          <div className="sh-section-title">Quick Actions</div>
          <div className="sh-actions-grid">
            {quickActions.map((a, i) => (
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
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="stat-grid">
        {getStatCards().map((s, i) => (
          <StatCard key={i} label={s.label} value={s.value} icon={s.icon} />
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="chart-row">
        <div className="chart-card">
          <div className="card-header">
            <div>
              <div className="card-title">Overall Collection</div>
              <div className="card-sub">Monthly collection trend</div>
            </div>
            <div className="legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background:"#2e7d32" }}/>Collection
              </div>
            </div>
          </div>
          <div style={{ height:220 }}>
            <Line data={lineData} options={{ ...lineOptions, maintainAspectRatio:false }}/>
          </div>
        </div>
        <div className="chart-card">
          <div className="card-header">
            <div>
              <div className="card-title">Loan Status Summary</div>
              <div className="card-sub">Current distribution</div>
            </div>
          </div>
          <div style={{ height:220 }}>
            <Bar data={barData} options={{ ...barOptions, maintainAspectRatio:false }}/>
          </div>
        </div>
      </div>

      {/* ── Calendar + Activity + Donut ── */}
      <div className="bottom-row">
        <CollectionCalendar />
        <ActivityLog log={actLog} />
        <div className="chart-card">
          <div className="card-header">
            <div>
              <div className="card-title">Loan Type Breakdown</div>
              <div className="card-sub">By category</div>
            </div>
          </div>
          <div style={{ height:220, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Doughnut data={doughnutData} options={{ ...doughnutOptions, maintainAspectRatio:false }}/>
          </div>
        </div>
      </div>

    </div>
  );
}