import { useOutletContext } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from "chart.js";
import "./MemberDashboard.css";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend, Filler
);

const STATS = {
  loanBalance:   3000,
  totalLoan:     12000,
  totalPaid:     9000,
  monthlyDue:    1200,
  nextDueDate:   "April 1, 2026",
  shareCapital:  8500,
  loanType:      "Salary Loan",
  loanId:        "LN-2026-004",
  loanStatus:    "Current",
};

const PAYMENT_HISTORY = [
  { month: "Oct", amount: 1200 },
  { month: "Nov", amount: 1200 },
  { month: "Dec", amount: 1200 },
  { month: "Jan", amount: 1200 },
  { month: "Feb", amount: 1200 },
  { month: "Mar", amount: 1200 },
];

const RECENT_TX = [
  { date: "2026-03-17", desc: "Loan Payment",  amount: -1200, balance: 3000  },
  { date: "2026-02-15", desc: "Loan Payment",  amount: -1200, balance: 4200  },
  { date: "2026-01-14", desc: "Loan Payment",  amount: -1200, balance: 5400  },
  { date: "2025-12-10", desc: "Loan Payment",  amount: -1200, balance: 6600  },
  { date: "2025-11-12", desc: "Loan Payment",  amount: -1200, balance: 7800  },
];

const NOTIFS = [
  { id: 1, type: "due",    msg: "Your payment of ₱1,200 is due on April 1, 2026.", time: "2 days ago",  read: false },
  { id: 2, type: "notice", msg: "March collection schedule has been posted.",       time: "3 days ago",  read: false },
  { id: 3, type: "system", msg: "Your loan LN-2026-004 has been approved.",         time: "1 week ago",  read: true  },
];

