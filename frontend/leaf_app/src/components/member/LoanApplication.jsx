import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { getMyProfileAPI } from "../../api/members";
import { createLoanAPI } from "../../api/loans";
import "./LoanApplication.css";

const LOAN_TYPES = [
  { type:"Regular Loan",   icon:"🏠", desc:"For personal or household needs",     maxAmt:50000, maxTerm:24 },
  { type:"Emergency Loan", icon:"🚨", desc:"For urgent and unexpected expenses",   maxAmt:20000, maxTerm:12 },
  { type:"Salary Loan",    icon:"💼", desc:"Based on your monthly salary",          maxAmt:30000, maxTerm:12 },
  { type:"Housing Loan",   icon:"🏗",  desc:"For home repair or construction",      maxAmt:100000,maxTerm:48 },
  { type:"Business Loan",  icon:"🏪", desc:"For business capital or expansion",    maxAmt:80000, maxTerm:36 },
];

export default function LoanApplication() {
  const ctx = useOutletContext() || {};
  const [step,       setStep]    = useState(1);
  const [shareCapital, setShareCapital] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    getMyProfileAPI()
      .then(p => setShareCapital(parseFloat(p.share_capital || 0)))
      .catch(() => setShareCapital(0))
      .finally(() => setLoadingProfile(false));
  }, []);
  const [selType, setSelType] = useState(null);
  const [form,    setForm]    = useState({ amount:"", term:"12", purpose:"", collateral:"None", note:"" });
  const [errors,  setErrors]  = useState({});
  const [submitted, setDone]  = useState(false);
  const [loading, setLoading]  = useState(false);

  const amount = parseFloat(form.amount) || 0;
  const term   = parseInt(form.term) || 12;

  // ── LEAF MPC Interest Rates (same as admin LoanApproval) ─────────────────
  const monthlyRate = amount <= 50000 ? 0.0125 : amount <= 150000 ? 0.01125 : 0.01;

  // ── Deductions (upfront) ─────────────────────────────────────────────────
  const interest   = monthlyRate * amount * term;
  const serviceFee = amount * 0.03;
  const filingFee  = amount <= 50000 ? 50 : 100;
  const insurance  = amount * 0.0125;
  const sd         = amount * 0.01;
  const sc         = amount * 0.03;
  const totalDed   = interest + serviceFee + filingFee + insurance + sd + sc;
  const netProceeds= amount - totalDed;
  const monthlyEst = amount > 0 ? (amount + interest) / term : 0;

  const showComputation = amount >= 3000 && selType && step === 2;

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const maxLoanable  = shareCapital * 3;
  const selectedType = LOAN_TYPES.find(l => l.type === selType);

  const validate = () => {
    const e = {};
    if (!form.amount || parseFloat(form.amount) <= 0)      e.amount  = "Enter a valid amount.";
    if (selectedType && parseFloat(form.amount) > Math.min(selectedType.maxAmt, maxLoanable))
      e.amount = `Maximum loanable amount is ?${Math.min(selectedType.maxAmt, maxLoanable).toLocaleString()}.`;
    if (!form.purpose.trim()) e.purpose = "Purpose is required.";
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
        collateral:  form.collateral !== "None" ? form.collateral : "",
      });
      setDone(true);
    } catch(err) {
      const msg = err.response?.data?.detail || "Failed to submit application.";
      setErrors({ purpose: msg });
    } finally { setLoading(false); }
  };

  if (submitted) return (
    <div className="la-wrapper">
      <div className="la-success-card">
        <div className="la-success-icon">🎉</div>
        <div className="la-success-title">Application Submitted!</div>
        <div className="la-success-text">
          Your <strong>{selType}</strong> application for <strong>₱{parseFloat(form.amount).toLocaleString()}</strong> has been submitted successfully.
          <br/><br/>
          The admin will review your application and notify you of the result. Please wait for approval before visiting the office.
        </div>
        <div className="la-ref-box">
          Reference: APP-{Date.now().toString().slice(-8)}
        </div>
        <button className="la-new-btn" onClick={() => { setStep(1); setSelType(null); setForm({amount:"",term:"12",purpose:"",collateral:"None",note:""}); setDone(false); }}>
          Submit Another Application
        </button>
      </div>
    </div>
  );

  return (
    <div className="la-wrapper">
      <div className="la-page-header">
        <div className="la-page-title">Apply for Loan</div>
        <div className="la-page-sub">Submit a loan application online. Admin will review and notify you.</div>
      </div>

      {/* Eligibility info */}
      <div className="la-elig-banner">
        <div className="la-elig-item">
          <span className="la-elig-label">Share Capital</span>
          <span className="la-elig-val">₱{shareCapital.toLocaleString()}</span>
        </div>
        <div className="la-elig-divider" />
        <div className="la-elig-item">
          <span className="la-elig-label">Max Loanable (×3)</span>
          <span className="la-elig-val green">₱{maxLoanable.toLocaleString()}</span>
        </div>
        <div className="la-elig-divider" />
        <div className="la-elig-item">
          <span className="la-elig-label">Eligibility</span>
          <span className="la-elig-badge eligible">? Eligible</span>
        </div>
      </div>

      {/* Step indicator */}
      <div className="la-steps">
        {["Choose Loan Type","Loan Details","Review"].map((s,i) => (
          <div key={i} className={`la-step ${step >= i+1?"active":""} ${step > i+1?"done":""}`}>
            <div className="la-step-dot">{step > i+1 ? "?" : i+1}</div>
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
              <div
                key={lt.type}
                className={`la-type-card ${selType===lt.type?"selected":""}`}
                onClick={() => setSelType(lt.type)}
              >
                <div className="la-type-icon">{lt.icon}</div>
                <div className="la-type-name">{lt.type}</div>
                <div className="la-type-desc">{lt.desc}</div>
                <div className="la-type-max">Up to ₱{lt.maxAmt.toLocaleString()} · {lt.maxTerm} months max</div>
              </div>
            ))}
          </div>
          <div className="la-card-footer">
            <div />
            <button className="la-btn-next" onClick={() => setStep(2)} disabled={!selType}>
              Next: Loan Details ?
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && selectedType && (
        <div className="la-card">
          <div className="la-card-title">Loan Details ? {selectedType.type}</div>
          <div className="la-form-grid">
            <div className="la-field">
              <label className="la-label">Loan Amount (?) <span className="la-req">*</span></label>
              <div className="la-amount-wrap">
                <span className="la-peso">?</span>
                <input
                  className={`la-amount-input ${errors.amount?"la-err":""}`}
                  type="number" name="amount" min="1"
                  max={Math.min(selectedType.maxAmt, maxLoanable)}
                  value={form.amount} onChange={e => { handle(e); setErrors(p=>({...p,amount:""})); }}
                  placeholder={`Max ?${Math.min(selectedType.maxAmt, maxLoanable).toLocaleString()}`}
                />
              </div>
              {errors.amount && <div className="la-field-err">{errors.amount}</div>}
            </div>

            <div className="la-field">
              <label className="la-label">Loan Term</label>
              <select className="la-select" name="term" value={form.term} onChange={handle}>
                {[3,6,9,12,18,24,36,48].filter(t=>t<=selectedType.maxTerm).map(t=>(
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
                onChange={e => { handle(e); setErrors(p=>({...p,purpose:""})); }}
              />
              {errors.purpose && <div className="la-field-err">{errors.purpose}</div>}
            </div>

            <div className="la-field">
              <label className="la-label">Collateral (if any)</label>
              <input className="la-input" type="text" name="collateral" value={form.collateral} onChange={handle} placeholder="e.g. Land title, vehicle" />
            </div>

            <div className="la-field">
              <label className="la-label">Additional Notes</label>
              <input className="la-input" type="text" name="note" value={form.note} onChange={handle} placeholder="Optional" />
            </div>
          </div>

          {/* Full LEAF MPC Computation — same as admin LoanApproval */}
          {showComputation && (
            <div className="la-computation">
              <div className="la-comp-title">🧮 Loan Computation (LEAF MPC)</div>

              <div className="la-comp-summary">
                <div className="la-comp-row">
                  <span>Interest Rate</span>
                  <span className="fw">{(monthlyRate*100).toFixed(3)}%/mo × {term} months</span>
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
            <button className="la-btn-back" onClick={() => setStep(1)}>? Back</button>
            <button className="la-btn-next" onClick={() => { const e=validate(); if(Object.keys(e).length){setErrors(e);return;} setStep(3); }}>
              Next: Review ?
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="la-card">
          <div className="la-card-title">Review Application</div>
          <div className="la-review-grid">
            {[
              ["Loan Type",         selType],
              ["Amount",            `₱${amount.toLocaleString()}`],
              ["Term",              `${term} months`],
              ["Interest Rate",     `${(monthlyRate*100).toFixed(3)}% / month`],
              ["Total Interest",    `₱${interest.toFixed(2)}`],
              ["Monthly Amort.",    `₱${monthlyEst.toFixed(2)}`],
              ["Net Proceeds",      `₱${netProceeds.toFixed(2)}`],
              ["Purpose",           form.purpose],
              ["Collateral",        form.collateral || "None"],
            ].map(([k,v]) => (
              <div key={k} className="la-review-item">
                <span className="la-review-key">{k}</span>
                <span className={`la-review-val ${k==="Amount"||k==="Net Proceeds"?"green fw":k==="Total Interest"?"orange":""}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="la-review-notice">
            📋 By submitting, you confirm that all information provided is accurate. The admin will evaluate your application and notify you of the result.
          </div>
          <div className="la-card-footer">
            <button className="la-btn-back" onClick={() => setStep(2)}>? Back</button>
            <button className="la-btn-submit" onClick={handleSubmit}>Submit Application</button>
          </div>
        </div>
      )}
    </div>
  );
}