import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { getMyProfileAPI } from "../../api/members";
import { createLoanAPI, getLoansAPI } from "../../api/loans";
import { getPaymentsAPI } from "../../api/payments";
import { Home, AlertTriangle, Briefcase, HardHat, Store, CheckCircle, XCircle } from "lucide-react";
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

// ─── Eligibility Checker ───────────────────────────────────────────────────────
function checkEligibility(loans, shareCapital) {
  const issues = [];
  const passed = [];
  const maxLoanable = shareCapital * 2;

  const activeLoans   = loans.filter(l => l.status === "Active");
  const overdueLoans  = loans.filter(l => l.status === "Overdue");
  const pendingLoans  = loans.filter(l => l.status === "For Review");
  const completedLoans= loans.filter(l => l.status === "Completed");

  // Check 1: Share Capital
  if (shareCapital >= 4000) {
    passed.push(`Share Capital: ₱${shareCapital.toLocaleString()} — Max Loanable: ₱${maxLoanable.toLocaleString()}`);
  } else {
    issues.push(`Insufficient Share Capital. Current: ₱${shareCapital.toLocaleString()}. Minimum ₱4,000 required.`);
  }

  // Check 2: No overdue loans
  if (overdueLoans.length === 0) {
    passed.push("No overdue loans");
  } else {
    issues.push(`You have ${overdueLoans.length} overdue loan(s): ${overdueLoans.map(l => l.loan_id).join(", ")}. Please settle them first.`);
  }

  // Check 3: No active or pending loans
  if (activeLoans.length === 0 && pendingLoans.length === 0) {
    passed.push("No existing active or pending loans");
  } else {
    const existing = [...activeLoans, ...pendingLoans];
    issues.push(`You have ${existing.length} active/pending loan(s): ${existing.map(l => l.loan_id).join(", ")}. Complete them before applying for a new one.`);
  }

  // Check 4: Good payment history (informational)
  if (completedLoans.length > 0) {
    passed.push(`Good payment history: ${completedLoans.length} completed loan(s)`);
  }

  return { eligible: issues.length === 0, issues, passed, maxLoanable };
}

// ─── Loan Recommendation Engine ───────────────────────────────────────────────
function getLoanRecommendation(shareCapital, classification, monthlyIncome, loans) {
  const maxLoanable    = shareCapital * 2;
  const completedLoans = loans.filter(l => l.status === "Completed");
  const hasGoodHistory = completedLoans.length > 0;

  // ── Recommended Amount ──
  // Base: 50% of max loanable for first-time, 80% for good history
  let recAmtPct  = hasGoodHistory ? 0.8 : 0.5;
  let recAmount  = Math.floor(maxLoanable * recAmtPct / 1000) * 1000; // round to nearest 1000
  recAmount      = Math.max(3000, Math.min(recAmount, maxLoanable));

  // ── Recommended Term ──
  // Based on monthly income: monthly due should not exceed 30% of income
  // monthly_due = (amount + interest) / term
  // interest = 0.0125 * amount * term (for amounts <= 50000)
  const rate       = recAmount <= 50000 ? 0.0125 : recAmount <= 150000 ? 0.01125 : 0.01;
  const maxMonthly = monthlyIncome * 0.30; // 30% of income rule
  
  // Solve for term: (amount + rate*amount*term) / term = maxMonthly
  // amount/term + rate*amount = maxMonthly
  // amount/term = maxMonthly - rate*amount
  // term = amount / (maxMonthly - rate*amount)
  let recTerm = 12; // default
  if (monthlyIncome > 0) {
    const denominator = maxMonthly - (rate * recAmount);
    if (denominator > 0) {
      recTerm = Math.ceil(recAmount / denominator);
      // Snap to available terms
      const availTerms = [3,6,9,12,18,24,36,48];
      recTerm = availTerms.find(t => t >= recTerm) || 48;
    } else {
      recTerm = 48; // income too low, stretch to max term
    }
  }

  // ── Recommended Loan Type ──
  let recType = "Regular Loan"; // default
  if (classification === "Student")  recType = "Emergency Loan";
  if (classification === "Senior")   recType = "Regular Loan";
  if (classification === "Employed") {
    if (monthlyIncome >= 15000)      recType = "Salary Loan";
    else                             recType = "Regular Loan";
  }

  // ── Estimated monthly due ──
  const interest    = rate * recAmount * recTerm;
  const monthlyDue  = (recAmount + interest) / recTerm;
  const debtRatio   = monthlyIncome > 0 ? (monthlyDue / monthlyIncome) * 100 : 0;

  return {
    amount:       recAmount,
    term:         recTerm,
    type:         recType,
    monthlyDue:   Math.round(monthlyDue),
    debtRatio:    Math.round(debtRatio),
    hasGoodHistory,
    maxLoanable,
    monthlyIncome,
  };
}