export default function MemberDashboard() {
  const ctx    = useOutletContext() || {};
  const member = ctx.member || { name: "Maria Santos", memberId: "LEAF-100-05", initials: "MS" };
  const navigate = useNavigate();

  const paidPct = Math.round((STATS.totalPaid / STATS.totalLoan) * 100);
  const firstname = member.name.split(" ")[0];

  const lineData = {
    labels: PAYMENT_HISTORY.map(p => p.month),
    datasets: [{
      label: "Payment",
      data:   PAYMENT_HISTORY.map(p => p.amount),
      borderColor: "#2e7d32",
      backgroundColor: "rgba(46,125,50,0.08)",
      fill: true, tension: 0.4,
      pointRadius: 4, pointBackgroundColor: "#2e7d32", borderWidth: 2,
    }],
  };

  const doughnutData = {
    labels: ["Paid", "Remaining"],
    datasets: [{
      data: [STATS.totalPaid, STATS.loanBalance],
      backgroundColor: ["#2e7d32", "#e8f5e9"],
      borderWidth: 0, hoverOffset: 4,
    }],
  };

  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { grid: { color: "#f0f4f1" }, ticks: { font: { size: 10 }, callback: v => "₱" + v.toLocaleString() } },
    },
  };

  const doughnutOpts = {
    responsive: true, maintainAspectRatio: false, cutout: "68%",
    plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 10, font: { size: 10 } } } },
  };

  const notifIcon = { due: "📅", notice: "📢", system: "✅" };

  return (
    <div className="md-wrapper">

      {/* ── Welcome Banner ── */}
      <div className="md-banner">
        <div>
          <div className="md-banner-greeting">Good day, {firstname}! 👋</div>
          <div className="md-banner-sub">Here's a summary of your LEAF MPC account.</div>
        </div>
        <div className="md-banner-chip">
          <div className="md-banner-avatar">{member.initials}</div>
          <div>
            <div className="md-banner-name">{member.name}</div>
            <div className="md-banner-id">{member.memberId}</div>
          </div>
          <span className="md-active-badge">Active</span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="md-kpi-grid">
        <div className="md-kpi-card md-kpi-danger">
          <div className="md-kpi-icon">💳</div>
          <div>
            <div className="md-kpi-label">Remaining Balance</div>
            <div className="md-kpi-val red">₱{STATS.loanBalance.toLocaleString()}</div>
            <div className="md-kpi-sub">{STATS.loanType} · {STATS.loanId}</div>
          </div>
        </div>
        <div className="md-kpi-card">
          <div className="md-kpi-icon">📅</div>
          <div>
            <div className="md-kpi-label">Next Payment Due</div>
            <div className="md-kpi-val orange">₱{STATS.monthlyDue.toLocaleString()}</div>
            <div className="md-kpi-sub">{STATS.nextDueDate}</div>
          </div>
        </div>
        <div className="md-kpi-card">
          <div className="md-kpi-icon">✅</div>
          <div>
            <div className="md-kpi-label">Total Paid</div>
            <div className="md-kpi-val green">₱{STATS.totalPaid.toLocaleString()}</div>
            <div className="md-kpi-sub">{paidPct}% of loan completed</div>
          </div>
        </div>
        <div className="md-kpi-card">
          <div className="md-kpi-icon">🏦</div>
          <div>
            <div className="md-kpi-label">Share Capital</div>
            <div className="md-kpi-val blue">₱{STATS.shareCapital.toLocaleString()}</div>
            <div className="md-kpi-sub">Max loanable: ₱{(STATS.shareCapital * 3).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* ── Middle row: Progress + Doughnut ── */}
      <div className="md-mid-row">

        {/* Loan progress */}
        <div className="md-card md-progress-card">
          <div className="md-card-title">Loan Repayment Progress</div>
          <div className="md-card-sub">{STATS.loanType} — {STATS.loanId}</div>
          <div className="md-progress-bar-wrap">
            <div className="md-progress-bar">
              <div className="md-progress-fill" style={{ width: paidPct + "%" }} />
            </div>
            <div className="md-progress-labels">
              <span className="green fw">₱{STATS.totalPaid.toLocaleString()} paid</span>
              <span>{paidPct}%</span>
              <span className="red">₱{STATS.loanBalance.toLocaleString()} left</span>
            </div>
          </div>
          <div className="md-loan-details">
            <div className="md-loan-detail-item">
              <span className="md-ld-label">Principal</span>
              <span className="md-ld-val">₱{STATS.totalLoan.toLocaleString()}</span>
            </div>
            <div className="md-loan-detail-item">
              <span className="md-ld-label">Monthly Due</span>
              <span className="md-ld-val green">₱{STATS.monthlyDue.toLocaleString()}</span>
            </div>
            <div className="md-loan-detail-item">
              <span className="md-ld-label">Status</span>
              <span className="md-loan-status-badge current">{STATS.loanStatus}</span>
            </div>
            <div className="md-loan-detail-item">
              <span className="md-ld-label">Next Due</span>
              <span className="md-ld-val">{STATS.nextDueDate}</span>
            </div>
          </div>
        </div>

        {/* Doughnut */}
        <div className="md-card">
          <div className="md-card-title">Loan Breakdown</div>
          <div className="md-card-sub">Paid vs Remaining</div>
          <div style={{ height: 200 }}>
            <Doughnut data={doughnutData} options={doughnutOpts} />
          </div>
        </div>
      </div>

      {/* ── Bottom row: Payment chart + Transactions + Notifications ── */}
      <div className="md-bot-row">

        {/* Payment trend */}
        <div className="md-card">
          <div className="md-card-title">Payment History</div>
          <div className="md-card-sub">Last 6 months</div>
          <div style={{ height: 180 }}>
            <Line data={lineData} options={lineOpts} />
          </div>
        </div>

        {/* Recent transactions */}
        <div className="md-card">
          <div className="md-card-header-row">
            <div>
              <div className="md-card-title">Recent Transactions</div>
              <div className="md-card-sub">Latest payment records</div>
            </div>
            <button className="md-view-all-btn" onClick={() => navigate("/member/my-loans")}>
              View All →
            </button>
          </div>
          <div className="md-tx-list">
            {RECENT_TX.map((tx, i) => (
              <div key={i} className="md-tx-item">
                <div className="md-tx-icon payment">💳</div>
                <div className="md-tx-info">
                  <div className="md-tx-desc">{tx.desc}</div>
                  <div className="md-tx-date">{tx.date}</div>
                </div>
                <div className="md-tx-amount red">−₱{Math.abs(tx.amount).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications preview */}
        <div className="md-card">
          <div className="md-card-header-row">
            <div>
              <div className="md-card-title">Notifications</div>
              <div className="md-card-sub">Latest updates</div>
            </div>
            <button className="md-view-all-btn" onClick={() => navigate("/member/notifications")}>
              View All →
            </button>
          </div>
          <div className="md-notif-list">
            {NOTIFS.map(n => (
              <div key={n.id} className={`md-notif-item ${!n.read ? "unread" : ""}`}>
                <div className="md-notif-icon">{notifIcon[n.type]}</div>
                <div className="md-notif-body">
                  <div className="md-notif-msg">{n.msg}</div>
                  <div className="md-notif-time">{n.time}</div>
                </div>
                {!n.read && <div className="md-unread-dot" />}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}