import { useState } from "react";
import "./LoanApproval.css";

// ─── Mock Data ───────────────────────────────────────────────────────────────
const LOAN_TYPES = ["Regular Loan","Emergency Loan","Salary Loan","Housing Loan","Business Loan"];

const INITIAL_LOANS = [
  { id:"LA-2026-001", appId:"APP-2026-005", memberId:"LEAF-100-07", fullname:"Ana Gonzales",           loanType:"Housing Loan",   amount:80000, purpose:"House repair",           term:36, submittedAt:"2026-03-16 11:20", status:"For Review",  eligibility:"Eligible",     payBehavior:"On-time",  outstanding:0,    shareCapital:5000, remarks:"" },
  { id:"LA-2026-002", appId:"APP-2026-001", memberId:"LEAF-100-01", fullname:"Junelle Dinglasan",      loanType:"Regular Loan",   amount:15000, purpose:"Home renovation",         term:12, submittedAt:"2026-03-18 09:14", status:"For Review",  eligibility:"Eligible",     payBehavior:"On-time",  outstanding:0,    shareCapital:8000, remarks:"" },
  { id:"LA-2026-003", appId:"APP-2026-002", memberId:"LEAF-100-02", fullname:"MarkVincent Castillano", loanType:"Emergency Loan", amount:8000,  purpose:"Medical emergency",       term:6,  submittedAt:"2026-03-18 10:32", status:"For Review",  eligibility:"Eligible",     payBehavior:"On-time",  outstanding:0,    shareCapital:3000, remarks:"" },
  { id:"LA-2026-004", appId:"APP-2026-003", memberId:"LEAF-100-03", fullname:"Hillery Verastigue",     loanType:"Business Loan",  amount:50000, purpose:"Capital for sari-sari",   term:24, submittedAt:"2026-03-17 14:05", status:"Approved",    eligibility:"Eligible",     payBehavior:"On-time",  outstanding:0,    shareCapital:12000,remarks:"Good standing member." },
  { id:"LA-2026-005", appId:"APP-2026-004", memberId:"LEAF-100-06", fullname:"Jose Reyes",             loanType:"Regular Loan",   amount:20000, purpose:"Tuition fee",             term:12, submittedAt:"2026-03-17 08:50", status:"Declined",    eligibility:"Not Eligible", payBehavior:"Late",     outstanding:5000, shareCapital:1000, remarks:"Member has existing overdue balance." },
  { id:"LA-2026-006", appId:"APP-2026-008", memberId:"LEAF-100-11", fullname:"Lina Villanueva",        loanType:"Regular Loan",   amount:10000, purpose:"Appliance purchase",      term:12, submittedAt:"2026-03-14 13:30", status:"For Review",  eligibility:"Eligible",     payBehavior:"On-time",  outstanding:0,    shareCapital:4500, remarks:"" },
  { id:"LA-2026-007", appId:"APP-2026-010", memberId:"LEAF-100-13", fullname:"Nena Pascual",           loanType:"Salary Loan",    amount:7500,  purpose:"Family needs",            term:6,  submittedAt:"2026-03-12 08:40", status:"Approved",    eligibility:"Eligible",     payBehavior:"On-time",  outstanding:0,    shareCapital:6000, remarks:"Approved for 6 months." },
  { id:"LA-2026-008", appId:"APP-2026-011", memberId:"LEAF-100-15", fullname:"Ligaya Soriano",         loanType:"Regular Loan",   amount:25000, purpose:"Vehicle repair",          term:18, submittedAt:"2026-03-11 16:00", status:"Declined",    eligibility:"Eligible",     payBehavior:"Late",     outstanding:8000, shareCapital:2000, remarks:"Outstanding loan not yet settled." },
  { id:"LA-2026-009", appId:"APP-2026-012", memberId:"LEAF-100-05", fullname:"Maria Santos",           loanType:"Emergency Loan", amount:6000,  purpose:"Flood damage repair",     term:6,  submittedAt:"2026-03-10 11:55", status:"For Review",  eligibility:"Eligible",     payBehavior:"On-time",  outstanding:0,    shareCapital:7000, remarks:"" },
  { id:"LA-2026-010", appId:"APP-2026-009", memberId:"LEAF-100-12", fullname:"Ramon Aquino",           loanType:"Business Loan",  amount:35000, purpose:"Store expansion",         term:24, submittedAt:"2026-03-13 10:15", status:"For Review",  eligibility:"Not Eligible", payBehavior:"Late",     outstanding:12000,shareCapital:2500, remarks:"" },
];

