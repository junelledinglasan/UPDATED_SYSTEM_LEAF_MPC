import { useState, useEffect } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, RadialLinearScale,
  Title, Tooltip, Legend, Filler,
} from "chart.js";
import {
  getOverviewAPI, getMonthlyCollectionAPI, getLoanStatusAPI, getLoanTypeAPI,
  getPaymentBehaviorAPI, getAuditLogAPI, previewReportAPI, exportExcel, exportPDF,
  getClassificationAPI, getMemberPerformanceAPI, getTopBorrowersAPI,
  getLoanDistributionAPI, getYearlyComparisonAPI, getShareCapitalAPI,
  getOverdueAnalysisAPI, getMonthlyLoansAPI,
} from "../../api/reports";
import {
  BarChart2, TrendingUp, FileText, Link2, Users, PieChart,
  Wallet, ClipboardList, Users2, Landmark, AlertTriangle, Clock, PiggyBank,
} from "lucide-react";
import "./Reports.css";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, RadialLinearScale,
  Title, Tooltip, Legend, Filler
);

const COLORS = ["#2e7d32","#4caf50","#f57c00","#1565c0","#c62828","#6a1b9a","#00838f","#ff8a65","#64b5f6","#ba68c8"];
const YEAR   = new Date().getFullYear();
const YEARS  = [YEAR - 2, YEAR - 1, YEAR, YEAR + 1];

const REPORT_TYPES = [
  "Financial Summary", "Collection Report", "Loan Summary", "Member Report",
  "Payment Behavior", "Blockchain Audit Log", "Member Performance Report",
  "Classification Analytics", "Savings Report",
];

const chartOpts = (ylabel = "") => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    y: { grid: { color: "#f0f4f1" }, ticks: { font: { size: 10 }, callback: v => ylabel ? ylabel + v.toLocaleString() : v } },
  },
});

