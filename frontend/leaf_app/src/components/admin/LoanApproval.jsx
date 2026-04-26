import { useState, useEffect } from "react";
import { getLoansAPI, updateLoanStatusAPI, createLoanAPI } from "../../api/loans";
import { getMembersAPI } from "../../api/members";
import { Search } from "lucide-react";
import "./LoanApproval.css";

const LOAN_TYPES  = ["Regular Loan","Emergency Loan","Salary Loan","Housing Loan","Business Loan","Other Loan"];
const STATUS_TABS = ["All","For Review","Active","Declined"];
const ROWS_PER_PAGE = 8;
const STATUS_COLOR  = { "For Review":"status-review", "Active":"status-approved", "Declined":"status-declined", "Completed":"status-approved", "Overdue":"status-declined" };

function ProcessModal({ loan, onClose, onApprove, onDecline }) {
  const [declineMode, setDeclineMode] = useState(false);
  const [remarks,     setRemarks]     = useState(loan?.remarks||"");
  const [loading,     setLoading]     = useState(false);
  if (!loan) return null;

  const amount = parseFloat(loan.amount||0);
  const term   = parseInt(loan.term_months||loan.term||6);

  // ─── LEAF MPC Interest Rate (monthly) ────────────────────────────────────
  // ₱3,000 – ₱50,000   → 1.25% / month
  // ₱50,001 – ₱150,000 → 1.125% / month
  // ₱150,001 – ₱1M     → 1%    / month
  const monthlyRate =
    amount <= 50000  ? 0.0125  :
    amount <= 150000 ? 0.01125 : 0.01;

  // ─── Deductions (upfront, deducted from loan release) ────────────────────
  const interest    = monthlyRate * amount * term;          // Interest
  const serviceFee  = amount * 0.03;                        // Service Fee 3%
  const filingFee   = amount <= 50000 ? 50 : 100;           // Filing Fee
  const insurance   = amount * 0.0125;                      // Insurance 1.25%
  const sd          = amount * 0.01;                        // Savings Deposit 1%
  const sc          = amount * 0.03;                        // Share Capital CBU 3%
  const totalDeductions = interest + serviceFee + filingFee + insurance + sd + sc;
  const netProceeds = amount - totalDeductions;

  // ─── Monthly amortization = (Principal + Interest) / Term ────────────────
  const totalPayable  = amount + interest;
  const monthlyAmort  = totalPayable / term;

  const handleApprove = async () => {
    setLoading(true);
    try { await onApprove(loan.id, remarks, parseFloat(monthlyAmort.toFixed(2))); }
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
            <div className="la-compute-results">
              <div className="la-result-item">
                <span>Interest Rate</span>
                <span className="fw">{(monthlyRate*100).toFixed(3)}% / month ({(monthlyRate*100*12).toFixed(2)}% / year)</span>
              </div>
              <div className="la-result-item">
                <span>Total Interest ({term} months)</span>
                <span className="orange fw">₱{interest.toFixed(2)}</span>
              </div>
              <div className="la-result-item">
                <span>Total Payable (Principal + Interest)</span>
                <span className="fw">₱{totalPayable.toFixed(2)}</span>
              </div>
              <div className="la-result-item highlight">
                <span>Monthly Amortization</span>
                <span className="green fw">₱{monthlyAmort.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="la-section">
            <div className="la-section-title">💰 Upfront Deductions (from Loan Release)</div>
            <div className="la-deduction-box">
              <div className="la-deduct-row"><span className="la-deduct-label">Loan Amount</span><span className="la-deduct-val">₱{amount.toLocaleString()}</span></div>
              <div className="la-deduct-divider"/>
              <div className="la-deduct-row"><span className="la-deduct-label">Interest <span className="la-deduct-rate">({(monthlyRate*100)}% × {term} months)</span></span><span className="la-deduct-val red">− ₱{interest.toFixed(2)}</span></div>
              <div className="la-deduct-row"><span className="la-deduct-label">Service Fee <span className="la-deduct-rate">(3%)</span></span><span className="la-deduct-val red">− ₱{serviceFee.toFixed(2)}</span></div>
              <div className="la-deduct-row"><span className="la-deduct-label">Filing Fee <span className="la-deduct-rate">(fixed)</span></span><span className="la-deduct-val red">− ₱{filingFee.toFixed(2)}</span></div>
              <div className="la-deduct-row"><span className="la-deduct-label">Insurance <span className="la-deduct-rate">(1.25%)</span></span><span className="la-deduct-val red">− ₱{insurance.toFixed(2)}</span></div>
              <div className="la-deduct-row"><span className="la-deduct-label">Savings Deposit <span className="la-deduct-rate">(1%)</span></span><span className="la-deduct-val red">− ₱{sd.toFixed(2)}</span></div>
              <div className="la-deduct-row"><span className="la-deduct-label">Share Capital CBU Retention <span className="la-deduct-rate">(3%)</span></span><span className="la-deduct-val red">− ₱{sc.toFixed(2)}</span></div>
              <div className="la-deduct-divider"/>
              <div className="la-deduct-row la-net-row">
                <span className="la-deduct-label">Total Deductions</span>
                <span className="la-deduct-val red fw">− ₱{totalDeductions.toFixed(2)}</span>
              </div>
              <div className="la-deduct-row la-net-row">
                <span className="la-deduct-label">Net Proceeds <span className="la-deduct-rate">(actual release to member)</span></span>
                <span className="la-net-val">₱{netProceeds.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="la-section">
            <div className="la-section-title">{declineMode?"✗ Reason for Decline":"📝 Remarks / Notes"}</div>
            <textarea className={`la-textarea ${declineMode?"decline-mode":""}`} placeholder={declineMode?"State the reason for declining...":"Optional: Add remarks..."} value={remarks} onChange={e=>setRemarks(e.target.value)} rows={3}/>
          </div>

          {loan.status==="Active"    && <div className="la-notice la-notice-approved">✓ This loan has been <strong>approved & activated</strong>.</div>}
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

// ─── New Loan Modal ────────────────────────────────────────────────────────────
function NewLoanModal({ onClose, onSuccess }) {
  const LOAN_TYPES = ["Regular Loan","Emergency Loan","Salary Loan","Housing Loan","Business Loan","Other Loan"];
  const TERM_OPTIONS = [3, 6, 9, 12, 18, 24, 36, 48, 60];

  const [step,     setStep]    = useState(1);
  const [members,  setMembers] = useState([]);
  const [fetching, setFetching]= useState(true);
  const [search,   setSearch]  = useState("");
  const [selMember,setSelMem]  = useState(null);
  const [form,     setForm]    = useState({ loan_type:"Regular Loan", amount:"", term_months:"6", purpose:"", collateral:"" });
  const [errors,   setErrors]  = useState({});
  const [loading,  setLoading] = useState(false);
  const [done,     setDone]    = useState(null);

  useEffect(() => {
    getMembersAPI({ status: "Active" })
      .then(d => setMembers(d))
      .catch(e => console.error(e))
      .finally(() => setFetching(false));
  }, []);

  const filtered = members.filter(m =>
    (m.fullname||"").toLowerCase().includes(search.toLowerCase()) ||
    (m.member_id||"").toLowerCase().includes(search.toLowerCase())
  );

  const amount = parseFloat(form.amount) || 0;
  const term   = parseInt(form.term_months) || 6;

  // LEAF MPC interest rates
  const monthlyRate = amount <= 50000 ? 0.0125 : amount <= 150000 ? 0.01125 : 0.01;
  const interest    = monthlyRate * amount * term;
  const serviceFee  = amount * 0.03;
  const filingFee   = amount <= 50000 ? 50 : 100;
  const insurance   = amount * 0.0125;
  const sd          = amount * 0.01;
  const sc          = amount * 0.03;
  const totalDed    = interest + serviceFee + filingFee + insurance + sd + sc;
  const netProceeds = amount - totalDed;
  const monthlyAmort= amount > 0 ? (amount + interest) / term : 0;
  const maxLoanable = parseFloat(selMember?.share_capital||0) * 3;

  const handle = e => { setForm(p=>({...p,[e.target.name]:e.target.value})); setErrors(p=>({...p,[e.target.name]:""})); };

  const validate = () => {
    const e = {};
    if (!amount || amount < 3000)        e.amount      = "Minimum loan amount is ₱3,000.";
    if (amount > maxLoanable && maxLoanable > 0) e.amount = `Exceeds max loanable of ₱${maxLoanable.toLocaleString()} (Share Capital × 3).`;
    if (!form.purpose.trim())            e.purpose     = "Purpose is required.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const result = await createLoanAPI({
        member:      selMember.id,
        loan_type:   form.loan_type,
        amount:      amount,
        term_months: term,
        purpose:     form.purpose,
        collateral:  form.collateral,
      });
      setDone(result);
      onSuccess();
    } catch(err) {
      setErrors({ purpose: err.response?.data?.detail || "Failed to submit loan." });
    } finally { setLoading(false); }
  };

  // Done screen
  if (done) return (
    <div className="la-overlay" onClick={onClose}>
      <div className="la-modal la-modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="la-modal-header"><div className="la-modal-title">Loan Application Submitted</div><button className="la-modal-close" onClick={onClose}>✕</button></div>
        <div className="la-modal-body" style={{textAlign:"center",padding:"28px 24px"}}>
          <div style={{fontSize:40,marginBottom:12}}>✅</div>
          <div style={{fontSize:15,fontWeight:700,color:"#1b5e20",marginBottom:8}}>Loan Application Created!</div>
          <div style={{fontSize:13,color:"#555",marginBottom:16}}>The loan is now <strong>For Review</strong>.</div>
          <div className="la-deduction-box" style={{textAlign:"left"}}>
            <div className="la-deduct-row"><span className="la-deduct-label">Loan ID</span><span className="la-deduct-val fw">{done.loan_id}</span></div>
            <div className="la-deduct-row"><span className="la-deduct-label">Member</span><span className="la-deduct-val">{selMember?.fullname}</span></div>
            <div className="la-deduct-row"><span className="la-deduct-label">Amount</span><span className="la-deduct-val green fw">₱{Number(done.amount||0).toLocaleString()}</span></div>
            <div className="la-deduct-row"><span className="la-deduct-label">Monthly</span><span className="la-deduct-val">₱{parseFloat(done.monthly_due||0).toFixed(2)}</span></div>
            <div className="la-deduct-row"><span className="la-deduct-label">Net Proceeds</span><span className="la-deduct-val">₱{netProceeds.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="la-modal-footer"><button className="la-btn-approve" onClick={onClose}>Done</button></div>
      </div>
    </div>
  );

  return (
    <div className="la-overlay" onClick={onClose}>
      <div className="la-modal la-modal-lg" onClick={e=>e.stopPropagation()}>
        <div className="la-modal-header">
          <div><div className="la-modal-title">New Loan Application</div><div className="la-modal-sub">Step {step} of 2 — {step===1?"Select Member":"Loan Details & Computation"}</div></div>
          <button className="la-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Step 1 — Select Member */}
        {step===1 && (
          <>
            <div className="la-modal-body">
              <div className="la-step-info">Select the official member applying for a loan.</div>
              <div className="la-search-wrap" style={{marginBottom:12}}>
                <span className="la-search-icon">🔍</span>
                <input className="la-search-input" style={{flex:1}} placeholder="Search by name or member ID..." value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <div className="la-member-list">
                {fetching ? <div className="la-empty">Loading members...</div>
                : filtered.length===0 ? <div className="la-empty">No members found.</div>
                : filtered.map(m=>(
                  <div key={m.id} className={`la-member-item ${selMember?.id===m.id?"selected":""}`} onClick={()=>setSelMem(m)}>
                    <div className="la-member-avatar">{(m.fullname||"M")[0]}</div>
                    <div className="la-member-info">
                      <div className="la-member-name">{m.fullname}</div>
                      <div className="la-member-meta">{m.member_id} · Share Capital: ₱{Number(m.share_capital||0).toLocaleString()}</div>
                    </div>
                    <div className="la-member-max">
                      <div className="la-max-val">₱{(parseFloat(m.share_capital||0)*3).toLocaleString()}</div>
                      <div className="la-max-label">max loanable</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="la-modal-footer">
              <button className="la-btn-cancel" onClick={onClose}>Cancel</button>
              <button className="la-btn-approve" onClick={()=>setStep(2)} disabled={!selMember}>Next →</button>
            </div>
          </>
        )}

        {/* Step 2 — Loan Details */}
        {step===2 && (
          <>
            <div className="la-modal-body">
              {/* Member Strip */}
              <div className="la-member-strip">
                <div className="la-member-avatar">{(selMember.fullname||"M")[0]}</div>
                <div>
                  <div className="la-member-name">{selMember.fullname}</div>
                  <div className="la-member-meta">{selMember.member_id} · Max Loanable: ₱{maxLoanable.toLocaleString()}</div>
                </div>
              </div>

              {/* Loan Form */}
              <div className="la-form-grid">
                <div className="la-form-field">
                  <label className="la-field-label">Loan Type</label>
                  <select className="la-select" name="loan_type" value={form.loan_type} onChange={handle}>
                    {LOAN_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="la-form-field">
                  <label className="la-field-label">Term</label>
                  <select className="la-select" name="term_months" value={form.term_months} onChange={handle}>
                    {TERM_OPTIONS.map(t=><option key={t} value={t}>{t} months</option>)}
                  </select>
                </div>
                <div className="la-form-field">
                  <label className="la-field-label">Loan Amount (₱) <span style={{color:"#e53935"}}>*</span></label>
                  <input className={`la-interest-input ${errors.amount?"la-input-err":""}`} type="number" name="amount" value={form.amount} onChange={handle} placeholder="e.g. 10000" style={{width:"100%"}}/>
                  {errors.amount && <div style={{color:"#e53935",fontSize:11,marginTop:4}}>⚠ {errors.amount}</div>}
                </div>
                <div className="la-form-field">
                  <label className="la-field-label">Collateral (optional)</label>
                  <input className="la-interest-input" type="text" name="collateral" value={form.collateral} onChange={handle} placeholder="e.g. Land title, vehicle" style={{width:"100%"}}/>
                </div>
                <div className="la-form-field" style={{gridColumn:"1/-1"}}>
                  <label className="la-field-label">Purpose <span style={{color:"#e53935"}}>*</span></label>
                  <textarea className={`la-textarea ${errors.purpose?"la-input-err":""}`} name="purpose" value={form.purpose} onChange={handle} rows={2} placeholder="e.g. Business capital, medical emergency..."/>
                  {errors.purpose && <div style={{color:"#e53935",fontSize:11,marginTop:4}}>⚠ {errors.purpose}</div>}
                </div>
              </div>

              {/* Live Computation */}
              {amount >= 3000 && (
                <div className="la-section" style={{marginTop:16}}>
                  <div className="la-section-title">🧮 Loan Computation</div>
                  <div className="la-compute-results" style={{marginBottom:12}}>
                    <div className="la-result-item"><span>Interest Rate</span><span className="fw">{(monthlyRate*100).toFixed(3)}%/mo × {term} months</span></div>
                    <div className="la-result-item"><span>Total Interest</span><span className="orange fw">₱{interest.toFixed(2)}</span></div>
                    <div className="la-result-item highlight"><span>Monthly Amortization</span><span className="green fw">₱{monthlyAmort.toFixed(2)}</span></div>
                  </div>
                  <div className="la-deduction-box">
                    <div className="la-deduct-row"><span className="la-deduct-label">Loan Amount</span><span className="la-deduct-val">₱{amount.toLocaleString()}</span></div>
                    <div className="la-deduct-divider"/>
                    <div className="la-deduct-row"><span className="la-deduct-label">Interest</span><span className="la-deduct-val red">− ₱{interest.toFixed(2)}</span></div>
                    <div className="la-deduct-row"><span className="la-deduct-label">Service Fee (3%)</span><span className="la-deduct-val red">− ₱{serviceFee.toFixed(2)}</span></div>
                    <div className="la-deduct-row"><span className="la-deduct-label">Filing Fee</span><span className="la-deduct-val red">− ₱{filingFee.toFixed(2)}</span></div>
                    <div className="la-deduct-row"><span className="la-deduct-label">Insurance (1.25%)</span><span className="la-deduct-val red">− ₱{insurance.toFixed(2)}</span></div>
                    <div className="la-deduct-row"><span className="la-deduct-label">Savings Deposit (1%)</span><span className="la-deduct-val red">− ₱{sd.toFixed(2)}</span></div>
                    <div className="la-deduct-row"><span className="la-deduct-label">Share Capital CBU (3%)</span><span className="la-deduct-val red">− ₱{sc.toFixed(2)}</span></div>
                    <div className="la-deduct-divider"/>
                    <div className="la-deduct-row la-net-row"><span className="la-deduct-label">Net Proceeds (actual release)</span><span className="la-net-val">₱{netProceeds.toFixed(2)}</span></div>
                  </div>
                </div>
              )}
            </div>
            <div className="la-modal-footer">
              <button className="la-btn-cancel" onClick={()=>setStep(1)}>← Back</button>
              <button className="la-btn-approve" onClick={handleSubmit} disabled={loading||amount<3000}>
                {loading?"Submitting...":"Submit Loan Application"}
              </button>
            </div>
          </>
        )}
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
  const [processLoan, setProcess]     = useState(null);
  const [showNewLoan, setShowNewLoan] = useState(false);
  const [toast,       setToast]       = useState(null);

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
    approved:  loans.filter(l=>l.status==="Active").length,
    declined:  loans.filter(l=>l.status==="Declined").length,
    totalAmt:  loans.filter(l=>l.status==="Active").reduce((s,l)=>s+parseFloat(l.amount||0),0),
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
      {showNewLoan && <NewLoanModal onClose={()=>setShowNewLoan(false)} onSuccess={()=>{ fetchLoans(); showToast("Loan application submitted successfully!"); }}/>}

      <div className="la-page-header">
        <div><div className="la-page-title">Loan Approval</div><div className="la-page-sub">Evaluate, compute, and process member loan applications.</div></div>
        <button className="la-new-btn" onClick={()=>setShowNewLoan(true)}>+ New Loan Application</button>
      </div>

      <div className="la-summary-grid">
        <div className="la-summary-card clickable" onClick={()=>{setFilter("For Review");setPage(1);}}>
          <div className="la-sum-icon" style={{background:"#fff8e1"}}>⏳</div>
          <div><div className="la-sum-val orange">{counts.forReview}</div><div className="la-sum-label">For Review</div></div>
        </div>
        <div className="la-summary-card clickable" onClick={()=>{setFilter("Active");setPage(1);}}>
          <div className="la-sum-icon" style={{background:"#e8f5e9"}}>✓</div>
          <div><div className="la-sum-val green">{counts.approved}</div><div className="la-sum-label">Active Loans</div></div>
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
            <span className="la-search-icon"><Search size={13} color="#aaa"/></span>
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