const STATUS_TABS = ["All","For Review","Approved","Declined"];
const ROWS_PER_PAGE = 8;

const STATUS_COLOR = { "For Review":"status-review", "Approved":"status-approved", "Declined":"status-declined" };
const ELIG_COLOR   = { "Eligible":"elig-yes", "Not Eligible":"elig-no" };
const PAY_COLOR    = { "On-time":"pay-good", "Late":"pay-late" };

// ─── Process Modal ────────────────────────────────────────────────────────────
function ProcessModal({ loan, onClose, onApprove, onDecline }) {
  const [declineMode, setDeclineMode] = useState(false);
  const [remarks, setRemarks]         = useState(loan?.remarks || "");
  const [interest, setInterest]       = useState(loan ? (loan.loanType === "Emergency Loan" ? 3 : loan.loanType === "Housing Loan" ? 10 : 5) : 5);

  if (!loan) return null;

  const monthlyAmortization = loan.amount * ((interest / 100 / 12) / (1 - Math.pow(1 + interest / 100 / 12, -loan.term)));
  const totalPayable        = monthlyAmortization * loan.term;
  const totalInterest       = totalPayable - loan.amount;
  const loanableAmount      = loan.shareCapital * 3;
  const isEligible          = loan.eligibility === "Eligible";
  const hasOutstanding      = loan.outstanding > 0;

  // Upfront deductions
  const serviceCharge    = loan.amount * 0.01;          // 1% service charge
  const savingsDeduction = loan.amount * 0.02;          // 2% savings deposit
  const insuranceFee     = 50;                          // fixed insurance
  const totalDeductions  = serviceCharge + savingsDeduction + insuranceFee;
  const netProceeds      = loan.amount - totalDeductions;

  return (
    <div className="la-overlay" onClick={onClose}>
      <div className="la-modal" onClick={e => e.stopPropagation()}>
        <div className="la-modal-header">
          <div>
            <div className="la-modal-title">Loan Approval Processing</div>
            <div className="la-modal-sub">{loan.id} · {loan.appId}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span className={`la-badge ${STATUS_COLOR[loan.status]}`}>{loan.status}</span>
            <button className="la-modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="la-modal-body">

          {/* Applicant strip */}
          <div className="la-member-strip">
            <div className="la-member-avatar">{loan.fullname.charAt(0)}</div>
            <div className="la-member-info">
              <div className="la-member-name">{loan.fullname}</div>
              <div className="la-member-meta">{loan.memberId} · Submitted {loan.submittedAt}</div>
            </div>
            <div className="la-member-badges">
              <span className={`la-elig-badge ${ELIG_COLOR[loan.eligibility]}`}>{loan.eligibility === "Eligible" ? "✓" : "✗"} {loan.eligibility}</span>
              <span className={`la-pay-badge ${PAY_COLOR[loan.payBehavior]}`}>{loan.payBehavior} payer</span>
            </div>
          </div>

          {/* Loan request details */}
          <div className="la-section">
            <div className="la-section-title">📋 Loan Request</div>
            <div className="la-detail-grid">
              <div className="la-detail-item"><span className="la-dk">Loan Type</span><span className="la-dv">{loan.loanType}</span></div>
              <div className="la-detail-item"><span className="la-dk">Amount Requested</span><span className="la-dv green fw">₱{loan.amount.toLocaleString()}</span></div>
              <div className="la-detail-item"><span className="la-dk">Term</span><span className="la-dv">{loan.term} months</span></div>
              <div className="la-detail-item"><span className="la-dk">Purpose</span><span className="la-dv">{loan.purpose}</span></div>
            </div>
          </div>

          {/* Auto-eligibility summary */}
          <div className="la-section">
            <div className="la-section-title">🤖 Auto-Eligibility Check</div>
            <div className="la-eligibility-checks">
              <div className={`la-check-item ${!hasOutstanding ? "check-pass" : "check-fail"}`}>
                <span className="la-check-icon">{!hasOutstanding ? "✓" : "✗"}</span>
                <div>
                  <div className="la-check-label">Outstanding Balance</div>
                  <div className="la-check-sub">{hasOutstanding ? `Has ₱${loan.outstanding.toLocaleString()} outstanding` : "No outstanding balance"}</div>
                </div>
              </div>
              <div className={`la-check-item ${loan.payBehavior === "On-time" ? "check-pass" : "check-warn"}`}>
                <span className="la-check-icon">{loan.payBehavior === "On-time" ? "✓" : "⚠"}</span>
                <div>
                  <div className="la-check-label">Payment Behavior</div>
                  <div className="la-check-sub">{loan.payBehavior === "On-time" ? "Good payment history" : "Late payment records found"}</div>
                </div>
              </div>
              <div className={`la-check-item ${loan.amount <= loanableAmount ? "check-pass" : "check-fail"}`}>
                <span className="la-check-icon">{loan.amount <= loanableAmount ? "✓" : "✗"}</span>
                <div>
                  <div className="la-check-label">Share Capital Check</div>
                  <div className="la-check-sub">Share capital ₱{loan.shareCapital.toLocaleString()} → Max loanable: ₱{loanableAmount.toLocaleString()}</div>
                </div>
              </div>
              <div className={`la-check-item ${isEligible ? "check-pass" : "check-fail"}`}>
                <span className="la-check-icon">{isEligible ? "✓" : "✗"}</span>
                <div>
                  <div className="la-check-label">Overall Eligibility</div>
                  <div className="la-check-sub">{isEligible ? "Member passes all criteria" : "Member does not meet all criteria"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Loan computation */}
          <div className="la-section">
            <div className="la-section-title">🧮 Loan Computation</div>
            <div className="la-compute-row">
              <div className="la-compute-field">
                <label className="la-field-label">Interest Rate (% per year)</label>
                <div className="la-interest-wrap">
                  <input
                    className="la-interest-input"
                    type="number"
                    min="1" max="30" step="0.5"
                    value={interest}
                    onChange={e => setInterest(parseFloat(e.target.value) || 0)}
                  />
                  <span className="la-pct">%</span>
                </div>
              </div>
              <div className="la-compute-results">
                <div className="la-result-item"><span>Monthly Amortization</span><span className="green fw">₱{monthlyAmortization.toFixed(2)}</span></div>
                <div className="la-result-item"><span>Total Interest</span><span className="orange fw">₱{totalInterest.toFixed(2)}</span></div>
                <div className="la-result-item highlight"><span>Total Payable</span><span className="fw">₱{totalPayable.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          {/* Upfront deductions */}
          <div className="la-section">
            <div className="la-section-title">💰 Upfront Deductions</div>
            <div className="la-deduction-box">
              <div className="la-deduct-row">
                <span className="la-deduct-label">Loan Amount</span>
                <span className="la-deduct-val">₱{loan.amount.toLocaleString()}</span>
              </div>
              <div className="la-deduct-divider" />
              <div className="la-deduct-row">
                <span className="la-deduct-label">Service Charge <span className="la-deduct-rate">(1%)</span></span>
                <span className="la-deduct-val red">− ₱{serviceCharge.toFixed(2)}</span>
              </div>
              <div className="la-deduct-row">
                <span className="la-deduct-label">Savings Deposit <span className="la-deduct-rate">(2%)</span></span>
                <span className="la-deduct-val red">− ₱{savingsDeduction.toFixed(2)}</span>
              </div>
              <div className="la-deduct-row">
                <span className="la-deduct-label">Insurance Fee <span className="la-deduct-rate">(fixed)</span></span>
                <span className="la-deduct-val red">− ₱{insuranceFee.toFixed(2)}</span>
              </div>
              <div className="la-deduct-divider" />
              <div className="la-deduct-row la-net-row">
                <span className="la-deduct-label">Net Proceeds <span className="la-deduct-rate">(actual release)</span></span>
                <span className="la-net-val">₱{netProceeds.toFixed(2)}</span>
              </div>
            </div>
            <div className="la-deduct-notice">
              💡 The member will receive <strong>₱{netProceeds.toFixed(2)}</strong> — the loan amount after upfront deductions.
            </div>
          </div>

          {/* Remarks */}
          <div className="la-section">
            <div className="la-section-title">{declineMode ? "✗ Reason for Decline" : "📝 Remarks / Notes"}</div>
            <textarea
              className={`la-textarea ${declineMode ? "decline-mode" : ""}`}
              placeholder={declineMode ? "State the reason for declining this loan application..." : "Optional: Add remarks or conditions for this loan..."}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={3}
            />
          </div>

          {/* Already processed notices */}
          {loan.status === "Approved" && (
            <div className="la-notice la-notice-approved">
              ✓ This loan has been <strong>approved</strong>. Member has been notified. Loan is now active.
            </div>
          )}
          {loan.status === "Declined" && (
            <div className="la-notice la-notice-declined">
              ✗ This loan has been <strong>declined</strong>. Member has been notified with the reason.
            </div>
          )}
        </div>

        <div className="la-modal-footer">
          {!declineMode ? (
            <>
              <button className="la-btn-cancel" onClick={onClose}>Close</button>
              {loan.status === "For Review" && (
                <>
                  <button className="la-btn-decline-soft" onClick={() => setDeclineMode(true)}>✗ Decline</button>
                  <button className="la-btn-approve" onClick={() => onApprove(loan.id, remarks, parseFloat(monthlyAmortization.toFixed(2)))}>
                    ✓ Approve Loan
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button className="la-btn-cancel" onClick={() => { setDeclineMode(false); }}>← Back</button>
              <button className="la-btn-decline-confirm" onClick={() => onDecline(loan.id, remarks)} disabled={!remarks.trim()}>
                Confirm Decline
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LoanApproval() {
  const [loans, setLoans]         = useState(INITIAL_LOANS);
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilter] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [page, setPage]           = useState(1);
  const [processLoan, setProcess] = useState(null);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  // Summary counts
  const counts = {
    forReview: loans.filter(l => l.status === "For Review").length,
    approved:  loans.filter(l => l.status === "Approved").length,
    declined:  loans.filter(l => l.status === "Declined").length,
    totalAmt:  loans.filter(l => l.status === "Approved").reduce((s, l) => s + l.amount, 0),
  };

  // Filtered
  const filtered = loans.filter(l => {
    const matchStatus = filterStatus === "All" || l.status === filterStatus;
    const matchType   = filterType   === "All" || l.loanType === filterType;
    const q = search.toLowerCase();
    return matchStatus && matchType && (
      l.id.toLowerCase().includes(q) ||
      l.fullname.toLowerCase().includes(q) ||
      l.memberId.toLowerCase().includes(q) ||
      l.loanType.toLowerCase().includes(q) ||
      l.purpose.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleApprove = (id, remarks, monthlyAmt) => {
    setLoans(prev => prev.map(l => l.id === id ? { ...l, status: "Approved", remarks } : l));
    setProcess(null);
    const loan = loans.find(l => l.id === id);
    showToast(`Loan approved for ${loan.fullname}. Monthly amortization: ₱${monthlyAmt.toLocaleString()}. Member notified.`);
  };

  const handleDecline = (id, remarks) => {
    setLoans(prev => prev.map(l => l.id === id ? { ...l, status: "Declined", remarks } : l));
    setProcess(null);
    const loan = loans.find(l => l.id === id);
    showToast(`Loan declined for ${loan.fullname}. Member notified.`, "danger");
  };

  // Sync modal with updated state
  const currentProcess = processLoan ? loans.find(l => l.id === processLoan.id) : null;

  return (
    <div className="la-wrapper">

      {toast && <div className={`la-toast la-toast-${toast.type}`}>{toast.msg}</div>}

      <ProcessModal
        loan={currentProcess}
        onClose={() => setProcess(null)}
        onApprove={handleApprove}
        onDecline={handleDecline}
      />

      {/* Header */}
      <div className="la-page-header">
        <div>
          <div className="la-page-title">Loan Approval</div>
          <div className="la-page-sub">Evaluate, compute, and process member loan applications forwarded from online applications.</div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="la-summary-grid">
        <div className="la-summary-card clickable" onClick={() => { setFilter("For Review"); setPage(1); }}>
          <div className="la-sum-icon" style={{ background:"#fff8e1" }}>⏳</div>
          <div>
            <div className="la-sum-val orange">{counts.forReview}</div>
            <div className="la-sum-label">For Review</div>
          </div>
        </div>
        <div className="la-summary-card clickable" onClick={() => { setFilter("Approved"); setPage(1); }}>
          <div className="la-sum-icon" style={{ background:"#e8f5e9" }}>✓</div>
          <div>
            <div className="la-sum-val green">{counts.approved}</div>
            <div className="la-sum-label">Approved</div>
          </div>
        </div>
        <div className="la-summary-card clickable" onClick={() => { setFilter("Declined"); setPage(1); }}>
          <div className="la-sum-icon" style={{ background:"#fce4ec" }}>✗</div>
          <div>
            <div className="la-sum-val red">{counts.declined}</div>
            <div className="la-sum-label">Declined</div>
          </div>
        </div>
        <div className="la-summary-card">
          <div className="la-sum-icon" style={{ background:"#e3f2fd" }}>💰</div>
          <div>
            <div className="la-sum-val blue">₱{counts.totalAmt.toLocaleString()}</div>
            <div className="la-sum-label">Total Approved Amount</div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="la-card">
        {/* Toolbar */}
        <div className="la-toolbar">
          <div className="la-search-wrap">
            <span className="la-search-icon">🔍</span>
            <input
              className="la-search-input"
              placeholder="Search by Loan ID, Name, Member ID, Purpose..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            {search && <button className="la-clear-btn" onClick={() => { setSearch(""); setPage(1); }}>✕</button>}
          </div>

          <div className="la-filters">
            <select className="la-select" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
              <option value="All">All Loan Types</option>
              {LOAN_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>

            <div className="la-status-tabs">
              {STATUS_TABS.map(s => (
                <button
                  key={s}
                  className={`la-status-tab ${filterStatus === s ? "active" : ""} ltab-${s.replace(" ","-").toLowerCase()}`}
                  onClick={() => { setFilter(s); setPage(1); }}
                >
                  {s}
                  {s !== "All" && <span className="la-tab-count">{loans.filter(l => l.status === s).length}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="la-table-wrap">
          <table className="la-table">
            <thead>
              <tr>
                <th style={{width:"11%"}}>Loan ID</th>
                <th style={{width:"11%"}}>Member ID</th>
                <th style={{width:"17%"}}>Full Name</th>
                <th style={{width:"14%"}}>Loan Type</th>
                <th style={{width:"9%"}}>Amount</th>
                <th style={{width:"5%"}}>Term</th>
                <th style={{width:"10%"}}>Eligibility</th>
                <th style={{width:"8%"}}>Pay Record</th>
                <th style={{width:"8%"}}>Status</th>
                <th style={{width:"7%",textAlign:"center"}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={10} className="la-empty">No loan applications found.</td></tr>
              ) : paginated.map((l, idx) => (
                <tr key={l.id} className={`${idx % 2 === 0 ? "row-even" : "row-odd"} la-clickable`} onClick={() => setProcess(l)}>
                  <td className="mono cell-id">{l.id}</td>
                  <td className="mono">{l.memberId}</td>
                  <td className="cell-name">{l.fullname}</td>
                  <td><span className="la-type-pill">{l.loanType}</span></td>
                  <td className="fw green">₱{l.amount.toLocaleString()}</td>
                  <td className="cell-center">{l.term}mo</td>
                  <td><span className={`la-elig-badge ${ELIG_COLOR[l.eligibility]}`}>{l.eligibility === "Eligible" ? "✓ Eligible" : "✗ Not Eligible"}</span></td>
                  <td><span className={`la-pay-badge ${PAY_COLOR[l.payBehavior]}`}>{l.payBehavior}</span></td>
                  <td><span className={`la-badge ${STATUS_COLOR[l.status]}`}>{l.status}</span></td>
                  <td style={{textAlign:"center"}}>
                    <button className={`la-process-btn ${l.status === "For Review" ? "btn-review" : "btn-view"}`} onClick={e => { e.stopPropagation(); setProcess(l); }}>
                      {l.status === "For Review" ? "Process" : "View"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="la-footer">
          <div className="la-count">
            Showing {filtered.length === 0 ? 0 : (safePage-1)*ROWS_PER_PAGE+1}–{Math.min(safePage*ROWS_PER_PAGE, filtered.length)} of {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            <span className="la-hint"> — click any row to process</span>
          </div>
          <div className="la-pagination">
            <button className="la-page-btn" disabled={safePage===1} onClick={() => setPage(p=>p-1)}>← Prev</button>
            {Array.from({length:totalPages},(_,i)=>i+1)
              .filter(p=>p===1||p===totalPages||Math.abs(p-safePage)<=1)
              .reduce((acc,p,i,arr)=>{if(i>0&&p-arr[i-1]>1)acc.push("...");acc.push(p);return acc;},[])
              .map((p,i)=>p==="..."
                ?<span key={`e${i}`} className="la-ellipsis">…</span>
                :<button key={p} className={`la-page-btn la-page-num ${safePage===p?"active":""}`} onClick={()=>setPage(p)}>{p}</button>
              )}
            <button className="la-page-btn" disabled={safePage===totalPages} onClick={() => setPage(p=>p+1)}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}