// ─── Report Preview Modal ──────────────────────────────────────────────────────
function ReportPreviewModal({ type, dateFrom, dateTo, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExp]   = useState("");

  useEffect(() => {
    if (!type) return;
    setLoading(true);
    previewReportAPI(type, dateFrom, dateTo)
      .then(d => setData(d))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [type, dateFrom, dateTo]);

  if (!type) return null;

  const handleExcel = async () => { setExp("excel"); try { await exportExcel(type, dateFrom, dateTo); } catch { alert("Failed to export Excel."); } finally { setExp(""); } };
  const handlePDF   = async () => { setExp("pdf");   try { await exportPDF(type, dateFrom, dateTo);   } catch { alert("Failed to export PDF.");   } finally { setExp(""); } };

  return (
    <div className="rp-overlay" onClick={onClose}>
      <div className="rp-modal rp-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="rp-modal-header">
          <div>
            <div className="rp-modal-title">📄 {type}</div>
            <div className="rp-modal-sub">Period: {dateFrom} to {dateTo} · {new Date().toLocaleString()}</div>
          </div>
          <button className="rp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="rp-modal-body">
          {loading ? <div className="rp-loading">Loading report...</div> : !data ? <div className="rp-no-data">Failed to load.</div> : (
            <>
              <div className="rp-preview-header">
                <div className="rp-preview-logo">🌿 LEAF MPC</div>
                <div className="rp-preview-info">
                  <div className="rp-preview-title">{type}</div>
                  <div className="rp-preview-period">Period: {dateFrom} – {dateTo}</div>
                </div>
              </div>
              {data.summary?.length > 0 && (
                <div className="rp-preview-summary">
                  {data.summary.map(([label, val], i) => (
                    <div key={i} className="rp-sum-item">
                      <span className="rp-sum-label">{label}</span>
                      <span className="rp-sum-val">{val}</span>
                    </div>
                  ))}
                </div>
              )}
              {data.columns?.length > 0 && (
                <>
                  <div className="rp-preview-count">
                    Showing {Math.min(data.rows?.length || 0, 50)} of {data.total_rows} records
                    {data.total_rows > 50 && " — Export for full data"}
                  </div>
                  <div className="rp-preview-table-wrap">
                    <table className="rp-preview-table">
                      <thead><tr>{data.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
                      <tbody>
                        {data.rows?.length === 0
                          ? <tr><td colSpan={data.columns.length} style={{ textAlign: "center", padding: "20px", color: "#aaa" }}>No data for this period.</td></tr>
                          : data.rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>)
                        }
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <div className="rp-modal-footer">
          <button className="rp-btn-cancel" onClick={onClose}>Close</button>
          <button className="rp-btn-export excel" onClick={handleExcel} disabled={!!exporting}>{exporting === "excel" ? "Exporting..." : "⬇ Excel"}</button>
          <button className="rp-btn-export pdf"   onClick={handlePDF}   disabled={!!exporting}>{exporting === "pdf"   ? "Exporting..." : "📄 PDF"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Rating Badge ──────────────────────────────────────────────────────────────
function RatingBadge({ rating }) {
  const colors = { Excellent: "#1b5e20", Good: "#2e7d32", Fair: "#f57c00", Poor: "#c62828" };
  const bg     = { Excellent: "#e8f5e9", Good: "#f1f8e9", Fair: "#fff8e1", Poor: "#ffebee" };
  return (
    <span style={{
      background: bg[rating] || "#eee", color: colors[rating] || "#333",
      border: `1px solid ${colors[rating] || "#ccc"}`,
      borderRadius: 12, padding: "2px 10px", fontSize: 11, fontWeight: 700,
    }}>{rating}</span>
  );
}

// ─── Main Reports Component ────────────────────────────────────────────────────
export default function Reports() {
  const [activeTab,    setTab]        = useState("overview");
  const [selectedYear, setYear]       = useState(YEAR);
  const [loading,      setLoading]    = useState(true);
  const [dateFrom,     setDateFrom]   = useState(`${YEAR}-01-01`);
  const [dateTo,       setDateTo]     = useState(`${YEAR}-12-31`);
  const [reportType,   setReportType] = useState("");
  const [showPreview,  setPreview]    = useState(false);
  const [exporting,    setExporting]  = useState("");

  const [overview,        setOverview]        = useState({});
  const [monthly,         setMonthly]         = useState([]);
  const [loanStat,        setLoanStat]        = useState({});
  const [loanType,        setLoanType]        = useState({});
  const [payBehav,        setPayBehav]        = useState({});
  const [auditLog,        setAuditLog]        = useState([]);
  const [classification,  setClassification]  = useState([]);
  const [memberPerf,      setMemberPerf]      = useState([]);
  const [topBorrowers,    setTopBorrowers]    = useState({ data: [] });
  const [loanDist,        setLoanDist]        = useState([]);
  const [yearlyComp,      setYearlyComp]      = useState([]);
  const [shareCapital,    setShareCapital]    = useState([]);
  const [overdueAnalysis, setOverdueAnalysis] = useState([]);
  const [monthlyLoans,    setMonthlyLoans]    = useState([]);

  // All year-sensitive APIs pass selectedYear — re-fetches when year changes
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          getOverviewAPI(selectedYear),
          getMonthlyCollectionAPI(selectedYear),
          getLoanStatusAPI(selectedYear),
          getLoanTypeAPI(selectedYear),
          getPaymentBehaviorAPI(selectedYear),
          getAuditLogAPI(selectedYear),
          getClassificationAPI(selectedYear),
          getMemberPerformanceAPI(selectedYear),
          getTopBorrowersAPI(selectedYear),
          getLoanDistributionAPI(selectedYear),
          getYearlyComparisonAPI(),
          getShareCapitalAPI(selectedYear),
          getOverdueAnalysisAPI(selectedYear),
          getMonthlyLoansAPI(selectedYear),
        ]);
        const [ov,mn,ls,lt,pb,al,cls,mp,tb,ld,yc,sc,od,ml] = results;
        if (ov.status  === "fulfilled") setOverview(ov.value);
        if (mn.status  === "fulfilled") setMonthly(mn.value);
        if (ls.status  === "fulfilled") setLoanStat(ls.value);
        if (lt.status  === "fulfilled") setLoanType(lt.value);
        if (pb.status  === "fulfilled") setPayBehav(pb.value);
        if (al.status  === "fulfilled") setAuditLog(al.value);
        if (cls.status === "fulfilled") setClassification(cls.value);
        if (mp.status  === "fulfilled") setMemberPerf(mp.value);
        if (tb.status  === "fulfilled") setTopBorrowers(tb.value);
        if (ld.status  === "fulfilled") setLoanDist(ld.value);
        if (yc.status  === "fulfilled") setYearlyComp(yc.value);
        if (sc.status  === "fulfilled") setShareCapital(sc.value);
        if (od.status  === "fulfilled") setOverdueAnalysis(od.value);
        if (ml.status  === "fulfilled") setMonthlyLoans(ml.value);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [selectedYear]);

  // ── Chart Data ──────────────────────────────────────────────────────────────
  const monthlyBarData = {
    labels:   monthly.map(m => m.month),
    datasets: [{ label: "Collection", data: monthly.map(m => m.total), backgroundColor: COLORS[0], borderRadius: 5 }],
  };
  const loanStatData = {
    labels:   Object.keys(loanStat).length ? Object.keys(loanStat) : ["For Review","Active","Declined","Completed","Overdue"],
    datasets: [{ data: Object.keys(loanStat).length ? Object.values(loanStat) : [0,0,0,0,0], backgroundColor: COLORS, borderRadius: 5 }],
  };
  const loanTypeData = {
    labels:   Object.keys(loanType).length ? Object.keys(loanType) : ["Regular","Emergency","Salary","Housing","Business"],
    datasets: [{ data: Object.keys(loanType).length ? Object.values(loanType) : [0,0,0,0,0], backgroundColor: COLORS, borderWidth: 0 }],
  };
  const payBehavData = {
    labels:   Object.keys(payBehav).length ? Object.keys(payBehav) : ["On Time","Late","Overdue"],
    datasets: [{ data: Object.keys(payBehav).length ? Object.values(payBehav) : [0,0,0], backgroundColor: ["#2e7d32","#f57c00","#c62828"], borderWidth: 0 }],
  };
  const donutOpts = { responsive: true, maintainAspectRatio: false, cutout: "60%", plugins: { legend: { position: "right", labels: { boxWidth: 10, font: { size: 10 } } } } };
  const clsBarData = {
    labels: classification.map(c => c.classification),
    datasets: [
      { label: "On-Time Rate (%)", data: classification.map(c => c.on_time_rate), backgroundColor: "#2e7d32", borderRadius: 5 },
      { label: "Late Rate (%)",    data: classification.map(c => c.total_payments > 0 ? Math.round((c.late_payments / c.total_payments) * 100) : 0), backgroundColor: "#f57c00", borderRadius: 5 },
    ],
  };
  const clsBarOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top" },
      tooltip: {
        callbacks: {
          title: (items) => `${items[0].label} Members`,
          label: (ctx) => {
            const cls = classification[ctx.dataIndex];
            if (!cls || cls.total_payments === 0) return `${ctx.dataset.label}: No payments yet`;
            if (ctx.dataset.label.includes("On-Time")) {
              return [
                `✅ On-Time Rate: ${ctx.parsed.y}%`,
                `   ${cls.on_time_payments} of ${cls.total_payments} payments on time`,
              ];
            }
            if (ctx.dataset.label.includes("Late")) {
              return [
                `⚠️ Late Rate: ${ctx.parsed.y}%`,
                `   ${cls.late_payments} of ${cls.total_payments} payments were late`,
              ];
            }
            return `${ctx.dataset.label}: ${ctx.parsed.y}%`;
          },
        },
        backgroundColor: "rgba(30,30,30,0.92)",
        titleFont: { size: 12, weight: "bold" },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: "#f0f4f1" }, ticks: { callback: v => v + "%" }, max: 100 },
    },
  };
  const yearlyLineData = {
    labels: yearlyComp.map(y => y.year),
    datasets: [
      { label: "Collections (₱)",      data: yearlyComp.map(y => y.collections),      borderColor: "#2e7d32", backgroundColor: "rgba(46,125,50,0.1)",  fill: true, tension: 0.4 },
      { label: "Loan Amount (₱)",       data: yearlyComp.map(y => y.loan_amount),      borderColor: "#1565c0", backgroundColor: "rgba(21,101,192,0.1)", fill: true, tension: 0.4 },
      { label: "Savings Deposits (₱)",  data: yearlyComp.map(y => y.savings_dep || 0), borderColor: "#f57c00", backgroundColor: "rgba(245,124,0,0.08)", fill: true, tension: 0.4 },
    ],
  };
  const lineOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: "top" } }, scales: { x: { grid: { display: false } }, y: { grid: { color: "#f0f4f1" }, ticks: { callback: v => "₱" + v.toLocaleString() } } } };
  const loanDistData = {
    labels:   loanDist.map(l => l.range),
    datasets: [{ label: "No. of Loans", data: loanDist.map(l => l.count), backgroundColor: COLORS, borderRadius: 5 }],
  };
  const monthlyLoansData = {
    labels:   monthlyLoans.map(m => m.month),
    datasets: [{ label: "Loan Applications", data: monthlyLoans.map(m => m.count), borderColor: "#1565c0", backgroundColor: "rgba(21,101,192,0.1)", fill: true, tension: 0.4, pointBackgroundColor: "#1565c0" }],
  };
  const overdueData = {
    labels:   overdueAnalysis.map(o => o.classification),
    datasets: [{ label: "Overdue Count", data: overdueAnalysis.map(o => o.overdue_count), backgroundColor: "#c62828", borderRadius: 5 }],
  };

  const OVERVIEW_CARDS = [
    { icon: <Wallet size={22} color="#2e7d32"/>,        bg: "#e8f5e9", val: `₱${Number(overview.total_collection || 0).toLocaleString()}`,           label: "Total Collection (YTD)",    color: "green"  },
    { icon: <ClipboardList size={22} color="#1565c0"/>,  bg: "#e3f2fd", val: `₱${Number(overview.total_releases || 0).toLocaleString()}`,              label: "Total Loan Releases",       color: "blue"   },
    { icon: <PiggyBank size={22} color="#e65100"/>,      bg: "#fff8e1", val: `₱${Number(overview.total_savings_balance || 0).toLocaleString()}`,       label: "Total Savings Balance",     color: "orange" },
    { icon: <Users2 size={22} color="#00796b"/>,         bg: "#e0f2f1", val: `${overview.active_members || 0} / ${overview.inactive_members || 0}`,    label: "Active / Inactive Members", color: "teal"   },
    { icon: <TrendingUp size={22} color="#2e7d32"/>,     bg: "#e8f5e9", val: `${overview.collection_rate || 0}%`,                                       label: "Collection Rate",           color: "green"  },
    { icon: <Landmark size={22} color="#1565c0"/>,       bg: "#e3f2fd", val: `${overview.total_loans || 0}`,                                            label: "Total Loans",               color: "blue"   },
    { icon: <AlertTriangle size={22} color="#c62828"/>,  bg: "#ffebee", val: `${overview.overdue_loans || 0}`,                                          label: "Overdue Loans",             color: "red"    },
    { icon: <Clock size={22} color="#e65100"/>,          bg: "#fff8e1", val: `${overview.pending_loans || 0}`,                                          label: "Pending Approvals",         color: "orange" },
  ];

  return (
    <div className="rp-wrapper">
      {showPreview && <ReportPreviewModal type={reportType} dateFrom={dateFrom} dateTo={dateTo} onClose={() => setPreview(false)}/>}

      {/* Page Header */}
      <div className="rp-page-header">
        <div>
          <div className="rp-page-title">Reports &amp; Analytics</div>
          <div className="rp-page-sub">Financial summaries, loan analytics, payment behavior, and member performance reports.</div>
        </div>
        <div className="rp-year-selector">
          <label style={{ fontSize: 12, color: "#888", marginRight: 6 }}>Year:</label>
          <select value={selectedYear} onChange={e => setYear(Number(e.target.value))} style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 12, fontFamily: "inherit" }}>
            {YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="rp-main-tabs">
        <button className={`rp-main-tab ${activeTab === "overview"       ? "active" : ""}`} onClick={() => setTab("overview")}><BarChart2 size={13}/> Overview</button>
        <button className={`rp-main-tab ${activeTab === "charts"         ? "active" : ""}`} onClick={() => setTab("charts")}><TrendingUp size={13}/> Charts</button>
        <button className={`rp-main-tab ${activeTab === "classification" ? "active" : ""}`} onClick={() => setTab("classification")}><PieChart size={13}/> Classification</button>
        <button className={`rp-main-tab ${activeTab === "performance"    ? "active" : ""}`} onClick={() => setTab("performance")}><Users size={13}/> Member Performance</button>
        <button className={`rp-main-tab ${activeTab === "generate"       ? "active" : ""}`} onClick={() => setTab("generate")}><FileText size={13}/> Generate Report</button>
        <button className={`rp-main-tab ${activeTab === "audit"          ? "active" : ""}`} onClick={() => setTab("audit")}><Link2 size={13}/> Audit Log</button>
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="rp-overview">
          {loading ? <div className="rp-loading">Loading...</div> : (
            <>
              <div className="rp-kpi-grid">
                {OVERVIEW_CARDS.map((c, i) => (
                  <div key={i} className={`rp-kpi-card ${c.color || ""}`}>
                    <div className="rp-kpi-icon" style={{ background: c.bg, borderRadius: 10, width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.icon}</div>
                    <div className="rp-kpi-val">{c.val}</div>
                    <div className="rp-kpi-label">{c.label}</div>
                  </div>
                ))}
              </div>
              <div className="rp-quick-charts" style={{ marginTop: 16 }}>
                <div className="rp-chart-card rp-chart-wide">
                  <div className="rp-chart-title">Monthly Collection Trend ({selectedYear})</div>
                  <div style={{ height: 220 }}>
                    {monthly.length === 0 ? <div className="rp-no-data">No data yet.</div> : <Bar data={monthlyBarData} options={chartOpts("₱")}/>}
                  </div>
                </div>
                <div className="rp-chart-card">
                  <div className="rp-chart-title">Monthly Loan Applications ({selectedYear})</div>
                  <div style={{ height: 220 }}>
                    {monthlyLoans.length === 0 ? <div className="rp-no-data">No data yet.</div> : <Line data={monthlyLoansData} options={chartOpts()}/>}
                  </div>
                </div>
              </div>
              <div className="rp-chart-card" style={{ marginTop: 16 }}>
                <div className="rp-chart-title">Year-over-Year Comparison (Collections · Loans · Savings)</div>
                <div style={{ height: 220 }}>
                  {yearlyComp.length === 0 ? <div className="rp-no-data">No data yet.</div> : <Line data={yearlyLineData} options={lineOpts}/>}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Charts Tab ───────────────────────────────────────────────────────── */}
      {activeTab === "charts" && (
        <div className="rp-quick-charts">
          <div className="rp-chart-card rp-chart-wide">
            <div className="rp-chart-title">Monthly Collection ({selectedYear})</div>
            <div style={{ height: 280 }}>
              {monthly.length === 0 ? <div className="rp-no-data">No data.</div> : <Bar data={monthlyBarData} options={chartOpts("₱")}/>}
            </div>
          </div>
          <div className="rp-chart-card">
            <div className="rp-chart-title">Payment Behavior</div>
            <div style={{ height: 220 }}><Doughnut data={payBehavData} options={donutOpts}/></div>
          </div>
          <div className="rp-chart-card">
            <div className="rp-chart-title">Loan Status Distribution</div>
            <div style={{ height: 220 }}>
              <Bar data={{ ...loanStatData, datasets: [{ ...loanStatData.datasets[0], label: "Loans" }] }} options={{ ...chartOpts(), plugins: { legend: { display: false } } }}/>
            </div>
          </div>
          <div className="rp-chart-card">
            <div className="rp-chart-title">Loan Type Breakdown</div>
            <div style={{ height: 220 }}><Doughnut data={loanTypeData} options={donutOpts}/></div>
          </div>
          <div className="rp-chart-card">
            <div className="rp-chart-title">Loan Amount Distribution</div>
            <div style={{ height: 220 }}>
              {loanDist.length === 0 ? <div className="rp-no-data">No data.</div> : <Bar data={loanDistData} options={chartOpts()}/>}
            </div>
          </div>
          <div className="rp-chart-card">
            <div className="rp-chart-title">Overdue Loans by Classification</div>
            <div style={{ height: 220 }}>
              {overdueAnalysis.length === 0 ? <div className="rp-no-data">No overdue loans.</div> : <Bar data={overdueData} options={chartOpts()}/>}
            </div>
          </div>
        </div>
      )}

      {/* ── Classification Tab ───────────────────────────────────────────────── */}
      {activeTab === "classification" && (
        <div className="rp-overview">
          <div className="rp-chart-card" style={{ marginBottom: 16 }}>
            <div className="rp-chart-title">Payment Performance by Classification ({selectedYear})</div>
            <div className="rp-chart-sub">Student vs Senior vs Employed — sino ang mas madalas magbayad?</div>
            {/* Only show chart if at least one classification has payments */}
            {classification.every(c => c.total_payments === 0) ? (
              <div className="rp-no-data" style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
                No payment records for {selectedYear}.
              </div>
            ) : (
              <div style={{ height: 260 }}>
                <Bar data={clsBarData} options={clsBarOpts}/>
              </div>
            )}
            {/* Legend note for classifications with no payments */}
            {classification.some(c => c.total_payments === 0) && (
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 8, paddingLeft: 4 }}>
                * {classification.filter(c => c.total_payments === 0).map(c => c.classification).join(", ")} — no payment records for {selectedYear}
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 16 }}>
            {classification.map((c, i) => (
              <div key={i} className="rp-cls-card">
                <div className="rp-cls-icon">
                  {c.classification === "Student" ? <span style={{ fontSize: 28 }}>🎓</span> : c.classification === "Senior" ? <span style={{ fontSize: 28 }}>👴</span> : <span style={{ fontSize: 28 }}>💼</span>}
                </div>
                <div className="rp-cls-name">{c.classification}</div>
                <div className="rp-cls-stats">
                  <div className="rp-cls-row"><span>Members</span><strong>{c.member_count}</strong></div>
                  <div className="rp-cls-row"><span>Total Loans</span><strong>{c.total_loans}</strong></div>
                  <div className="rp-cls-row"><span>Active Loans</span><strong>{c.active_loans}</strong></div>
                  <div className="rp-cls-row"><span>Overdue Loans</span><strong style={{ color: "#c62828" }}>{c.overdue_loans}</strong></div>
                  <div className="rp-cls-row"><span>On-Time Rate</span><strong style={{ color: c.on_time_rate >= 80 ? "#1b5e20" : "#f57c00" }}>{c.on_time_rate}%</strong></div>
                  <div className="rp-cls-row"><span>Total Collected</span><strong>₱{Number(c.total_collected).toLocaleString()}</strong></div>
                  <div className="rp-cls-row"><span>Avg Loan</span><strong>₱{Number(c.avg_loan_amount).toLocaleString()}</strong></div>
                  <div className="rp-cls-row"><span>Total Savings</span><strong style={{ color: "#e65100" }}>₱{Number(c.total_savings || 0).toLocaleString()}</strong></div>
                </div>
              </div>
            ))}
          </div>
          <div className="rp-chart-card">
            <div className="rp-chart-title">Top Borrowers ({selectedYear})</div>
            <div className="rp-chart-sub">Sinong member ang pinaka-maraming naka-loan this year?</div>
            <div className="rp-preview-table-wrap">
              <table className="rp-preview-table">
                <thead><tr><th>#</th><th>Member ID</th><th>Name</th><th>Classification</th><th>Loans</th><th>Total Amount</th><th>Share Capital</th><th>Savings Balance</th></tr></thead>
                <tbody>
                  {(topBorrowers.data || []).length === 0
                    ? <tr><td colSpan={8} style={{ textAlign: "center", color: "#aaa", padding: 20 }}>No data yet.</td></tr>
                    : (topBorrowers.data || []).map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: "#2e7d32" }}>{i + 1}</td>
                        <td className="mono">{m.member_id}</td>
                        <td className="cell-name">{m.name}</td>
                        <td>{m.classification}</td>
                        <td style={{ fontWeight: 700, color: "#1565c0" }}>{m.loan_count}</td>
                        <td className="fw green">₱{Number(m.total_amount).toLocaleString()}</td>
                        <td>₱{Number(m.share_capital).toLocaleString()}</td>
                        <td style={{ color: "#e65100", fontWeight: 600 }}>₱{Number(m.savings_balance || 0).toLocaleString()}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Member Performance Tab ───────────────────────────────────────────── */}
      {activeTab === "performance" && (
        <div className="rp-overview">
          <div className="rp-chart-title" style={{ marginBottom: 4 }}>Member Payment Performance ({selectedYear})</div>
          <div className="rp-chart-sub" style={{ marginBottom: 16 }}>
            Sino ang maganda at hindi maganda ang performance sa pagbabayad?
            Excellent (≥90%) · Good (≥70%) · Fair (≥50%) · Poor (&lt;50%)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
            {["Excellent", "Good", "Fair", "Poor"].map(r => {
              const count  = memberPerf.filter(m => m.rating === r).length;
              const colors = { Excellent: "#1b5e20", Good: "#2e7d32", Fair: "#f57c00", Poor: "#c62828" };
              const bgs    = { Excellent: "#e8f5e9", Good: "#f1f8e9", Fair: "#fff8e1", Poor: "#ffebee" };
              return (
                <div key={r} style={{ background: bgs[r], border: `1px solid ${colors[r]}22`, borderRadius: 12, padding: "16px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: colors[r] }}>{count}</div>
                  <div style={{ fontSize: 11, color: colors[r], fontWeight: 600 }}>{r} Performers</div>
                </div>
              );
            })}
          </div>
          <div className="rp-chart-card">
            <div className="rp-preview-table-wrap">
              <table className="rp-preview-table">
                <thead>
                  <tr><th>Rank</th><th>Member ID</th><th>Name</th><th>Classification</th><th>Payments</th><th>On Time</th><th>Late</th><th>Overdue</th><th>On-Time Rate</th><th>Total Paid</th><th>Savings</th><th>Rating</th></tr>
                </thead>
                <tbody>
                  {memberPerf.length === 0
                    ? <tr><td colSpan={12} style={{ textAlign: "center", color: "#aaa", padding: 20 }}>No payment data for this year.</td></tr>
                    : memberPerf.map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: "#2e7d32", textAlign: "center" }}>{i + 1}</td>
                        <td className="mono">{m.member_id}</td>
                        <td className="cell-name">{m.name}</td>
                        <td>{m.classification}</td>
                        <td style={{ textAlign: "center" }}>{m.total_payments}</td>
                        <td style={{ textAlign: "center", color: "#1b5e20", fontWeight: 600 }}>{m.on_time}</td>
                        <td style={{ textAlign: "center", color: "#f57c00" }}>{m.late}</td>
                        <td style={{ textAlign: "center", color: "#c62828" }}>{m.overdue_loans}</td>
                        <td style={{ textAlign: "center" }}><span style={{ fontWeight: 700, color: m.on_time_rate >= 80 ? "#1b5e20" : "#f57c00" }}>{m.on_time_rate}%</span></td>
                        <td className="green fw">₱{Number(m.total_paid).toLocaleString()}</td>
                        <td style={{ color: "#e65100", fontWeight: 600 }}>₱{Number(m.savings_balance || 0).toLocaleString()}</td>
                        <td><RatingBadge rating={m.rating}/></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
          <div className="rp-chart-card" style={{ marginTop: 16 }}>
            <div className="rp-chart-title">Share Capital &amp; Savings (Top 20 Members)</div>
            <div className="rp-chart-sub">Share capital grows with each loan (+3% CBU) · Max Loanable = Share Capital</div>
            <div className="rp-preview-table-wrap">
              <table className="rp-preview-table">
                <thead><tr><th>#</th><th>Member ID</th><th>Name</th><th>Classification</th><th>Loans Taken</th><th>Total Loaned</th><th>Share Capital</th><th>Max Loanable</th><th>Savings Balance</th></tr></thead>
                <tbody>
                  {shareCapital.length === 0
                    ? <tr><td colSpan={9} style={{ textAlign: "center", color: "#aaa", padding: 20 }}>No data yet.</td></tr>
                    : shareCapital.map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: "#2e7d32", textAlign: "center" }}>{i + 1}</td>
                        <td className="mono">{m.member_id}</td>
                        <td className="cell-name">{m.name}</td>
                        <td>{m.classification}</td>
                        <td style={{ textAlign: "center" }}>{m.loan_count}</td>
                        <td>₱{Number(m.total_loaned).toLocaleString()}</td>
                        <td style={{ fontWeight: 700, color: "#1b5e20" }}>₱{Number(m.share_capital).toLocaleString()}</td>
                        <td style={{ fontWeight: 700, color: "#1565c0" }}>₱{Number(m.max_loanable).toLocaleString()}</td>
                        <td style={{ fontWeight: 600, color: "#e65100" }}>₱{Number(m.savings_balance || 0).toLocaleString()}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Generate Report Tab ──────────────────────────────────────────────── */}
      {activeTab === "generate" && (
        <div className="rp-generate">
          <div className="rp-gen-card">
            <div className="rp-gen-title">Generate Report</div>
            <div className="rp-gen-form">
              <div className="rp-gen-field">
                <label className="rp-gen-label">Report Type</label>
                <select className="rp-gen-select" value={reportType} onChange={e => setReportType(e.target.value)}>
                  <option value="">Select report type...</option>
                  {REPORT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="rp-gen-field">
                <label className="rp-gen-label">Date From</label>
                <input className="rp-gen-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}/>
              </div>
              <div className="rp-gen-field">
                <label className="rp-gen-label">Date To</label>
                <input className="rp-gen-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}/>
              </div>
            </div>
            <div className="rp-gen-actions">
              <button className="rp-gen-btn preview" onClick={() => setPreview(true)} disabled={!reportType}>👁 Preview</button>
              <button className="rp-gen-btn excel" disabled={!reportType || exporting === "excel"}
                onClick={async () => { setExporting("excel"); try { await exportExcel(reportType, dateFrom, dateTo); } catch { alert("Failed."); } finally { setExporting(""); } }}>
                {exporting === "excel" ? "Exporting..." : "⬇ Export Excel"}
              </button>
              <button className="rp-gen-btn pdf" disabled={!reportType || exporting === "pdf"}
                onClick={async () => { setExporting("pdf"); try { await exportPDF(reportType, dateFrom, dateTo); } catch { alert("Failed."); } finally { setExporting(""); } }}>
                {exporting === "pdf" ? "Exporting..." : "📄 Export PDF"}
              </button>
            </div>
            {reportType && <div className="rp-gen-hint">💡 <strong>{reportType}</strong> — {dateFrom} to {dateTo}. Click Preview to see data before exporting.</div>}
          </div>
        </div>
      )}

      {/* ── Audit Log Tab ────────────────────────────────────────────────────── */}
      {activeTab === "audit" && (
        <div className="rp-audit">
          <div className="rp-audit-header">🔗 Blockchain Audit Log ({selectedYear})</div>
          <div className="rp-audit-table-wrap">
            <table className="rp-audit-table">
              <thead>
                <tr><th>Date</th><th>TX ID</th><th>Member</th><th>Member ID</th><th>Loan ID</th><th>Amount</th><th>Balance</th><th>Hash</th><th>By</th></tr>
              </thead>
              <tbody>
                {auditLog.length === 0
                  ? <tr><td colSpan={9} style={{ textAlign: "center", padding: "20px", color: "#aaa" }}>No transactions for {selectedYear}.</td></tr>
                  : auditLog.map((row, i) => (
                    <tr key={i}>
                      <td>{row.paid_at}</td>
                      <td className="mono" style={{ fontSize: 11 }}>{row.tx_id}</td>
                      <td className="cell-name">{row.member}</td>
                      <td className="mono">{row.member_id}</td>
                      <td className="mono">{row.loan_id}</td>
                      <td className="fw green">₱{Number(row.amount || 0).toLocaleString()}</td>
                      <td className="blue">₱{Number(row.balance || 0).toLocaleString()}</td>
                      <td><span className="hash-text">{row.hash}</span></td>
                      <td>{row.recorded_by}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}