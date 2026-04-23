import { useState, useEffect } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

// ─── Lucide React Icons (real SVG icons, replaces emoji icons) ─────────────
// Make sure lucide-react is installed: npm install lucide-react
import { TrendingUp, Users, Clock, Globe } from "lucide-react";

import { getOverviewAPI, getMonthlyCollectionAPI, getLoanStatusAPI, getLoanTypeAPI, getAuditLogAPI } from "../../api/reports";
import { getMemberStatsAPI, getApplicationsAPI } from "../../api/members";
import { getActivityLogAPI } from "../../api/activity";
import "./Dashboard.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const COLLECTION_DAYS = [3, 7, 10, 14, 17, 20, 24, 28];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const ACTIVITY_DOT_COLORS = { payment:"#4caf50", application:"#1565c0", pending:"#f57c00", register:"#4caf50", declined:"#e53935" };

// ─── StatCard — now uses real Lucide icon components ──────────────────────
// The `icon` prop should be a JSX element, e.g. icon={<TrendingUp size={17} />}
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

function CollectionCalendar() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const firstDay      = new Date(year, month, 1).getDay();
  const totalDays     = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const prev = () => { if (month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const next = () => { if (month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return (
    <div className="chart-card">
      <div className="card-header">
        <div><div className="card-title">Collection Calendar</div><div className="card-sub">{MONTHS[month]} {year}</div></div>
        <div className="legend">
          <div className="legend-item"><div className="legend-dot" style={{background:"#2e7d32"}}/>Today</div>
          <div className="legend-item"><div className="legend-dot" style={{background:"#c8e6c9"}}/>Collection</div>
        </div>
      </div>
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prev}>◀</button>
        <span className="cal-month-label">{MONTHS[month]} {year}</span>
        <button className="cal-nav-btn" onClick={next}>▶</button>
      </div>
      <div className="cal-grid">
        {days.map(d=><div key={d} className="cal-day-label">{d}</div>)}
        {Array.from({length:firstDay},(_,i)=><div key={`prev-${i}`} className="cal-day other-month">{prevMonthDays-firstDay+1+i}</div>)}
        {Array.from({length:totalDays},(_,i)=>{
          const d=i+1;
          const isToday=d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
          const hasEvent=COLLECTION_DAYS.includes(d);
          let cls="cal-day";
          if(isToday)cls+=" today"; else if(hasEvent)cls+=" has-event";
          return <div key={d} className={cls}>{d}</div>;
        })}
      </div>
    </div>
  );
}

function ActivityLog({ log }) {
  return (
    <div className="chart-card">
      <div className="card-header">
        <div><div className="card-title">Recent Activity Log</div><div className="card-sub">Latest system events</div></div>
      </div>
      <div className="activity-list">
        {log.length === 0 ? (
          <div style={{textAlign:"center",color:"#aaa",padding:"20px 0",fontSize:13}}>No recent activity yet.</div>
        ) : log.map((item,i) => (
          <div key={i} className="activity-item">
            <div className="activity-dot" style={{background: ACTIVITY_DOT_COLORS[item.type]||"#aaa"}}/>
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

function BlockchainLedger({ data }) {
  return (
    <div className="ledger-card">
      <div className="ledger-title">
        🔗 Real-time Blockchain Ledger
        <span className="ledger-badge">AUDIT</span>
      </div>
      <table className="ledger-table">
        <thead>
          <tr><th>Date</th><th>Member</th><th>Amount</th><th>Hash (SHA-256)</th><th>Receipt</th></tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={5} style={{textAlign:"center",color:"rgba(255,255,255,0.4)",padding:"20px"}}>No transactions yet.</td></tr>
          ) : data.map((row,i) => (
            <tr key={i}>
              <td>{row.paid_at}</td>
              <td>{row.member_id}</td>
              <td className="amount-green">₱{Number(row.amount).toLocaleString()}</td>
              <td><span className="hash-text">{row.hash}</span></td>
              <td><button className="pdf-btn">PDF</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const [stats,    setStats]    = useState({ totalShareCapital:0, activeMembers:0, pendingLoanApprovals:0, onlineApplicants:0 });
  const [monthly,  setMonthly]  = useState([]);
  const [loanStat, setLoanStat] = useState({});
  const [loanType, setLoanType] = useState({});
  const [ledger,   setLedger]   = useState([]);
  const [actLog,   setActLog]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [overview, mon, ls, lt, audit, memberStats, apps, activity] = await Promise.allSettled([
          getOverviewAPI(), getMonthlyCollectionAPI(), getLoanStatusAPI(),
          getLoanTypeAPI(), getAuditLogAPI(), getMemberStatsAPI(), getApplicationsAPI(),
          getActivityLogAPI(7),
        ]);
        if (overview.status==="fulfilled") {
          const d = overview.value;
          setStats({
            totalShareCapital:    0,
            activeMembers:        d.active_members || 0,
            pendingLoanApprovals: d.pending_loans  || 0,
            onlineApplicants:     apps.status==="fulfilled" ? apps.value.filter(a=>a.status==="Pending").length : 0,
          });
        }
        if (mon.status==="fulfilled")      setMonthly(mon.value);
        if (ls.status==="fulfilled")       setLoanStat(ls.value);
        if (lt.status==="fulfilled")       setLoanType(lt.value);
        if (audit.status==="fulfilled")    setLedger(audit.value.slice(0,12));
        if (activity.status==="fulfilled") setActLog(activity.value);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Build chart data from real API
  const monthLabels  = monthly.map(m=>m.month);
  const monthValues  = monthly.map(m=>m.total);

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

  const lineOptions = { responsive:true, plugins:{ legend:{display:false}, tooltip:{mode:"index",intersect:false} }, scales:{ x:{grid:{display:false}}, y:{grid:{color:"#f0f4f1"}, ticks:{callback:v=>"₱"+v.toLocaleString()}} } };
  const barOptions  = { responsive:true, plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false}}, y:{grid:{color:"#f0f4f1"}} } };
  const doughnutOptions = { responsive:true, cutout:"68%", plugins:{ legend:{position:"bottom",labels:{boxWidth:8,padding:8,font:{size:10}}} } };

  // Build activity log from real API
  const activityLog = actLog.map(l => ({
    type: l.action_type,
    text: l.description,
    time: new Date(l.created_at).toLocaleString('en-PH', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }),
  }));

  return (
    <div className="dashboard-content">
      <div className="dash-page-header">
        <div className="dash-page-title">Office Operations Dashboard</div>
        <div className="dash-page-sub">Manage LEAF MPC member records and financial audit.</div>
      </div>
      <div className="stat-grid">
        {/* ── Lucide icons used below: TrendingUp, Users, Clock, Globe ──────────
            These are real SVG icons from the lucide-react package.
            size={17} controls icon size inside the stat-icon box.           */}
        <StatCard label="Total Share Capital"    value={`₱${stats.totalShareCapital.toLocaleString()}`} icon={<TrendingUp size={17} strokeWidth={2} />}/>
        <StatCard label="Active Members"         value={stats.activeMembers}                            icon={<Users size={17} strokeWidth={2} />}/>
        <StatCard label="Pending Loan Approvals" value={stats.pendingLoanApprovals}                     icon={<Clock size={17} strokeWidth={2} />}/>
        <StatCard label="Online Applicants"      value={stats.onlineApplicants}                         icon={<Globe size={17} strokeWidth={2} />}/>
      </div>

      <div className="chart-row">
        <div className="chart-card">
          <div className="card-header">
            <div><div className="card-title">Overall Collection</div><div className="card-sub">Monthly collection trend</div></div>
            <div className="legend"><div className="legend-item"><div className="legend-dot" style={{background:"#2e7d32"}}/>Collection</div></div>
          </div>
          <div style={{height:220}}><Line data={lineData} options={{...lineOptions, maintainAspectRatio:false}}/></div>
        </div>
        <div className="chart-card">
          <div className="card-header"><div><div className="card-title">Loan Status Summary</div><div className="card-sub">Current distribution</div></div></div>
          <div style={{height:220}}><Bar data={barData} options={{...barOptions, maintainAspectRatio:false}}/></div>
        </div>
      </div>

      <div className="bottom-row">
        <CollectionCalendar/>
        <ActivityLog log={activityLog}/>
        <div className="chart-card">
          <div className="card-header"><div><div className="card-title">Loan Type Breakdown</div><div className="card-sub">By category</div></div></div>
          <div style={{height:220,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Doughnut data={doughnutData} options={{...doughnutOptions, maintainAspectRatio:false}}/>
          </div>
        </div>
      </div>

      <BlockchainLedger data={ledger}/>
    </div>
  );
}

/*
════════════════════════════════════════════════════════════
  📌 HOW TO ADD YOUR LOGO IMAGE (leaFmpc)
════════════════════════════════════════════════════════════

  This Dashboard does NOT contain the sidebar/header —
  those are in a parent layout component (e.g. Layout.jsx
  or Sidebar.jsx). Find that file and follow these steps:

  STEP 1 — Save your logo file
  ─────────────────────────────
  Place your logo image inside:
    src/assets/logo.png     ← recommended location
  (PNG with transparent background works best)

  STEP 2 — Import it in your layout/sidebar file
  ──────────────────────────────────────────────
  At the top of the file add:

    import logo from "../../assets/logo.png";
    // Adjust the path depending on where your file is located

  STEP 3 — Render it where the logo currently appears
  ────────────────────────────────────────────────────
  Replace any existing text/placeholder logo with:

    <img
      src={logo}
      alt="LEAF MPC Logo"
      style={{ height: "40px", width: "auto", objectFit: "contain" }}
    />

  STEP 4 — Control the size
  ──────────────────────────
  Adjust height: "40px" to match your sidebar design.
  Use objectFit: "contain" so the logo never gets cropped.

  EXAMPLE (inside your Sidebar component):
  ─────────────────────────────────────────
    import logo from "../../assets/logo.png";

    function Sidebar() {
      return (
        <aside className="sidebar">
          <div className="sidebar-logo">
            <img src={logo} alt="LEAF MPC" style={{ height: "44px", width: "auto" }} />
          </div>
          ... rest of sidebar
        </aside>
      );
    }

════════════════════════════════════════════════════════════
*/