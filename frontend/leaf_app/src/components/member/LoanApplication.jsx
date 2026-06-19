import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { getMyProfileAPI } from "../../api/members";
import { createLoanAPI, getLoansAPI } from "../../api/loans";
import { getPaymentsAPI } from "../../api/payments";
import { Home, AlertTriangle, Briefcase, HardHat, Store } from "lucide-react";
import "./LoanApplication.css";

const LOAN_TYPES = [
  { type:"Regular Loan",   icon:<Home          size={26} color="#2e7d32"/>, color:"#e8f5e9", border:"#a5d6a7", desc:"For personal or household needs",   maxAmt:50000,  maxTerm:24 },
  { type:"Emergency Loan", icon:<AlertTriangle size={26} color="#c62828"/>, color:"#fce4ec", border:"#ef9a9a", desc:"For urgent and unexpected expenses",  maxAmt:20000,  maxTerm:12 },
  { type:"Salary Loan",    icon:<Briefcase     size={26} color="#1565c0"/>, color:"#e3f2fd", border:"#90caf9", desc:"Based on your monthly salary",        maxAmt:30000,  maxTerm:12 },
  { type:"Housing Loan",   icon:<HardHat       size={26} color="#e65100"/>, color:"#fff8e1", border:"#ffcc80", desc:"For home repair or construction",     maxAmt:100000, maxTerm:48 },
  { type:"Business Loan",  icon:<Store         size={26} color="#6a1b9a"/>, color:"#f3e5f5", border:"#ce93d8", desc:"For business capital or expansion",   maxAmt:80000,  maxTerm:36 },
];

const STATUS_COLOR = {
  "For Review": { bg:"#fff8e1", color:"#e65100", label:"⏳ For Review" },
  "Active":     { bg:"#e8f5e9", color:"#2e7d32", label:"✅ Active" },
  "Declined":   { bg:"#fce4ec", color:"#c62828", label:"❌ Declined" },
  "Completed":  { bg:"#e3f2fd", color:"#1565c0", label:"✔ Completed" },
  "Overdue":    { bg:"#ffebee", color:"#b71c1c", label:"⚠️ Overdue" },
};

