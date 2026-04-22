import { useState, useRef } from "react";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import "./Reports.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

// ─── Mock Report Data ─────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const COLLECTION_DATA = [12000,18000,15000,22000,19000,25000,21000,28000,24000,30000,27000,32000];
const PREV_COLLECTION = [8000,11000,10000,14000,13000,17000,15000,20000,18000,22000,20000,24000];

const LOAN_TYPE_DATA = { labels:["Regular","Emergency","Salary","Housing","Business"], values:[42,28,18,35,22] };

const MEMBER_GROWTH = [5,8,6,12,9,14,11,17,13,19,16,22];

const PAYMENT_BEHAVIOR = {
  onTime: 68, late: 24, defaulted: 8,
};

const LOAN_STATUS_DATA = { labels:["Approved","Pending","Declined","Active","Completed"], values:[42,15,8,35,60] };

const TRANSACTION_LOG = [
  { date:"2026-03-18", member:"Junelle Dinglasan",      memberId:"LEAF-100-01", type:"Payment",      amount:1500,  loanId:"LN-2026-001", hash:"ha4jbac28k01eedr-j7" },
  { date:"2026-03-17", member:"Maria Santos",           memberId:"LEAF-100-05", type:"Payment",      amount:1200,  loanId:"LN-2026-004", hash:"hx9kzab34m02ffes-p3" },
  { date:"2026-03-16", member:"Ana Gonzales",           memberId:"LEAF-100-07", type:"Loan Release",  amount:80000, loanId:"LN-2026-005", hash:"hb2mnat56q03ggft-r8" },
  { date:"2026-03-15", member:"Carlos Bautista",        memberId:"LEAF-100-10", type:"Payment",      amount:600,   loanId:"LN-2026-007", hash:"hc7plcb72s04hhgu-t1" },
  { date:"2026-03-14", member:"Hillery Verastigue",     memberId:"LEAF-100-03", type:"Payment",      amount:4500,  loanId:"LN-2026-003", hash:"hd3rndc89u05iihv-w5" },
  { date:"2026-03-13", member:"Ramon Aquino",           memberId:"LEAF-100-12", type:"Loan Release",  amount:35000, loanId:"LN-2026-010", hash:"he8smec95v06jjkw-y9" },
  { date:"2026-03-12", member:"Junelle Dinglasan",      memberId:"LEAF-100-01", type:"Payment",      amount:1500,  loanId:"LN-2026-001", hash:"hf1tnfd96w07kklx-z2" },
  { date:"2026-03-10", member:"Rosa Mendoza",           memberId:"LEAF-100-09", type:"Payment",      amount:1000,  loanId:"LN-2026-006", hash:"hg3uoge07x08llmy-a4" },
];

const SUMMARY_STATS = {
  totalCollection: 253000,
  totalLoansReleased: 18,
  totalLoanAmount: 425000,
  activeMembers: 48,
  pendingApprovals: 3,
  overdueLoans: 4,
  collectionRate: 87,
  avgLoanAmount: 23611,
};

const REPORT_TYPES = ["Financial Summary","Collection Report","Loan Summary","Member Report","Payment Behavior","Blockchain Audit Log"];

const chartOpts = (yLabel = "") => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    y: { grid: { color: "#f0f4f1" }, ticks: { font: { size: 10 }, callback: v => yLabel + v.toLocaleString() } },
  },
});

