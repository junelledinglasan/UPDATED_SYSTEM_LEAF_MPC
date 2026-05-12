import { useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import "./Dashboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ─── Mock Data (replace with API calls later) ──────────────────────────────
const STAT_DATA = {
  totalShareCapital: 0,
  activeMembers: 0,
  pendingLoanApprovals: 0,
  onlineApplicants: 0,
};

const COLLECTION_DAYS = [3, 7, 10, 14, 17, 20, 24, 28];

const ACTIVITY_LOG = [
  { id: 1, type: "payment",     text: "Member LEAF-100-32 made a payment of ₱100",              time: "Today, 3:56 PM" },
  { id: 2, type: "application", text: "New online application received from Juan Dela Cruz",     time: "Today, 2:41 PM" },
  { id: 3, type: "pending",     text: "Loan approval pending review — LEAF-098-11",              time: "Today, 1:15 PM" },
  { id: 4, type: "register",    text: "Member registered: Maria Santos (LEAF-101-05)",           time: "Today, 11:30 AM" },
  { id: 5, type: "declined",    text: "Loan declined: LEAF-095-22 — insufficient collateral",    time: "Yesterday, 4:20 PM" },
  { id: 6, type: "payment",     text: "F2F Payment recorded — ₱500 by LEAF-088-03",             time: "Yesterday, 3:05 PM" },
  { id: 7, type: "application", text: "Announcement posted: March collection schedule",          time: "Mar 18, 9:00 AM" },
];

const LEDGER_DATA = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  date: "2025-3-14 15:56",
  member: "LEAF-100-32",
  amount: "₱100",
  hash: `ha4jbac28k${String(i).padStart(2,"0")}5eedr-j7`,
}));

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const ACTIVITY_DOT_COLORS = {
  payment:     "#4caf50",
  application: "#1565c0",
  pending:     "#f57c00",
  register:    "#4caf50",
  declined:    "#e53935",
};

// ─── Sub-components ────────────────────────────────────────────────────────

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
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay  = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div className="chart-card">
      <div className="card-header">
        <div>
          <div className="card-title">Collection Calendar</div>
          <div className="card-sub">{MONTHS[month]} {year}</div>
        </div>
        <div className="legend">
          <div className="legend-item"><div className="legend-dot" style={{ background: "#2e7d32" }} />Today</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: "#c8e6c9" }} />Collection</div>
        </div>
      </div>

      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prev}>◀</button>
        <span className="cal-month-label">{MONTHS[month]} {year}</span>
        <button className="cal-nav-btn" onClick={next}>▶</button>
      </div>

      <div className="cal-grid">
        {days.map(d => <div key={d} className="cal-day-label">{d}</div>)}

        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`prev-${i}`} className="cal-day other-month">
            {prevMonthDays - firstDay + 1 + i}
          </div>
        ))}

        {Array.from({ length: totalDays }, (_, i) => {
          const d = i + 1;
          const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const hasEvent = COLLECTION_DAYS.includes(d);
          let cls = "cal-day";
          if (isToday) cls += " today";
          else if (hasEvent) cls += " has-event";
          return <div key={d} className={cls}>{d}</div>;
        })}
      </div>
    </div>
  );
}