export default function LoanApplication() {
  const ctx = useOutletContext() || {};

  const [step,           setStep]          = useState(1);
  const [shareCapital,   setShareCapital]  = useState(0);
  const [loadingProfile, setLoadingProfile]= useState(true);
  const [selType,        setSelType]       = useState(null);
  const [form,           setForm]          = useState({ amount:"", term:"12", purpose:"", collateral:"", note:"" });
  const [errors,         setErrors]        = useState({});
  const [submitted,      setDone]          = useState(false);
  const [loading,        setLoading]       = useState(false);
  const [myLoans,        setMyLoans]       = useState([]);
  const [loadingLoans,   setLoadingLoans]  = useState(true);
  const [showHistory,    setShowHistory]   = useState(false);
  const [selectedLoan,   setSelectedLoan]  = useState(null);
  const [loanPayments,   setLoanPayments]  = useState([]);
  const [loadingPay,     setLoadingPay]    = useState(false);

  useEffect(() => {
    getMyProfileAPI()
      .then(p => setShareCapital(parseFloat(p.share_capital || 0)))
      .catch(() => setShareCapital(0))
      .finally(() => setLoadingProfile(false));

    // ── Fetch member's own loan history ──
    getLoansAPI()
      .then(loans => setMyLoans(loans))
      .catch(() => setMyLoans([]))
      .finally(() => setLoadingLoans(false));
  }, []);

  const amount       = parseFloat(form.amount) || 0;
  const term         = parseInt(form.term) || 12;
  const selectedType = LOAN_TYPES.find(l => l.type === selType);

  const monthlyRate  = amount <= 50000 ? 0.0125 : amount <= 150000 ? 0.01125 : 0.01;
  const interest     = monthlyRate * amount * term;
  const serviceFee   = amount * 0.03;
  const filingFee    = amount <= 50000 ? 50 : 100;
  const insurance    = amount * 0.0125;
  const sd           = amount * 0.01;
  const sc           = amount * 0.03;
  const totalDed     = interest + serviceFee + filingFee + insurance + sd + sc;
  const netProceeds  = amount - totalDed;
  const monthlyEst   = amount > 0 ? (amount + interest) / term : 0;

  const maxLoanable     = shareCapital;
  const showComputation = amount >= 3000 && selType && step === 2;

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleLoanClick = async (loan) => {
    setSelectedLoan(loan);
    setLoadingPay(true);
    try {
      const all = await getPaymentsAPI();
      const filtered = all.filter(p => p.loan_code === loan.loan_id);
      setLoanPayments(filtered);
    } catch { setLoanPayments([]); }
    finally { setLoadingPay(false); }
  };

  const validate = () => {
    const e = {};
    if (!form.amount || parseFloat(form.amount) < 3000)
      e.amount = "Minimum loan amount is ₱3,000.";
    if (!form.purpose.trim())
      e.purpose = "Purpose is required.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      await createLoanAPI({
        loan_type:   selType,
        amount:      parseFloat(form.amount),
        term_months: parseInt(form.term),
        purpose:     form.purpose,
        collateral:  form.collateral || "",
      });
      setDone(true);
      // ── Refresh loan history after submission ──
      const loans = await getLoansAPI();
      setMyLoans(loans);
    } catch(err) {
      const msg = err.response?.data?.detail || "Failed to submit application.";
      setErrors({ purpose: msg });
    } finally { setLoading(false); }
  };

  // ── Loan Detail Modal ─────────────────────────────────────────────────────
  const LoanDetailModal = () => {
    if (!selectedLoan) return null;
    const st = STATUS_COLOR[selectedLoan.status] || { bg:"#f5f5f5", color:"#888", label:selectedLoan.status };
    return (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
        onClick={() => setSelectedLoan(null)}>
        <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:520,maxHeight:"85vh",overflow:"hidden",display:"flex",flexDirection:"column"}}
          onClick={e => e.stopPropagation()}>
          {/* Modal Header */}
          <div style={{padding:"16px 20px",borderBottom:"1px solid #f0f4f1",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#1b5e20"}}>{selectedLoan.loan_id}</div>
              <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{selectedLoan.loan_type} · Applied {selectedLoan.applied_at?.slice(0,10)}</div>
            </div>
            <button onClick={() => setSelectedLoan(null)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#aaa"}}>✕</button>
          </div>
          {/* Loan Info */}
          <div style={{padding:"12px 20px",background:"#f9fef9",borderBottom:"1px solid #f0f4f1",display:"flex",gap:16,flexWrap:"wrap"}}>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              <span style={{fontSize:10,color:"#aaa",fontWeight:700,textTransform:"uppercase"}}>Amount</span>
              <span style={{fontSize:15,fontWeight:700,color:"#1b5e20"}}>₱{Number(selectedLoan.amount).toLocaleString()}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              <span style={{fontSize:10,color:"#aaa",fontWeight:700,textTransform:"uppercase"}}>Balance</span>
              <span style={{fontSize:15,fontWeight:700,color:"#c62828"}}>₱{Number(selectedLoan.balance).toLocaleString()}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              <span style={{fontSize:10,color:"#aaa",fontWeight:700,textTransform:"uppercase"}}>Monthly Due</span>
              <span style={{fontSize:15,fontWeight:700,color:"#1565c0"}}>₱{Number(selectedLoan.monthly_due).toLocaleString()}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              <span style={{fontSize:10,color:"#aaa",fontWeight:700,textTransform:"uppercase"}}>Status</span>
              <span style={{fontSize:12,fontWeight:700,padding:"2px 10px",borderRadius:20,background:st.bg,color:st.color}}>{st.label}</span>
            </div>
          </div>
          {/* Payment History */}
          <div style={{padding:"12px 20px 4px",borderBottom:"1px solid #f0f4f1"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#555"}}>💳 Payment History</div>
          </div>
          <div style={{overflowY:"auto",flex:1,padding:"0 20px 16px"}}>
            {loadingPay ? (
              <div style={{textAlign:"center",color:"#aaa",padding:"24px 0",fontSize:13}}>Loading payments...</div>
            ) : loanPayments.length === 0 ? (
              <div style={{textAlign:"center",color:"#aaa",padding:"24px 0",fontSize:13}}>No payments recorded yet.</div>
            ) : (
              <table style={{width:"100%",borderCollapse:"collapse",marginTop:8}}>
                <thead>
                  <tr style={{background:"#f9fef9"}}>
                    <th style={{fontSize:10,color:"#aaa",fontWeight:700,padding:"8px 6px",textAlign:"left",borderBottom:"1px solid #e8f5e9"}}>Date</th>
                    <th style={{fontSize:10,color:"#aaa",fontWeight:700,padding:"8px 6px",textAlign:"left",borderBottom:"1px solid #e8f5e9"}}>TX ID</th>
                    <th style={{fontSize:10,color:"#aaa",fontWeight:700,padding:"8px 6px",textAlign:"right",borderBottom:"1px solid #e8f5e9"}}>Amount</th>
                    <th style={{fontSize:10,color:"#aaa",fontWeight:700,padding:"8px 6px",textAlign:"right",borderBottom:"1px solid #e8f5e9"}}>Balance After</th>
                    <th style={{fontSize:10,color:"#aaa",fontWeight:700,padding:"8px 6px",textAlign:"left",borderBottom:"1px solid #e8f5e9"}}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {loanPayments.map((p,i) => (
                    <tr key={i} style={{borderBottom:"1px solid #f5f5f5"}}>
                      <td style={{fontSize:11,color:"#555",padding:"9px 6px"}}>{p.paid_at?.slice(0,10)}</td>
                      <td style={{fontSize:10,color:"#888",padding:"9px 6px",fontFamily:"monospace"}}>{p.tx_id}</td>
                      <td style={{fontSize:12,fontWeight:700,color:"#2e7d32",padding:"9px 6px",textAlign:"right"}}>₱{Number(p.amount).toLocaleString()}</td>
                      <td style={{fontSize:12,color:"#1565c0",padding:"9px 6px",textAlign:"right"}}>₱{Number(p.balance).toLocaleString()}</td>
                      <td style={{fontSize:11,color:"#888",padding:"9px 6px"}}>{p.note||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {/* Modal Footer */}
          <div style={{padding:"12px 20px",borderTop:"1px solid #f0f4f1",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:11,color:"#aaa"}}>
              {loanPayments.length} payment{loanPayments.length!==1?"s":""} · 
              Total: <strong style={{color:"#2e7d32"}}>₱{loanPayments.reduce((s,p)=>s+Number(p.amount||0),0).toLocaleString()}</strong>
            </div>
            <button onClick={() => setSelectedLoan(null)} style={{padding:"7px 18px",background:"#2e7d32",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  // ── Success Screen ─────────────────────────────────────────────────────────
  if (submitted) return (
    <div className="la-wrapper">
      <div className="la-success-card">
        <div className="la-success-icon">✅</div>
        <div className="la-success-title">Application Submitted!</div>
        <div className="la-success-text">
          Your <strong>{selType}</strong> application for{" "}
          <strong>₱{parseFloat(form.amount).toLocaleString()}</strong> has been submitted.
          <br/><br/>
          The admin will review your application and notify you of the result.
        </div>

        {/* ── Loan History after submit ── */}
        {myLoans.length > 0 && (
          <div className="la-history-box" style={{marginTop:16,textAlign:"left"}}>
            <div className="la-history-title">📋 Your Loan Applications</div>
            {myLoans.map((l, i) => {
              const st = STATUS_COLOR[l.status] || { bg:"#f5f5f5", color:"#888", label:l.status };
              return (
                <div key={i} className="la-history-item">
                  <div className="la-history-left">
                    <div className="la-history-id">{l.loan_id}</div>
                    <div className="la-history-type">{l.loan_type}</div>
                    <div className="la-history-date">{l.applied_at?.slice(0,10)}</div>
                  </div>
                  <div className="la-history-right">
                    <div className="la-history-amount">₱{Number(l.amount).toLocaleString()}</div>
                    <span className="la-status-badge" style={{background:st.bg, color:st.color}}>{st.label}</span>
                    {l.decline_reason && <div className="la-history-reason">"{l.decline_reason}"</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button className="la-new-btn" style={{marginTop:16}} onClick={() => {
          setStep(1); setSelType(null);
          setForm({ amount:"", term:"12", purpose:"", collateral:"", note:"" });
          setDone(false);
        }}>
          Submit Another Application
        </button>
      </div>
    </div>
  );

  return (
    <div className="la-wrapper">
      <LoanDetailModal/>

      {/* Header */}
      <div className="la-page-header">
        <div className="la-page-title">Apply for Loan</div>
        <div className="la-page-sub">Submit a loan application online. Admin will review and notify you.</div>
      </div>

      {/* Eligibility Banner */}
      <div className="la-elig-banner">
        <div className="la-elig-item">
          <span className="la-elig-label">Share Capital</span>
          <span className="la-elig-val">₱{shareCapital.toLocaleString()}</span>
        </div>
        <div className="la-elig-divider"/>
        <div className="la-elig-item">
          <span className="la-elig-label">Max Loanable</span>
          <span className="la-elig-val green">₱{maxLoanable.toLocaleString()}</span>
        </div>
        <div className="la-elig-divider"/>
        <div className="la-elig-item">
          <span className="la-elig-label">Minimum Loan</span>
          <span className="la-elig-val">₱3,000</span>
        </div>
      </div>

      {/* ── Loan History Section ── */}
      <div className="la-card" style={{marginBottom:16}}>
        <div className="la-history-header" onClick={() => setShowHistory(h => !h)} style={{cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div className="la-card-title" style={{margin:0}}>📋 My Loan Applications ({myLoans.length})</div>
          <span style={{fontSize:12,color:"#888"}}>{showHistory ? "▲ Hide" : "▼ Show"}</span>
        </div>
        {showHistory && (
          <div style={{marginTop:12}}>
            {loadingLoans ? (
              <div style={{textAlign:"center",color:"#aaa",padding:"16px 0",fontSize:13}}>Loading...</div>
            ) : myLoans.length === 0 ? (
              <div style={{textAlign:"center",color:"#aaa",padding:"16px 0",fontSize:13}}>No loan applications yet.</div>
            ) : (
              myLoans.map((l, i) => {
                const st = STATUS_COLOR[l.status] || { bg:"#f5f5f5", color:"#888", label:l.status };
                return (
                  <div key={i} className="la-history-item" onClick={() => handleLoanClick(l)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#f9fef9"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                    <div className="la-history-left">
                      <div className="la-history-id">{l.loan_id}</div>
                      <div className="la-history-type">{l.loan_type}</div>
                      <div className="la-history-date">Applied: {l.applied_at?.slice(0,10)}</div>
                    </div>
                    <div className="la-history-right">
                      <div className="la-history-amount">₱{Number(l.amount).toLocaleString()}</div>
                      <span className="la-status-badge" style={{background:st.bg, color:st.color}}>{st.label}</span>
                      {l.decline_reason && (
                        <div className="la-history-reason">Reason: "{l.decline_reason}"</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Step Indicator */}
      <div className="la-steps">
        {["Choose Loan Type","Loan Details","Review"].map((s,i) => (
          <div key={i} className={`la-step ${step >= i+1?"active":""} ${step > i+1?"done":""}`}>
            <div className="la-step-dot">{step > i+1 ? "✓" : i+1}</div>
            <div className="la-step-label">{s}</div>
          </div>
        ))}
      </div>

      {/* Step 1 — Choose Loan Type */}
      {step === 1 && (
        <div className="la-card">
          <div className="la-card-title">Choose Loan Type</div>
          <div className="la-loan-types">
            {LOAN_TYPES.map(lt => (
              <div
                key={lt.type}
                className={`la-type-card ${selType===lt.type?"selected":""}`}
                onClick={() => setSelType(lt.type)}
                style={selType===lt.type ? {borderColor: lt.border, background: lt.color} : {}}
              >
                <div className="la-type-icon" style={{
                  background:   lt.color,
                  border:       `1.5px solid ${lt.border}`,
                  borderRadius: 14,
                  width: 56, height: 56, minWidth: 56,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  margin:"0 auto 10px",
                }}>
                  {lt.icon}
                </div>
                <div className="la-type-name">{lt.type}</div>
                <div className="la-type-desc">{lt.desc}</div>
                <div className="la-type-max">Up to ₱{lt.maxAmt.toLocaleString()} · {lt.maxTerm} months max</div>
              </div>
            ))}
          </div>
          <div className="la-card-footer">
            <div/>
            <button className="la-btn-next" onClick={() => setStep(2)} disabled={!selType}>
              Next: Loan Details →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Loan Details */}
      {step === 2 && selectedType && (
        <div className="la-card">
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
            <div style={{
              background: selectedType.color,
              border: `1.5px solid ${selectedType.border}`,
              borderRadius:12, width:44, height:44,
              display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0,
            }}>{selectedType.icon}</div>
            <div>
              <div className="la-card-title" style={{margin:0}}>Loan Details</div>
              <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{selectedType.type}</div>
            </div>
          </div>

          <div className="la-form-grid">
            <div className="la-field">
              <label className="la-label">Loan Amount (₱) <span className="la-req">*</span></label>
              <div className="la-amount-wrap">
                <span className="la-peso">₱</span>
                <input
                  className={`la-amount-input ${errors.amount?"la-err":""}`}
                  type="number" name="amount" min="3000"
                  value={form.amount}
                  onChange={e => { handle(e); setErrors(p => ({...p, amount:""})); }}
                  placeholder="Min ₱3,000"
                />
              </div>
              {errors.amount && <div className="la-field-err">{errors.amount}</div>}
            </div>

            <div className="la-field">
              <label className="la-label">Loan Term</label>
              <select className="la-select" name="term" value={form.term} onChange={handle}>
                {[3,6,9,12,18,24,36,48].filter(t => t <= selectedType.maxTerm).map(t => (
                  <option key={t} value={t}>{t} months</option>
                ))}
              </select>
            </div>

            <div className="la-field la-full">
              <label className="la-label">Purpose <span className="la-req">*</span></label>
              <textarea
                className={`la-textarea ${errors.purpose?"la-err":""}`}
                name="purpose" rows={3}
                placeholder="Describe the purpose of your loan..."
                value={form.purpose}
                onChange={e => { handle(e); setErrors(p => ({...p, purpose:""})); }}
              />
              {errors.purpose && <div className="la-field-err">{errors.purpose}</div>}
            </div>

            <div className="la-field">
              <label className="la-label">Collateral (if any)</label>
              <input className="la-input" type="text" name="collateral"
                value={form.collateral} onChange={handle}
                placeholder="e.g. Land title, vehicle"/>
            </div>

            <div className="la-field">
              <label className="la-label">Additional Notes</label>
              <input className="la-input" type="text" name="note"
                value={form.note} onChange={handle} placeholder="Optional"/>
            </div>
          </div>

          {showComputation && (
            <div className="la-computation">
              <div className="la-comp-title">🧮 Loan Computation (LEAF MPC)</div>
              <div className="la-comp-summary">
                <div className="la-comp-row">
                  <span>Interest Rate</span>
                  <span className="fw">{(monthlyRate*100).toFixed(3)}% / mo × {term} months</span>
                </div>
                <div className="la-comp-row">
                  <span>Total Interest</span>
                  <span className="orange fw">₱{interest.toFixed(2)}</span>
                </div>
                <div className="la-comp-row highlight">
                  <span>Monthly Amortization</span>
                  <span className="green fw">₱{monthlyEst.toFixed(2)}</span>
                </div>
              </div>
              <div className="la-comp-deductions">
                <div className="la-comp-ded-title">💰 Upfront Deductions (from Loan Release)</div>
                <div className="la-ded-row"><span>Loan Amount</span><span>₱{amount.toLocaleString()}</span></div>
                <div className="la-ded-divider"/>
                <div className="la-ded-row"><span>Interest <span className="la-ded-rate">({(monthlyRate*100)}% × {term} mos)</span></span><span className="red">− ₱{interest.toFixed(2)}</span></div>
                <div className="la-ded-row"><span>Service Fee <span className="la-ded-rate">(3%)</span></span><span className="red">− ₱{serviceFee.toFixed(2)}</span></div>
                <div className="la-ded-row"><span>Filing Fee</span><span className="red">− ₱{filingFee.toFixed(2)}</span></div>
                <div className="la-ded-row"><span>Insurance <span className="la-ded-rate">(1.25%)</span></span><span className="red">− ₱{insurance.toFixed(2)}</span></div>
                <div className="la-ded-row"><span>Savings Deposit <span className="la-ded-rate">(1%)</span></span><span className="red">− ₱{sd.toFixed(2)}</span></div>
                <div className="la-ded-row"><span>Share Capital CBU <span className="la-ded-rate">(3%)</span></span><span className="red">− ₱{sc.toFixed(2)}</span></div>
                <div className="la-ded-divider"/>
                <div className="la-ded-row la-ded-total"><span>Total Deductions</span><span className="red fw">− ₱{totalDed.toFixed(2)}</span></div>
                <div className="la-ded-row la-ded-net"><span>Net Proceeds <span className="la-ded-rate">(actual release)</span></span><span className="green fw">₱{netProceeds.toFixed(2)}</span></div>
              </div>
            </div>
          )}

          <div className="la-card-footer">
            <button className="la-btn-back" onClick={() => setStep(1)}>← Back</button>
            <button className="la-btn-next" onClick={() => {
              const e = validate();
              if (Object.keys(e).length) { setErrors(e); return; }
              setStep(3);
            }}>Next: Review →</button>
          </div>
        </div>
      )}

      {/* Step 3 — Review */}
      {step === 3 && (
        <div className="la-card">
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
            <div style={{
              background: selectedType?.color, border:`1.5px solid ${selectedType?.border}`,
              borderRadius:12, width:44, height:44,
              display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0,
            }}>{selectedType?.icon}</div>
            <div>
              <div className="la-card-title" style={{margin:0}}>Review Application</div>
              <div style={{fontSize:11,color:"#aaa",marginTop:2}}>Please verify all details before submitting</div>
            </div>
          </div>

          <div className="la-review-grid">
            {[
              ["Loan Type",      selType],
              ["Amount",         `₱${amount.toLocaleString()}`],
              ["Term",           `${term} months`],
              ["Interest Rate",  `${(monthlyRate*100).toFixed(3)}% / month`],
              ["Total Interest", `₱${interest.toFixed(2)}`],
              ["Monthly Amort.", `₱${monthlyEst.toFixed(2)}`],
              ["Net Proceeds",   `₱${netProceeds.toFixed(2)}`],
              ["Purpose",        form.purpose],
              ["Collateral",     form.collateral || "None"],
            ].map(([k,v]) => (
              <div key={k} className="la-review-item">
                <span className="la-review-key">{k}</span>
                <span className={`la-review-val ${
                  k==="Amount"||k==="Net Proceeds" ? "green fw" :
                  k==="Total Interest" ? "orange" : ""
                }`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="la-review-notice">
            📋 By submitting, you confirm that all information provided is accurate.
            The admin will evaluate your application and notify you of the result.
          </div>
          <div className="la-card-footer">
            <button className="la-btn-back" onClick={() => setStep(2)}>← Back</button>
            <button className="la-btn-submit" onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}