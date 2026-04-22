import { useState, useEffect } from "react";
import { getLoansAPI, updateLoanStatusAPI } from "../../api/loans";
import "./LoanApproval.css";

const LOAN_TYPES  = ["Regular Loan","Emergency Loan","Salary Loan","Housing Loan","Business Loan","Other Loan"];
const STATUS_TABS = ["All","For Review","Approved","Declined"];
const ROWS_PER_PAGE = 8;
const STATUS_COLOR  = { "For Review":"status-review", "Approved":"status-approved", "Declined":"status-declined" };

function ProcessModal({ loan, onClose, onApprove, onDecline }) {
  const [declineMode, setDeclineMode] = useState(false);
  const [remarks,     setRemarks]     = useState(loan?.remarks||"");
  const [interest,    setInterest]    = useState(5);
  const [loading,     setLoading]     = useState(false);
  if (!loan) return null;

  const amount    = parseFloat(loan.amount||0);
  const term      = parseInt(loan.term_months||loan.term||12);
  const r         = interest/100/12;
  const monthly   = amount * (r/(1-Math.pow(1+r,-term)));
  const totalPay  = monthly * term;
  const totalInt  = totalPay - amount;
  const shareCapital  = parseFloat(loan.member_share_capital||0);
  const loanableAmt   = shareCapital * 3;
  const svcCharge     = amount * 0.01;
  const savingsDed    = amount * 0.02;
  const insurance     = 50;
  const netProceeds   = amount - svcCharge - savingsDed - insurance;

  const handleApprove = async () => {
    setLoading(true);
    try { await onApprove(loan.id, remarks, parseFloat(monthly.toFixed(2))); }
    finally { setLoading(false); }
  };
  const handleDecline = async () => {
    if (!remarks.trim()) return;
    setLoading(true);
    try { await onDecline(loan.id, remarks); }
    finally { setLoading(false); }
  };

  return (
    <div className="la-overlay" onClick={onClose}>
      <div className="la-modal" onClick={e=>e.stopPropagation()}>
        <div className="la-modal-header">
          <div><div className="la-modal-title">Loan Approval Processing</div><div className="la-modal-sub">{loan.loan_id}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span className={`la-badge ${STATUS_COLOR[loan.status]}`}>{loan.status}</span>
            <button className="la-modal-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="la-modal-body">

          <div className="la-member-strip">
            <div className="la-member-avatar">{(loan.member_name||"M")[0]}</div>
            <div className="la-member-info">
              <div className="la-member-name">{loan.member_name}</div>
              <div className="la-member-meta">{loan.member_code} · Submitted {loan.applied_at}</div>
            </div>
          </div>

          <div className="la-section">
            <div className="la-section-title">📋 Loan Request</div>
            <div className="la-detail-grid">
              <div className="la-detail-item"><span className="la-dk">Loan Type</span><span className="la-dv">{loan.loan_type}</span></div>
              <div className="la-detail-item"><span className="la-dk">Amount</span><span className="la-dv green fw">₱{amount.toLocaleString()}</span></div>
              <div className="la-detail-item"><span className="la-dk">Term</span><span className="la-dv">{term} months</span></div>
              <div className="la-detail-item"><span className="la-dk">Purpose</span><span className="la-dv">{loan.purpose}</span></div>
            </div>
          </div>

          <div className="la-section">
            <div className="la-section-title">🧮 Loan Computation</div>
            <div className="la-compute-row">
              <div className="la-compute-field">
                <label className="la-field-label">Interest Rate (% per year)</label>
                <div className="la-interest-wrap">
                  <input className="la-interest-input" type="number" min="1" max="30" step="0.5" value={interest} onChange={e=>setInterest(parseFloat(e.target.value)||0)}/>
                  <span className="la-pct">%</span>
                </div>
              </div>
              <div className="la-compute-results">
                <div className="la-result-item"><span>Monthly Amortization</span><span className="green fw">₱{monthly.toFixed(2)}</span></div>
                <div className="la-result-item"><span>Total Interest</span><span className="orange fw">₱{totalInt.toFixed(2)}</span></div>
                <div className="la-result-item highlight"><span>Total Payable</span><span className="fw">₱{totalPay.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          <div className="la-section">
            <div className="la-section-title">💰 Upfront Deductions</div>
            <div className="la-deduction-box">
              <div className="la-deduct-row"><span className="la-deduct-label">Loan Amount</span><span className="la-deduct-val">₱{amount.toLocaleString()}</span></div>
              <div className="la-deduct-divider"/>
              <div className="la-deduct-row"><span className="la-deduct-label">Service Charge <span className="la-deduct-rate">(1%)</span></span><span className="la-deduct-val red">− ₱{svcCharge.toFixed(2)}</span></div>
              <div className="la-deduct-row"><span className="la-deduct-label">Savings Deposit <span className="la-deduct-rate">(2%)</span></span><span className="la-deduct-val red">− ₱{savingsDed.toFixed(2)}</span></div>
              <div className="la-deduct-row"><span className="la-deduct-label">Insurance Fee <span className="la-deduct-rate">(fixed)</span></span><span className="la-deduct-val red">− ₱{insurance.toFixed(2)}</span></div>
              <div className="la-deduct-divider"/>
              <div className="la-deduct-row la-net-row"><span className="la-deduct-label">Net Proceeds</span><span className="la-net-val">₱{netProceeds.toFixed(2)}</span></div>
            </div>
          </div>

          <div className="la-section">
            <div className="la-section-title">{declineMode?"✗ Reason for Decline":"📝 Remarks / Notes"}</div>
            <textarea className={`la-textarea ${declineMode?"decline-mode":""}`} placeholder={declineMode?"State the reason for declining...":"Optional: Add remarks..."} value={remarks} onChange={e=>setRemarks(e.target.value)} rows={3}/>
          </div>

          {loan.status==="Approved" && <div className="la-notice la-notice-approved">✓ This loan has been <strong>approved</strong>.</div>}
          {loan.status==="Declined" && <div className="la-notice la-notice-declined">✗ This loan has been <strong>declined</strong>.</div>}
        </div>

        <div className="la-modal-footer">
          {!declineMode ? (
            <>
              <button className="la-btn-cancel" onClick={onClose}>Close</button>
              {loan.status==="For Review" && (
                <>
                  <button className="la-btn-decline-soft" onClick={()=>setDeclineMode(true)}>✗ Decline</button>
                  <button className="la-btn-approve" onClick={handleApprove} disabled={loading}>{loading?"Approving...":"✓ Approve Loan"}</button>
                </>
              )}
            </>
          ) : (
            <>
              <button className="la-btn-cancel" onClick={()=>setDeclineMode(false)}>← Back</button>
              <button className="la-btn-decline-confirm" onClick={handleDecline} disabled={!remarks.trim()||loading}>{loading?"Declining...":"Confirm Decline"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoanApproval() {
  const [loans,       setLoans]    = useState([]);
  const [loading,     setLoading]  = useState(true);
  const [search,      setSearch]   = useState("");
  const [filterStatus,setFilter]   = useState("All");
  const [filterType,  setFilterType]=useState("All");
  const [page,        setPage]     = useState(1);
  const [processLoan, setProcess]  = useState(null);
  const [toast,       setToast]    = useState(null);

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const data = await getLoansAPI();
      setLoans(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLoans(); }, []);

  const counts = {
    forReview: loans.filter(l=>l.status==="For Review").length,
    approved:  loans.filter(l=>l.status==="Approved").length,
    declined:  loans.filter(l=>l.status==="Declined").length,
    totalAmt:  loans.filter(l=>l.status==="Approved").reduce((s,l)=>s+parseFloat(l.amount||0),0),
  };

  const filtered = loans.filter(l => {
    const matchStatus = filterStatus==="All" || l.status===filterStatus;
    const matchType   = filterType==="All"   || l.loan_type===filterType;
    const q = search.toLowerCase();
    return matchStatus && matchType && (
      (l.loan_id||"").toLowerCase().includes(q) ||
      (l.member_name||"").toLowerCase().includes(q) ||
      (l.member_code||"").toLowerCase().includes(q) ||
      (l.loan_type||"").toLowerCase().includes(q) ||
      (l.purpose||"").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length/ROWS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage-1)*ROWS_PER_PAGE, safePage*ROWS_PER_PAGE);

  const handleApprove = async (id, remarks, monthlyAmt) => {
    try {
      await updateLoanStatusAPI(id, "Approved");
      setProcess(null);
      const loan = loans.find(l=>l.id===id);
      showToast(`Loan approved for ${loan?.member_name}. Monthly: ₱${monthlyAmt.toLocaleString()}`);
      fetchLoans();
    } catch { showToast("Failed to approve loan.", "danger"); }
  };

  const handleDecline = async (id, remarks) => {
    try {
      await updateLoanStatusAPI(id, "Declined", remarks);
      setProcess(null);
      const loan = loans.find(l=>l.id===id);
      showToast(`Loan declined for ${loan?.member_name}.`, "danger");
      fetchLoans();
    } catch { showToast("Failed to decline loan.", "danger"); }
  };

  const currentProcess = processLoan ? loans.find(l=>l.id===processLoan.id) : null;

  return (
    <div className="la-wrapper">
      {toast && <div className={`la-toast la-toast-${toast.type}`}>{toast.msg}</div>}
      <ProcessModal loan={currentProcess} onClose={()=>setProcess(null)} onApprove={handleApprove} onDecline={handleDecline}/>

      <div className="la-page-header">
        <div><div className="la-page-title">Loan Approval</div><div className="la-page-sub">Evaluate, compute, and process member loan applications.</div></div>
      </div>

      <div className="la-summary-grid">
        <div className="la-summary-card clickable" onClick={()=>{setFilter("For Review");setPage(1);}}>
          <div className="la-sum-icon" style={{background:"#fff8e1"}}>⏳</div>
          <div><div className="la-sum-val orange">{counts.forReview}</div><div className="la-sum-label">For Review</div></div>
        </div>
        <div className="la-summary-card clickable" onClick={()=>{setFilter("Approved");setPage(1);}}>
          <div className="la-sum-icon" style={{background:"#e8f5e9"}}>✓</div>
          <div><div className="la-sum-val green">{counts.approved}</div><div className="la-sum-label">Approved</div></div>
        </div>
        <div className="la-summary-card clickable" onClick={()=>{setFilter("Declined");setPage(1);}}>
          <div className="la-sum-icon" style={{background:"#fce4ec"}}>✗</div>
          <div><div className="la-sum-val red">{counts.declined}</div><div className="la-sum-label">Declined</div></div>
        </div>
        <div className="la-summary-card">
          <div className="la-sum-icon" style={{background:"#e3f2fd"}}>💰</div>
          <div><div className="la-sum-val blue">₱{counts.totalAmt.toLocaleString()}</div><div className="la-sum-label">Total Approved Amount</div></div>
        </div>
      </div>

      <div className="la-card">
        <div className="la-toolbar">
          <div className="la-search-wrap">
            <span className="la-search-icon">🔍</span>
            <input className="la-search-input" placeholder="Search by Loan ID, Name, Member ID..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
            {search && <button className="la-clear-btn" onClick={()=>{setSearch("");setPage(1);}}>✕</button>}
          </div>
          <div className="la-filters">
            <select className="la-select" value={filterType} onChange={e=>{setFilterType(e.target.value);setPage(1);}}>
              <option value="All">All Loan Types</option>
              {LOAN_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
            <div className="la-status-tabs">
              {STATUS_TABS.map(s=>(
                <button key={s} className={`la-status-tab ${filterStatus===s?"active":""} ltab-${s.replace(" ","-").toLowerCase()}`} onClick={()=>{setFilter(s);setPage(1);}}>
                  {s}{s!=="All"&&<span className="la-tab-count">{loans.filter(l=>l.status===s).length}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="la-table-wrap">
          <table className="la-table">
            <thead><tr>
              <th style={{width:"11%"}}>Loan ID</th>
              <th style={{width:"11%"}}>Member ID</th>
              <th style={{width:"17%"}}>Full Name</th>
              <th style={{width:"14%"}}>Loan Type</th>
              <th style={{width:"9%"}}>Amount</th>
              <th style={{width:"5%"}}>Term</th>
              <th style={{width:"8%"}}>Status</th>
              <th style={{width:"7%",textAlign:"center"}}>Action</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="la-empty">Loading...</td></tr>
              ) : paginated.length===0 ? (
                <tr><td colSpan={8} className="la-empty">No loan applications found.</td></tr>
              ) : paginated.map((l,idx)=>(
                <tr key={l.id} className={`${idx%2===0?"row-even":"row-odd"} la-clickable`} onClick={()=>setProcess(l)}>
                  <td className="mono cell-id">{l.loan_id}</td>
                  <td className="mono">{l.member_code}</td>
                  <td className="cell-name">{l.member_name}</td>
                  <td><span className="la-type-pill">{l.loan_type}</span></td>
                  <td className="fw green">₱{Number(l.amount||0).toLocaleString()}</td>
                  <td className="cell-center">{l.term_months}mo</td>
                  <td><span className={`la-badge ${STATUS_COLOR[l.status]}`}>{l.status}</span></td>
                  <td style={{textAlign:"center"}}>
                    <button className={`la-process-btn ${l.status==="For Review"?"btn-review":"btn-view"}`} onClick={e=>{e.stopPropagation();setProcess(l);}}>
                      {l.status==="For Review"?"Process":"View"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="la-footer">
          <div className="la-count">Showing {filtered.length===0?0:(safePage-1)*ROWS_PER_PAGE+1}–{Math.min(safePage*ROWS_PER_PAGE,filtered.length)} of {filtered.length}<span className="la-hint"> — click any row to process</span></div>
          <div className="la-pagination">
            <button className="la-page-btn" disabled={safePage===1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
            {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-safePage)<=1).reduce((acc,p,i,arr)=>{if(i>0&&p-arr[i-1]>1)acc.push("...");acc.push(p);return acc;},[]).map((p,i)=>p==="..."?<span key={`e${i}`} className="la-ellipsis">…</span>:<button key={p} className={`la-page-btn la-page-num ${safePage===p?"active":""}`} onClick={()=>setPage(p)}>{p}</button>)}
            <button className="la-page-btn" disabled={safePage===totalPages} onClick={()=>setPage(p=>p+1)}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}