function ActivityLog() {
  return (
    <div className="chart-card">
      <div className="card-header">
        <div>
          <div className="card-title">Recent Activity Log</div>
          <div className="card-sub">Latest system events</div>
        </div>
      </div>
      <div className="activity-list">
        {ACTIVITY_LOG.map(item => (
          <div key={item.id} className="activity-item">
            <div className="activity-dot" style={{ background: ACTIVITY_DOT_COLORS[item.type] || "#aaa" }} />
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

function BlockchainLedger() {
  return (
    <div className="ledger-card">
      <div className="ledger-title">
        🔗 Real-time Blockchain Ledger
        <span className="ledger-badge">AUDIT</span>
      </div>
      <table className="ledger-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Member</th>
            <th>Amount</th>
            <th>Hash (SHA-256)</th>
            <th>Receipt</th>
          </tr>
        </thead>
        <tbody>
          {LEDGER_DATA.map(row => (
            <tr key={row.id}>
              <td>{row.date}</td>
              <td>{row.member}</td>
              <td className="amount-green">{row.amount}</td>
              <td><span className="hash-text">{row.hash}</span></td>
              <td><button className="pdf-btn">PDF</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────────

export default function Dashboard() {
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => {
      const now  = new Date();
      const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
      const mons = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
      const pad  = n => String(n).padStart(2, "0");
      setClock(`${days[now.getDay()]} ${mons[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} — ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Chart configs
  const lineData = {
    labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    datasets: [
      {
        label: "2025",
        data: [12000,18000,15000,22000,19000,25000,21000,28000,24000,30000,27000,32000],
        borderColor: "#2e7d32",
        backgroundColor: "rgba(46,125,50,0.08)",
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: "#2e7d32",
        borderWidth: 2,
      },
      {
        label: "2024",
        data: [8000,11000,10000,14000,13000,17000,15000,20000,18000,22000,20000,24000],
        borderColor: "#a5d6a7",
        backgroundColor: "transparent",
        fill: false,
        tension: 0.4,
        pointRadius: 2,
        borderDash: [4, 3],
        borderWidth: 1.5,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        grid: { color: "#f0f4f1" },
        ticks: { callback: v => "₱" + v.toLocaleString() },
      },
    },
  };

  const barData = {
    labels: ["Approved","Pending","Declined","Active","Completed"],
    datasets: [{
      data: [42, 15, 8, 35, 60],
      backgroundColor: ["#2e7d32","#f57c00","#e53935","#1565c0","#a5d6a7"],
      borderRadius: 5,
      borderSkipped: false,
    }],
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: "#f0f4f1" } },
    },
  };

  const doughnutData = {
    labels: ["Regular Loan","Emergency","Salary","Housing","Business"],
    datasets: [{
      data: [35, 20, 15, 18, 12],
      backgroundColor: ["#2e7d32","#4caf50","#f57c00","#1565c0","#a5d6a7"],
      borderWidth: 0,
      hoverOffset: 4,
    }],
  };

  const doughnutOptions = {
    responsive: true,
    cutout: "68%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { boxWidth: 8, padding: 8, font: { size: 10 } },
      },
    },
  };

  return (
    <div className="dashboard-content">

      {/* STAT CARDS */}
      <div className="stat-grid">
        <StatCard label="Total Share Capital"    value={`₱${STAT_DATA.totalShareCapital.toLocaleString()}`} icon="📈" />
        <StatCard label="Active Members"         value={STAT_DATA.activeMembers}                            icon="👤" />
        <StatCard label="Pending Loan Approvals" value={STAT_DATA.pendingLoanApprovals}                     icon="⏳" />
        <StatCard label="Online Applicants"      value={STAT_DATA.onlineApplicants}                         icon="🌐" />
      </div>

      {/* LINE + BAR CHARTS */}
      <div className="chart-row">
        <div className="chart-card">
          <div className="card-header">
            <div>
              <div className="card-title">Overall Collection</div>
              <div className="card-sub">Monthly collection trend</div>
            </div>
            <div className="legend">
              <div className="legend-item"><div className="legend-dot" style={{ background: "#2e7d32" }} />2025</div>
              <div className="legend-item"><div className="legend-dot" style={{ background: "#a5d6a7" }} />2024</div>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <Line data={lineData} options={{ ...lineOptions, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="chart-card">
          <div className="card-header">
            <div>
              <div className="card-title">Loan Status Summary</div>
              <div className="card-sub">Current distribution</div>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <Bar data={barData} options={{ ...barOptions, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* CALENDAR + ACTIVITY + DOUGHNUT */}
      <div className="bottom-row">
        <CollectionCalendar />
        <ActivityLog />
        <div className="chart-card">
          <div className="card-header">
            <div>
              <div className="card-title">Loan Type Breakdown</div>
              <div className="card-sub">By category</div>
            </div>
          </div>
          <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Doughnut data={doughnutData} options={{ ...doughnutOptions, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* BLOCKCHAIN LEDGER */}
      <BlockchainLedger />

    </div>
  );
}