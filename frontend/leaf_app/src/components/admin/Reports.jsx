import { useState, useEffect } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from "chart.js";
import { getOverviewAPI, getMonthlyCollectionAPI, getLoanStatusAPI, getLoanTypeAPI, getPaymentBehaviorAPI, getAuditLogAPI, previewReportAPI, exportExcel, exportPDF } from "../../api/reports";
import { BarChart2, TrendingUp, FileText, Link2 } from "lucide-react";
import "./Reports.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const REPORT_TYPES = ["Financial Summary","Collection Report","Loan Summary","Member Report","Payment Behavior","Blockchain Audit Log"];

function ReportPreviewModal({ type, dateFrom, dateTo, onClose }) {
  const [data,    setData]    = useState(null);
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

  const handleExcel = async () => {
    setExp("excel");
    try { await exportExcel(type, dateFrom, dateTo); }
    catch { alert("Failed to export Excel."); }
    finally { setExp(""); }
  };

  const handlePDF = async () => {
    setExp("pdf");
    try { await exportPDF(type, dateFrom, dateTo); }
    catch { alert("Failed to export PDF."); }
    finally { setExp(""); }
  };

  return (
    <div className="rp-overlay" onClick={onClose}>
      <div className="rp-modal rp-modal-lg" onClick={e=>e.stopPropagation()}>
        <div className="rp-modal-header">
          <div>
            <div className="rp-modal-title">📄 {type}</div>
            <div className="rp-modal-sub">Period: {dateFrom} to {dateTo} · Generated {new Date().toLocaleString()}</div>
          </div>
          <button className="rp-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="rp-modal-body">
          {loading ? (
            <div className="rp-loading">Loading report data...</div>
          ) : !data ? (
            <div className="rp-no-data">Failed to load report.</div>
          ) : (
            <>
              {/* Header */}
              <div className="rp-preview-header">
                <div className="rp-preview-logo">🌿 LEAF MPC</div>
                <div className="rp-preview-info">
                  <div className="rp-preview-title">{type}</div>
                  <div className="rp-preview-period">Period: {dateFrom} – {dateTo}</div>
                </div>
              </div>

              {/* Summary */}
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

              {/* Table */}
              {data.columns?.length > 0 && (
                <>
                  <div className="rp-preview-count">
                    Showing {Math.min(data.rows?.length||0, 50)} of {data.total_rows} records
                    {data.total_rows > 50 && " — Export for full data"}
                  </div>
                  <div className="rp-preview-table-wrap">
                    <table className="rp-preview-table">
                      <thead>
                        <tr>{data.columns.map((c,i) => <th key={i}>{c}</th>)}</tr>
                      </thead>
                      <tbody>
                        {data.rows?.length === 0 ? (
                          <tr><td colSpan={data.columns.length} style={{textAlign:"center",padding:"20px",color:"#aaa"}}>No data for this period.</td></tr>
                        ) : data.rows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
                          </tr>
                        ))}
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
          <button className="rp-btn-export excel" onClick={handleExcel} disabled={!!exporting}>
            {exporting==="excel" ? "Exporting..." : "⬇ Export Excel"}
          </button>
          <button className="rp-btn-export pdf" onClick={handlePDF} disabled={!!exporting}>
            {exporting==="pdf" ? "Exporting..." : "📄 Export PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const [activeTab, setTab]       = useState("overview");
  const [overview,  setOverview]  = useState({});
  const [monthly,   setMonthly]   = useState([]);
  const [loanStat,  setLoanStat]  = useState({});
  const [loanType,  setLoanType]  = useState({});
  const [payBehav,  setPayBehav]  = useState({});
  const [auditLog,  setAuditLog]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [dateFrom,  setDateFrom]  = useState("2026-01-01");
  const [dateTo,    setDateTo]    = useState("2026-12-31");
  const [reportType,setReportType]= useState("");
  const [showPreview,setPreview]  = useState(false);
  const [exporting,  setExporting]= useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [ov,mn,ls,lt,pb,al] = await Promise.allSettled([
          getOverviewAPI(), getMonthlyCollectionAPI(), getLoanStatusAPI(),
          getLoanTypeAPI(), getPaymentBehaviorAPI(), getAuditLogAPI(),
        ]);
        if (ov.status==="fulfilled") setOverview(ov.value);
        if (mn.status==="fulfilled") setMonthly(mn.value);
        if (ls.status==="fulfilled") setLoanStat(ls.value);
        if (lt.status==="fulfilled") setLoanType(lt.value);
        if (pb.status==="fulfilled") setPayBehav(pb.value);
        if (al.status==="fulfilled") setAuditLog(al.value);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const barData = {
    labels: monthly.map(m=>m.month),
    datasets: [{
      label: "Collection",
      data: monthly.map(m=>m.total),
      backgroundColor: monthly.map((_,i)=>["#2e7d32","#4caf50","#81c784","#a5d6a7","#ffb74d","#ff8a65","#64b5f6","#ba68c8","#4dd0e1","#f06292","#aed581","#ffcc02"][i%12]),
      borderRadius: 5,
    }],
  };
  const barOpts = { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{grid:{color:"#f0f4f1"},ticks:{font:{size:10},callback:v=>"₱"+v.toLocaleString()}}} };

  // Loan Status Bar Chart
  const loanStatLabels = Object.keys(loanStat);
  const loanStatData = {
    labels: loanStatLabels.length ? loanStatLabels : ["For Review","Active","Declined","Completed","Overdue"],
    datasets: [{
      label: "Loans",
      data: loanStatLabels.length ? Object.values(loanStat) : [0,0,0,0,0],
      backgroundColor: ["#f57c00","#2e7d32","#e53935","#1565c0","#c62828"],
      borderRadius: 5,
    }],
  };
  const loanStatOpts = { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{grid:{color:"#f0f4f1"},ticks:{font:{size:10}}}} };

  // Loan Type Doughnut Chart
  const loanTypeLabels = Object.keys(loanType);
  const loanTypeData = {
    labels: loanTypeLabels.length ? loanTypeLabels : ["Regular","Emergency","Salary","Housing","Business"],
    datasets: [{
      data: loanTypeLabels.length ? Object.values(loanType) : [0,0,0,0,0],
      backgroundColor: ["#2e7d32","#4caf50","#f57c00","#1565c0","#a5d6a7"],
      borderWidth: 0,
    }],
  };
  const loanTypeOpts = { responsive:true, maintainAspectRatio:false, cutout:"60%", plugins:{legend:{position:"right",labels:{boxWidth:10,font:{size:10}}}} };

  const donutLabels = Object.keys(payBehav);
  const donutData = {
    labels: donutLabels.length ? donutLabels : ["On time","Defaulted","Late"],
    datasets: [{
      data: donutLabels.length ? Object.values(payBehav) : [0,0,0],
      backgroundColor: ["#2e7d32","#f57c00","#e53935"],
      borderWidth: 0,
    }],
  };
  const donutOpts = { responsive:true, maintainAspectRatio:false, cutout:"60%", plugins:{legend:{position:"right",labels:{boxWidth:10,font:{size:10}}}} };

  const OVERVIEW_CARDS = [
    { icon:"💰", val:`₱${Number(overview.total_collection||0).toLocaleString()}`, label:"Total Collection (YTD)", color:"green" },
    { icon:"📋", val:`₱${Number(overview.total_releases||0).toLocaleString()}`,   label:"Total Loan Releases", color:"blue" },
    { icon:"👥", val:`${overview.active_members||0} / ${overview.inactive_members||0}`, label:"Active / Inactive Members", color:"teal" },
    { icon:"📈", val:`${overview.collection_rate||0}%`,                            label:"Collection Rate", color:"green" },
    { icon:"🏦", val:`${overview.total_loans||0}`,                                 label:"Loan Releases (YTD)", color:"blue" },
    { icon:"⚠️", val:`${overview.overdue_loans||0}`,                              label:"Overdue Loans", color:"red" },
    { icon:"⏳", val:`${overview.pending_loans||0}`,                               label:"Pending Approvals", color:"orange" },
    { icon:"💳", val:`₱${Number(overview.avg_loan_amount||0).toLocaleString()}`,  label:"Avg Loan Amount", color:"purple" },
  ];

  return (
    <div className="rp-wrapper">
      {showPreview && <ReportPreviewModal type={reportType} dateFrom={dateFrom} dateTo={dateTo} onClose={()=>setPreview(false)}/>}

      {/* Page Header */}
      <div className="rp-page-header">
        <div>
          <div className="rp-page-title">Reports &amp; Analytics</div>
          <div className="rp-page-sub">Financial summaries , loan analytics, and payment behavior reports. Export Excel or PDF.</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rp-main-tabs">
        <button className={`rp-main-tab ${activeTab==="overview"?"active":""}`} onClick={()=>setTab("overview")}><BarChart2 size={13}/> Overview</button>
        <button className={`rp-main-tab ${activeTab==="charts"?"active":""}`}   onClick={()=>setTab("charts")}><TrendingUp size={13}/> Charts</button>
        <button className={`rp-main-tab ${activeTab==="generate"?"active":""}`} onClick={()=>setTab("generate")}><FileText size={13}/> Generate Report</button>
        <button className={`rp-main-tab ${activeTab==="audit"?"active":""}`}    onClick={()=>setTab("audit")}><Link2 size={13}/> Audit Log</button>
      </div>

      {/* Overview Tab */}
      {activeTab==="overview" && (
        <div className="rp-overview">
          {loading ? (
            <div className="rp-loading">Loading reports...</div>
          ) : (
            <div className="rp-kpi-grid">
              {OVERVIEW_CARDS.map((c,i)=>(
                <div key={i} className={`rp-kpi-card ${c.color||""}`}>
                  <div className="rp-kpi-icon">{c.icon}</div>
                  <div className="rp-kpi-val">{c.val}</div>
                  <div className="rp-kpi-label">{c.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Charts Tab */}
      {activeTab==="charts" && (
        <div className="rp-quick-charts">
          <div className="rp-chart-card rp-chart-wide">
            <div className="rp-chart-title">Monthly Collection Trend</div>
            <div style={{height:280}}>
              {monthly.length===0
                ? <div className="rp-no-data">No collection data yet.</div>
                : <Bar data={barData} options={barOpts}/>
              }
            </div>
          </div>
          <div className="rp-chart-card">
            <div className="rp-chart-title">Payment Behavior</div>
            <div style={{height:220}}>
              <Doughnut data={donutData} options={donutOpts}/>
            </div>
          </div>
          <div className="rp-chart-card">
            <div className="rp-chart-title">Loan Status Distribution</div>
            <div style={{height:220}}>
              {loanStatLabels.length===0
                ? <div className="rp-no-data">No loan data yet.</div>
                : <Bar data={loanStatData} options={loanStatOpts}/>
              }
            </div>
          </div>
          <div className="rp-chart-card">
            <div className="rp-chart-title">Loan Type Breakdown</div>
            <div style={{height:220}}>
              <Doughnut data={loanTypeData} options={loanTypeOpts}/>
            </div>
          </div>
        </div>
      )}

      {/* Generate Report Tab */}
      {activeTab==="generate" && (
        <div className="rp-generate">
          <div className="rp-gen-card">
            <div className="rp-gen-title">Generate Report</div>
            <div className="rp-gen-form">
              <div className="rp-gen-field">
                <label className="rp-gen-label">Report Type</label>
                <select className="rp-gen-select" value={reportType} onChange={e=>setReportType(e.target.value)}>
                  <option value="">Select report type...</option>
                  {REPORT_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="rp-gen-field">
                <label className="rp-gen-label">Date From</label>
                <input className="rp-gen-input" type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
              </div>
              <div className="rp-gen-field">
                <label className="rp-gen-label">Date To</label>
                <input className="rp-gen-input" type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
              </div>
            </div>
            <div className="rp-gen-actions">
              <button className="rp-gen-btn preview" onClick={()=>setPreview(true)} disabled={!reportType}>
                👁 Preview
              </button>
              <button className="rp-gen-btn excel" disabled={!reportType || exporting==="excel"}
                onClick={async () => {
                  setExporting("excel");
                  try { await exportExcel(reportType, dateFrom, dateTo); }
                  catch { alert("Failed to export Excel."); }
                  finally { setExporting(""); }
                }}>
                {exporting==="excel" ? "Exporting..." : "⬇ Export Excel"}
              </button>
              <button className="rp-gen-btn pdf" disabled={!reportType || exporting==="pdf"}
                onClick={async () => {
                  setExporting("pdf");
                  try { await exportPDF(reportType, dateFrom, dateTo); }
                  catch { alert("Failed to export PDF."); }
                  finally { setExporting(""); }
                }}>
                {exporting==="pdf" ? "Exporting..." : "📄 Export PDF"}
              </button>
            </div>
            {reportType && (
              <div className="rp-gen-hint">
                💡 <strong>{reportType}</strong> — {dateFrom} to {dateTo}. Click Preview to see data before exporting.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab==="audit" && (
        <div className="rp-audit">
          <div className="rp-audit-header">🔗 Blockchain Audit Log</div>
          <div className="rp-audit-table-wrap">
            <table className="rp-audit-table">
              <thead><tr><th>Date</th><th>Member</th><th>Member ID</th><th>Loan ID</th><th>Amount</th><th>Balance</th><th>Hash</th><th>By</th></tr></thead>
              <tbody>
                {auditLog.length===0 ? (
                  <tr><td colSpan={8} style={{textAlign:"center",padding:"20px",color:"#aaa"}}>No audit log yet.</td></tr>
                ) : auditLog.map((row,i)=>(
                  <tr key={i}>
                    <td>{row.paid_at}</td>
                    <td className="cell-name">{row.member}</td>
                    <td className="mono">{row.member_id}</td>
                    <td className="mono">{row.loan_id}</td>
                    <td className="fw green">₱{Number(row.amount||0).toLocaleString()}</td>
                    <td className="blue">₱{Number(row.balance||0).toLocaleString()}</td>
                    <td><span className="hash-text">{row.hash}</span></td>
                    <td>{row.recorded_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}