// ─── Report Preview Modal ─────────────────────────────────────────────────────
function ReportPreviewModal({ type, dateFrom, dateTo, onClose }) {
  if (!type) return null;
  return (
    <div className="rp-overlay" onClick={onClose}>
      <div className="rp-modal rp-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="rp-modal-header">
          <div>
            <div className="rp-modal-title">Report Preview — {type}</div>
            <div className="rp-modal-sub">Period: {dateFrom} to {dateTo} · Generated {new Date().toLocaleString()}</div>
          </div>
          <button className="rp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="rp-modal-body">
          <div className="rp-preview-header">
            <div className="rp-preview-logo">🌿 LEAF MPC</div>
            <div className="rp-preview-info">
              <div className="rp-preview-title">{type}</div>
              <div className="rp-preview-period">Period: {dateFrom} – {dateTo}</div>
            </div>
          </div>
          <div className="rp-preview-content">
            <p>This is a preview of the <strong>{type}</strong>. In the full system with backend integration, this will display actual data from the database for the selected period.</p>
            <div className="rp-preview-placeholder">
              <div className="rp-placeholder-icon">📄</div>
              <div>Report content will be generated from live data</div>
              <div className="rp-placeholder-sub">Connect Django backend to populate this report</div>
            </div>
          </div>
        </div>
        <div className="rp-modal-footer">
          <button className="rp-btn-cancel" onClick={onClose}>Close</button>
          <button className="rp-btn-export excel" onClick={onClose}>⬇ Export Excel</button>
          <button className="rp-btn-export pdf" onClick={onClose}>📄 Export PDF</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Reports() {
  const [activeTab, setActiveTab] = useState("overview");
  const [reportType, setReportType] = useState("Financial Summary");
  const [dateFrom, setDateFrom]   = useState("2026-01-01");
  const [dateTo, setDateTo]       = useState("2026-03-31");
  const [showPreview, setPreview] = useState(false);
  const [txSearch, setTxSearch]   = useState("");

  const filteredTx = TRANSACTION_LOG.filter(t => {
    const q = txSearch.toLowerCase();
    return t.member.toLowerCase().includes(q) || t.memberId.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.loanId.toLowerCase().includes(q);
  });

  // Chart data
  const collectionLineData = {
    labels: MONTHS,
    datasets: [
      { label:"2026", data:COLLECTION_DATA, borderColor:"#2e7d32", backgroundColor:"rgba(46,125,50,0.08)", fill:true, tension:0.4, pointRadius:3, pointBackgroundColor:"#2e7d32", borderWidth:2 },
      { label:"2025", data:PREV_COLLECTION, borderColor:"#a5d6a7", backgroundColor:"transparent", fill:false, tension:0.4, pointRadius:2, borderDash:[4,3], borderWidth:1.5 },
    ],
  };

  const loanTypeBarData = {
    labels: LOAN_TYPE_DATA.labels,
    datasets: [{ data:LOAN_TYPE_DATA.values, backgroundColor:["#2e7d32","#4caf50","#f57c00","#1565c0","#a5d6a7"], borderRadius:6, borderSkipped:false }],
  };

  const memberGrowthData = {
    labels: MONTHS,
    datasets: [{ label:"New Members", data:MEMBER_GROWTH, borderColor:"#1565c0", backgroundColor:"rgba(21,101,192,0.08)", fill:true, tension:0.4, pointRadius:3, pointBackgroundColor:"#1565c0", borderWidth:2 }],
  };

  const payBehaviorData = {
    labels: ["On-time","Late","Defaulted"],
    datasets: [{ data:[PAYMENT_BEHAVIOR.onTime, PAYMENT_BEHAVIOR.late, PAYMENT_BEHAVIOR.defaulted], backgroundColor:["#2e7d32","#f57c00","#c62828"], borderWidth:0, hoverOffset:4 }],
  };

  const loanStatusData = {
    labels: LOAN_STATUS_DATA.labels,
    datasets: [{ data:LOAN_STATUS_DATA.values, backgroundColor:["#2e7d32","#f57c00","#e53935","#1565c0","#a5d6a7"], borderRadius:5, borderSkipped:false }],
  };

  return (
    <div className="rp-wrapper">

      {showPreview && (
        <ReportPreviewModal
          type={reportType}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onClose={() => setPreview(false)}
        />
      )}

      {/* Header */}
      <div className="rp-page-header">
        <div>
          <div className="rp-page-title">Reports & Analytics</div>
          <div className="rp-page-sub">Financial summaries, loan analytics, and payment behavior reports. Export to Excel or PDF.</div>
        </div>
      </div>

      {/* Main tabs */}
      <div className="rp-main-tabs">
        {[
          { key:"overview",  label:"📊 Overview" },
          { key:"charts",    label:"📈 Charts" },
          { key:"generate",  label:"📄 Generate Report" },
          { key:"audit",     label:"🔗 Audit Log" },
        ].map(t => (
          <button
            key={t.key}
            className={`rp-main-tab ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <>
          {/* KPI Cards */}
          <div className="rp-kpi-grid">
            <div className="rp-kpi-card green">
              <div className="rp-kpi-icon">💰</div>
              <div className="rp-kpi-val">₱{SUMMARY_STATS.totalCollection.toLocaleString()}</div>
              <div className="rp-kpi-label">Total Collection (YTD)</div>
            </div>
            <div className="rp-kpi-card blue">
              <div className="rp-kpi-icon">📋</div>
              <div className="rp-kpi-val">₱{SUMMARY_STATS.totalLoanAmount.toLocaleString()}</div>
              <div className="rp-kpi-label">Total Loans Released</div>
            </div>
            <div className="rp-kpi-card teal">
              <div className="rp-kpi-icon">👥</div>
              <div className="rp-kpi-val">{SUMMARY_STATS.activeMembers}</div>
              <div className="rp-kpi-label">Active Members</div>
            </div>
            <div className="rp-kpi-card orange">
              <div className="rp-kpi-icon">📊</div>
              <div className="rp-kpi-val">{SUMMARY_STATS.collectionRate}%</div>
              <div className="rp-kpi-label">Collection Rate</div>
            </div>
            <div className="rp-kpi-card purple">
              <div className="rp-kpi-icon">🏦</div>
              <div className="rp-kpi-val">{SUMMARY_STATS.totalLoansReleased}</div>
              <div className="rp-kpi-label">Loans Released (YTD)</div>
            </div>
            <div className="rp-kpi-card red">
              <div className="rp-kpi-icon">⚠</div>
              <div className="rp-kpi-val">{SUMMARY_STATS.overdueLoans}</div>
              <div className="rp-kpi-label">Overdue Loans</div>
            </div>
            <div className="rp-kpi-card gray">
              <div className="rp-kpi-icon">⏳</div>
              <div className="rp-kpi-val">{SUMMARY_STATS.pendingApprovals}</div>
              <div className="rp-kpi-label">Pending Approvals</div>
            </div>
            <div className="rp-kpi-card blue">
              <div className="rp-kpi-icon">💳</div>
              <div className="rp-kpi-val">₱{SUMMARY_STATS.avgLoanAmount.toLocaleString()}</div>
              <div className="rp-kpi-label">Avg Loan Amount</div>
            </div>
          </div>

          {/* Quick charts row */}
          <div className="rp-quick-charts">
            <div className="rp-chart-card">
              <div className="rp-chart-header">
                <div className="rp-chart-title">Monthly Collection Trend</div>
                <div className="rp-legend-row">
                  <div className="rp-legend-item"><div className="rp-legend-dot" style={{background:"#2e7d32"}}/>2026</div>
                  <div className="rp-legend-item"><div className="rp-legend-dot" style={{background:"#a5d6a7"}}/>2025</div>
                </div>
              </div>
              <div style={{height:200}}><Line data={collectionLineData} options={chartOpts("₱")} /></div>
            </div>
            <div className="rp-chart-card">
              <div className="rp-chart-header">
                <div className="rp-chart-title">Payment Behavior</div>
              </div>
              <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Doughnut data={payBehaviorData} options={{ responsive:true, maintainAspectRatio:false, cutout:"65%", plugins:{ legend:{ position:"bottom", labels:{ boxWidth:10, padding:10, font:{size:10} } } } }} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── CHARTS TAB ───────────────────────────────────────────────────── */}
      {activeTab === "charts" && (
        <div className="rp-charts-grid">
          <div className="rp-chart-card">
            <div className="rp-chart-header"><div className="rp-chart-title">Loans by Type</div></div>
            <div style={{height:220}}><Bar data={loanTypeBarData} options={chartOpts()} /></div>
          </div>
          <div className="rp-chart-card">
            <div className="rp-chart-header"><div className="rp-chart-title">Loan Status Summary</div></div>
            <div style={{height:220}}><Bar data={loanStatusData} options={chartOpts()} /></div>
          </div>
          <div className="rp-chart-card rp-chart-full">
            <div className="rp-chart-header">
              <div className="rp-chart-title">Member Growth (Monthly)</div>
            </div>
            <div style={{height:220}}><Line data={memberGrowthData} options={chartOpts()} /></div>
          </div>
          <div className="rp-chart-card">
            <div className="rp-chart-header"><div className="rp-chart-title">Payment Behavior Distribution</div></div>
            <div style={{height:220,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Doughnut data={payBehaviorData} options={{ responsive:true, maintainAspectRatio:false, cutout:"60%", plugins:{ legend:{ position:"bottom", labels:{ boxWidth:10, padding:10, font:{size:10} } } } }} />
            </div>
          </div>
          <div className="rp-chart-card rp-chart-full">
            <div className="rp-chart-header">
              <div className="rp-chart-title">Monthly Collection (2026 vs 2025)</div>
              <div className="rp-legend-row">
                <div className="rp-legend-item"><div className="rp-legend-dot" style={{background:"#2e7d32"}}/>2026</div>
                <div className="rp-legend-item"><div className="rp-legend-dot" style={{background:"#a5d6a7"}}/>2025</div>
              </div>
            </div>
            <div style={{height:220}}><Line data={collectionLineData} options={chartOpts("₱")} /></div>
          </div>
        </div>
      )}

      {/* ── GENERATE REPORT TAB ──────────────────────────────────────────── */}
      {activeTab === "generate" && (
        <div className="rp-generate-card">
          <div className="rp-generate-title">Generate Report</div>
          <div className="rp-generate-sub">Select report type and date range, then preview or export.</div>

          <div className="rp-gen-form">
            {/* Report type */}
            <div className="rp-gen-field">
              <label className="rp-gen-label">Report Type</label>
              <div className="rp-report-type-grid">
                {REPORT_TYPES.map(r => (
                  <button
                    key={r}
                    className={`rp-report-type-btn ${reportType === r ? "selected" : ""}`}
                    onClick={() => setReportType(r)}
                  >
                    <span className="rp-rt-icon">
                      {r === "Financial Summary" ? "💰"
                       : r === "Collection Report" ? "📥"
                       : r === "Loan Summary"     ? "🏦"
                       : r === "Member Report"    ? "👥"
                       : r === "Payment Behavior" ? "📊"
                       : "🔗"}
                    </span>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div className="rp-gen-row">
              <div className="rp-gen-field">
                <label className="rp-gen-label">Date From</label>
                <input className="rp-gen-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="rp-gen-field">
                <label className="rp-gen-label">Date To</label>
                <input className="rp-gen-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>

            {/* Quick range buttons */}
            <div className="rp-gen-field">
              <label className="rp-gen-label">Quick Range</label>
              <div className="rp-quick-range">
                {[
                  { label:"This Month",  from:"2026-03-01", to:"2026-03-31" },
                  { label:"Last Month",  from:"2026-02-01", to:"2026-02-28" },
                  { label:"This Quarter",from:"2026-01-01", to:"2026-03-31" },
                  { label:"This Year",   from:"2026-01-01", to:"2026-12-31" },
                ].map(r => (
                  <button key={r.label} className="rp-range-btn" onClick={() => { setDateFrom(r.from); setDateTo(r.to); }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected preview */}
            <div className="rp-gen-preview-box">
              <div className="rp-gen-preview-row">
                <span>Report Type</span><strong>{reportType}</strong>
              </div>
              <div className="rp-gen-preview-row">
                <span>Period</span><strong>{dateFrom} — {dateTo}</strong>
              </div>
            </div>

            {/* Actions */}
            <div className="rp-gen-actions">
              <button className="rp-gen-btn preview" onClick={() => setPreview(true)}>👁 Preview Report</button>
              <button className="rp-gen-btn excel"   onClick={() => setPreview(true)}>⬇ Export Excel</button>
              <button className="rp-gen-btn pdf"     onClick={() => setPreview(true)}>📄 Export PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT LOG TAB ────────────────────────────────────────────────── */}
      {activeTab === "audit" && (
        <div className="rp-audit-card">
          <div className="rp-audit-header-row">
            <div>
              <div className="rp-audit-title">🔗 Blockchain Audit Log</div>
              <div className="rp-audit-sub">Tamper-proof transaction records with SHA-256 hashing.</div>
            </div>
            <div className="rp-search-wrap">
              <span className="rp-search-icon">🔍</span>
              <input
                className="rp-search-input"
                placeholder="Search transactions..."
                value={txSearch}
                onChange={e => setTxSearch(e.target.value)}
              />
              {txSearch && <button className="rp-clear-btn" onClick={() => setTxSearch("")}>✕</button>}
            </div>
          </div>

          <div className="rp-audit-table-wrap">
            <table className="rp-audit-table">
              <thead>
                <tr>
                  <th style={{width:"11%"}}>Date</th>
                  <th style={{width:"18%"}}>Member</th>
                  <th style={{width:"11%"}}>Member ID</th>
                  <th style={{width:"11%"}}>Type</th>
                  <th style={{width:"10%"}}>Amount</th>
                  <th style={{width:"12%"}}>Loan ID</th>
                  <th style={{width:"27%"}}>SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.length === 0 ? (
                  <tr><td colSpan={7} className="rp-empty">No transactions found.</td></tr>
                ) : filteredTx.map((t, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                    <td className="cell-date">{t.date}</td>
                    <td className="cell-name">{t.member}</td>
                    <td className="mono">{t.memberId}</td>
                    <td>
                      <span className={`rp-type-badge ${t.type === "Payment" ? "type-payment" : "type-release"}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className={`fw ${t.type === "Payment" ? "green" : "blue"}`}>₱{t.amount.toLocaleString()}</td>
                    <td className="mono">{t.loanId}</td>
                    <td><span className="rp-hash">{t.hash}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rp-audit-footer">
            <div className="rp-hash-notice">🔒 All records are cryptographically hashed and cannot be altered.</div>
            <button className="rp-gen-btn excel" style={{padding:"6px 16px",fontSize:"11px"}}>⬇ Export Audit Log</button>
          </div>
        </div>
      )}
    </div>
  );
}