export default function LoanApplication() {
  const ctx = useOutletContext() || {};

  const [step,           setStep]          = useState(1);
  const [shareCapital,   setShareCapital]  = useState(0);
  const [monthlyIncome,  setMonthlyIncome] = useState(0);
  const [classification, setClassification]= useState("Employed");
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
      .then(p => {
        setShareCapital(parseFloat(p.share_capital || 0));
        // Get monthly income from profile sub-data
        const inc = parseFloat(
          p.job_profile?.monthly_income ||
          p.senior_profile?.pension_income ||
          p.student_profile?.allowance ||
          p.pre_member_info?.income || 0
        );
        setMonthlyIncome(inc);
        setClassification(p.pre_member_info?.classification || p.classification || "Employed");
      })
      .catch(() => setShareCapital(0))
      .finally(() => setLoadingProfile(false));

    getLoansAPI()
      .then(loans => setMyLoans(loans))
      .catch(() => setMyLoans([]))
      .finally(() => setLoadingLoans(false));
  }, []);

  const eligibility   = checkEligibility(myLoans, shareCapital);
  const recommendation= getLoanRecommendation(shareCapital, classification, monthlyIncome, myLoans);
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

  const maxLoanable     = shareCapital * 2;
  const showComputation = amount >= 3000 && selType && step === 2;

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleLoanClick = async (loan) => {
    setSelectedLoan(loan);
    setLoadingPay(true);
    try {
      const all = await getPaymentsAPI();
      setLoanPayments(all.filter(p => p.loan_code === loan.loan_id));
    } catch { setLoanPayments([]); }
    finally { setLoadingPay(false); }
  };

  const validate = () => {
    const e = {};
    if (!form.amount || parseFloat(form.amount) < 3000)
      e.amount = "Minimum loan amount is ₱3,000.";
    if (parseFloat(form.amount) > maxLoanable)
      e.amount = `Amount exceeds your max loanable of ₱${maxLoanable.toLocaleString()}.`;
    if (!form.purpose.trim())
      e.purpose = "Purpose is required.";
    return e;
  };

  const handleSubmit = async () => {
    if (!eligibility.eligible) return;
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
      const loans = await getLoansAPI();
      setMyLoans(loans);
    } catch(err) {
      const data = err.response?.data;
      const msg  = data?.non_field_errors?.[0] || data?.amount?.[0] || data?.detail || "Failed to submit application.";
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
          <div style={{padding:"16px 20px",borderBottom:"1px solid #f0f4f1",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#1b5e20"}}>{selectedLoan.loan_id}</div>
              <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{selectedLoan.loan_type} · Applied {selectedLoan.applied_at?.slice(0,10)}</div>
            </div>
            <button onClick={() => setSelectedLoan(null)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#aaa"}}>✕</button>
          </div>
          <div style={{padding:"12px 20px",background:"#f9fef9",borderBottom:"1px solid #f0f4f1",display:"flex",gap:16,flexWrap:"wrap"}}>
            {[["Amount",`₱${Number(selectedLoan.amount).toLocaleString()}`],["Balance",`₱${Number(selectedLoan.balance).toLocaleString()}`],["Monthly Due",`₱${Number(selectedLoan.monthly_due).toLocaleString()}`]].map(([k,v])=>(
              <div key={k} style={{display:"flex",flexDirection:"column",gap:2}}>
                <span style={{fontSize:10,color:"#aaa",fontWeight:700,textTransform:"uppercase"}}>{k}</span>
                <span style={{fontSize:15,fontWeight:700,color:"#1b5e20"}}>{v}</span>
              </div>
            ))}
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              <span style={{fontSize:10,color:"#aaa",fontWeight:700,textTransform:"uppercase"}}>Status</span>
              <span style={{fontSize:12,fontWeight:700,padding:"2px 10px",borderRadius:20,background:st.bg,color:st.color}}>{st.label}</span>
            </div>
          </div>
          <div style={{padding:"12px 20px 4px",borderBottom:"1px solid #f0f4f1"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#555"}}>💳 Payment History</div>
          </div>
          <div style={{overflowY:"auto",flex:1,padding:"0 20px 16px"}}>
            {loadingPay
              ? <div style={{textAlign:"center",color:"#aaa",padding:"24px 0",fontSize:13}}>Loading payments...</div>
              : loanPayments.length === 0
              ? <div style={{textAlign:"center",color:"#aaa",padding:"24px 0",fontSize:13}}>No payments recorded yet.</div>
              : <table style={{width:"100%",borderCollapse:"collapse",marginTop:8}}>
                  <thead><tr style={{background:"#f9fef9"}}>
                    {["Date","TX ID","Amount","Balance After","Note"].map(h=>(
                      <th key={h} style={{fontSize:10,color:"#aaa",fontWeight:700,padding:"8px 6px",textAlign:h==="Amount"||h==="Balance After"?"right":"left",borderBottom:"1px solid #e8f5e9"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{loanPayments.map((p,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #f5f5f5"}}>
                      <td style={{fontSize:11,color:"#555",padding:"9px 6px"}}>{p.paid_at?.slice(0,10)}</td>
                      <td style={{fontSize:10,color:"#888",padding:"9px 6px",fontFamily:"monospace"}}>{p.tx_id}</td>
                      <td style={{fontSize:12,fontWeight:700,color:"#2e7d32",padding:"9px 6px",textAlign:"right"}}>₱{Number(p.amount).toLocaleString()}</td>
                      <td style={{fontSize:12,color:"#1565c0",padding:"9px 6px",textAlign:"right"}}>₱{Number(p.balance).toLocaleString()}</td>
                      <td style={{fontSize:11,color:"#888",padding:"9px 6px"}}>{p.note||"—"}</td>
                    </tr>
                  ))}</tbody>
                </table>}
          </div>
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
          <br/><br/>The admin will review your application and notify you of the result.
        </div>
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
                    <span className="la-status-badge" style={{background:st.bg,color:st.color}}>{st.label}</span>
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
        }}>Submit Another Application</button>
      </div>
    </div>
  );

  return (
    <div className="la-wrapper">
      <LoanDetailModal/>

      <div className="la-page-header">
        <div className="la-page-title">Apply for Loan</div>
        <div className="la-page-sub">Submit a loan application online. Admin will review and notify you.</div>
      </div>

      {/* ── Eligibility Status ── */}
      <div style={{
        background: eligibility.eligible ? "#e8f5e9" : "#ffebee",
        border: `1.5px solid ${eligibility.eligible ? "#a5d6a7" : "#ef9a9a"}`,
        borderRadius:12, padding:"16px 18px", marginBottom:16,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          {eligibility.eligible
            ? <CheckCircle size={18} color="#2e7d32"/>
            : <XCircle size={18} color="#c62828"/>}
          <span style={{fontWeight:800,fontSize:14,color:eligibility.eligible?"#1b5e20":"#c62828"}}>
            {eligibility.eligible ? "You are eligible to apply for a loan" : "You are not eligible to apply at this time"}
          </span>
        </div>

        {/* Passed checks */}
        {eligibility.passed.map((p,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#2e7d32",marginBottom:4}}>
            <CheckCircle size={12} color="#2e7d32"/> {p}
          </div>
        ))}

        {/* Issues */}
        {eligibility.issues.map((issue,i) => (
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:6,fontSize:12,color:"#c62828",background:"#fff",borderRadius:8,padding:"8px 12px",border:"1px solid #ef9a9a",marginTop:6}}>
            <AlertTriangle size={13} style={{flexShrink:0,marginTop:1}}/> {issue}
          </div>
        ))}

        {/* Stats row */}
        <div style={{display:"flex",gap:12,marginTop:12,flexWrap:"wrap"}}>
          {[
            ["Share Capital",    `₱${shareCapital.toLocaleString()}`,                                          "#1b5e20"],
            ["Max Loanable (×2)",`₱${maxLoanable.toLocaleString()}`,                                          "#1565c0"],
            ["Active Loans",     myLoans.filter(l=>["Active","Overdue"].includes(l.status)).length,            myLoans.filter(l=>["Active","Overdue"].includes(l.status)).length>0?"#c62828":"#2e7d32"],
            ["Completed Loans",  myLoans.filter(l=>l.status==="Completed").length,                             "#2e7d32"],
          ].map(([label,val,color])=>(
            <div key={label} style={{background:"rgba(255,255,255,0.75)",borderRadius:8,padding:"8px 14px",textAlign:"center"}}>
              <div style={{fontSize:10,color:"#666",fontWeight:600,textTransform:"uppercase"}}>{label}</div>
              <div style={{fontSize:16,fontWeight:800,color}}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Loan Recommendation ── */}
      {eligibility.eligible && (
        <div style={{
          background:"linear-gradient(135deg,#1b5e20,#2e7d32)",
          borderRadius:14, padding:"18px 20px", marginBottom:16,
          boxShadow:"0 4px 14px rgba(27,94,32,0.25)",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <div style={{background:"rgba(255,255,255,0.2)",borderRadius:8,padding:6,display:"flex"}}>
              <span style={{fontSize:16}}>💡</span>
            </div>
            <div>
              <div style={{color:"#fff",fontWeight:800,fontSize:14}}>Loan Recommendation</div>
              <div style={{color:"rgba(255,255,255,0.7)",fontSize:11}}>
                Based on your share capital{recommendation.monthlyIncome > 0 ? " and monthly income" : ""}
              </div>
            </div>
          </div>

          {/* Recommendation cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
            {[
              {
                label:"Recommended Type",
                value:recommendation.type,
                sub:"Best for your profile",
                icon:"📋",
              },
              {
                label:"Recommended Amount",
                value:`₱${recommendation.amount.toLocaleString()}`,
                sub:`Max: ₱${recommendation.maxLoanable.toLocaleString()}`,
                icon:"💰",
              },
              {
                label:"Recommended Term",
                value:`${recommendation.term} months`,
                sub:recommendation.monthlyIncome > 0
                  ? `Monthly due: ₱${recommendation.monthlyDue.toLocaleString()}`
                  : "Based on loan amount",
                icon:"📅",
              },
            ].map((c,i) => (
              <div key={i} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontSize:16,marginBottom:4}}>{c.icon}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginBottom:2}}>{c.label}</div>
                <div style={{fontSize:14,fontWeight:800,color:"#fff"}}>{c.value}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:2}}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Debt ratio warning */}
          {recommendation.monthlyIncome > 0 && (
            <div style={{background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginBottom:4}}>
                  Debt-to-Income Ratio
                </div>
                <div style={{background:"rgba(255,255,255,0.2)",borderRadius:20,height:6,overflow:"hidden"}}>
                  <div style={{
                    width:`${Math.min(recommendation.debtRatio,100)}%`,
                    height:"100%",borderRadius:20,
                    background:recommendation.debtRatio<=30?"#69f0ae":recommendation.debtRatio<=40?"#ffeb3b":"#ff5252",
                    transition:"width 0.6s",
                  }}/>
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:18,fontWeight:800,color:recommendation.debtRatio<=30?"#69f0ae":recommendation.debtRatio<=40?"#ffeb3b":"#ff5252"}}>
                  {recommendation.debtRatio}%
                </div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>
                  {recommendation.debtRatio<=30?"✅ Good":"⚠ High"}
                </div>
              </div>
            </div>
          )}

          {/* Apply recommended button */}
          <button
            onClick={() => {
              setSelType(recommendation.type);
              setForm(p => ({
                ...p,
                amount: String(recommendation.amount),
                term:   String(recommendation.term),
              }));
              setStep(2);
            }}
            style={{
              marginTop:12, width:"100%", padding:"11px",
              background:"rgba(255,255,255,0.95)", color:"#1b5e20",
              border:"none", borderRadius:10, fontSize:13, fontWeight:800,
              cursor:"pointer", fontFamily:"inherit",
              transition:"all 0.15s",
            }}
          >
            Apply Recommended Loan →
          </button>
        </div>
      )}

      {/* Loan History */}
      <div className="la-card" style={{marginBottom:16}}>
        <div className="la-history-header" onClick={() => setShowHistory(h => !h)} style={{cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div className="la-card-title" style={{margin:0}}>📋 My Loan Applications ({myLoans.length})</div>
          <span style={{fontSize:12,color:"#888"}}>{showHistory ? "▲ Hide" : "▼ Show"}</span>
        </div>
        {showHistory && (
          <div style={{marginTop:12}}>
            {loadingLoans
              ? <div style={{textAlign:"center",color:"#aaa",padding:"16px 0",fontSize:13}}>Loading...</div>
              : myLoans.length === 0
              ? <div style={{textAlign:"center",color:"#aaa",padding:"16px 0",fontSize:13}}>No loan applications yet.</div>
              : myLoans.map((l, i) => {
                  const st = STATUS_COLOR[l.status] || { bg:"#f5f5f5", color:"#888", label:l.status };
                  return (
                    <div key={i} className="la-history-item" onClick={() => handleLoanClick(l)} style={{cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#f9fef9"}
                      onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <div className="la-history-left">
                        <div className="la-history-id">{l.loan_id}</div>
                        <div className="la-history-type">{l.loan_type}</div>
                        <div className="la-history-date">Applied: {l.applied_at?.slice(0,10)}</div>
                      </div>
                      <div className="la-history-right">
                        <div className="la-history-amount">₱{Number(l.amount).toLocaleString()}</div>
                        <span className="la-status-badge" style={{background:st.bg,color:st.color}}>{st.label}</span>
                        {l.decline_reason && <div className="la-history-reason">Reason: "{l.decline_reason}"</div>}
                      </div>
                    </div>
                  );
                })}
          </div>
        )}
      </div>

      {/* Block if not eligible */}
      {!eligibility.eligible ? (
        <div style={{background:"#fff3e0",border:"1.5px solid #ffcc80",borderRadius:12,padding:"24px",textAlign:"center"}}>
          <AlertTriangle size={36} color="#e65100" style={{marginBottom:8}}/>
          <div style={{fontWeight:700,fontSize:15,color:"#e65100",marginBottom:8}}>Cannot Apply for a New Loan</div>
          <div style={{fontSize:13,color:"#666",lineHeight:1.6}}>
            Please resolve the issues listed above before applying for a new loan.
            Visit the LEAF MPC office for assistance.
          </div>
        </div>
      ) : (<>

        {/* Step Indicator */}
        <div className="la-steps">
          {["Choose Loan Type","Loan Details","Review"].map((s,i) => (
            <div key={i} className={`la-step ${step >= i+1?"active":""} ${step > i+1?"done":""}`}>
              <div className="la-step-dot">{step > i+1 ? "✓" : i+1}</div>
              <div className="la-step-label">{s}</div>
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="la-card">
            <div className="la-card-title">Choose Loan Type</div>
            <div className="la-loan-types">
              {LOAN_TYPES.map(lt => (
                <div key={lt.type} className={`la-type-card ${selType===lt.type?"selected":""}`}
                  onClick={() => setSelType(lt.type)}
                  style={selType===lt.type ? {borderColor:lt.border,background:lt.color} : {}}>
                  <div className="la-type-icon" style={{background:lt.color,border:`1.5px solid ${lt.border}`,borderRadius:14,width:56,height:56,minWidth:56,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"}}>
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
              <button className="la-btn-next" onClick={() => setStep(2)} disabled={!selType}>Next: Loan Details →</button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && selectedType && (
          <div className="la-card">
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
              <div style={{background:selectedType.color,border:`1.5px solid ${selectedType.border}`,borderRadius:12,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{selectedType.icon}</div>
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
                  <input className={`la-amount-input ${errors.amount?"la-err":""}`} type="number" name="amount" min="3000"
                    value={form.amount} onChange={e => { handle(e); setErrors(p => ({...p,amount:""})); }}
                    placeholder={`Min ₱3,000 — Max ₱${maxLoanable.toLocaleString()}`}/>
                </div>
                {errors.amount && <div className="la-field-err">{errors.amount}</div>}
                <div style={{fontSize:10,color:"#888",marginTop:4}}>Max loanable: <strong style={{color:"#1565c0"}}>₱{maxLoanable.toLocaleString()}</strong> (Share Capital × 2)</div>
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
                <textarea className={`la-textarea ${errors.purpose?"la-err":""}`} name="purpose" rows={3}
                  placeholder="Describe the purpose of your loan..." value={form.purpose}
                  onChange={e => { handle(e); setErrors(p => ({...p,purpose:""})); }}/>
                {errors.purpose && <div className="la-field-err">{errors.purpose}</div>}
              </div>
              <div className="la-field">
                <label className="la-label">Collateral (if any)</label>
                <input className="la-input" type="text" name="collateral" value={form.collateral} onChange={handle} placeholder="e.g. Land title, vehicle"/>
              </div>
              <div className="la-field">
                <label className="la-label">Additional Notes</label>
                <input className="la-input" type="text" name="note" value={form.note} onChange={handle} placeholder="Optional"/>
              </div>
            </div>
            {showComputation && (
              <div className="la-computation">
                <div className="la-comp-title">🧮 Loan Computation (LEAF MPC)</div>
                <div className="la-comp-summary">
                  <div className="la-comp-row"><span>Interest Rate</span><span className="fw">{(monthlyRate*100).toFixed(3)}% / mo × {term} months</span></div>
                  <div className="la-comp-row"><span>Total Interest</span><span className="orange fw">₱{interest.toFixed(2)}</span></div>
                  <div className="la-comp-row highlight"><span>Monthly Amortization</span><span className="green fw">₱{monthlyEst.toFixed(2)}</span></div>
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

        {/* Step 3 */}
        {step === 3 && (
          <div className="la-card">
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
              <div style={{background:selectedType?.color,border:`1.5px solid ${selectedType?.border}`,borderRadius:12,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{selectedType?.icon}</div>
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
                  <span className={`la-review-val ${k==="Amount"||k==="Net Proceeds"?"green fw":k==="Total Interest"?"orange":""}`}>{v}</span>
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
      </>)}
    </div>
  );
}