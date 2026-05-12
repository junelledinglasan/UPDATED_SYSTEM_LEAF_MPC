import { useState } from "react";
import "./LoanApplication.css";

const LOAN_TYPES = [
  { type:"Regular Loan",   icon:"🏠", desc:"For personal or household needs",     maxAmt:50000, maxTerm:24 },
  { type:"Emergency Loan", icon:"🚨", desc:"For urgent and unexpected expenses",   maxAmt:20000, maxTerm:12 },
  { type:"Salary Loan",    icon:"💼", desc:"Based on your monthly salary",          maxAmt:30000, maxTerm:12 },
  { type:"Housing Loan",   icon:"🏗",  desc:"For home repair or construction",      maxAmt:100000,maxTerm:48 },
  { type:"Business Loan",  icon:"🏪", desc:"For business capital or expansion",    maxAmt:80000, maxTerm:36 },
];

const SHARE_CAPITAL = 8500;

export default function LoanApplication() {
  const [step,    setStep]    = useState(1);
  const [selType, setSelType] = useState(null);
  const [form,    setForm]    = useState({ amount:"", term:"12", purpose:"", collateral:"None", note:"" });
  const [errors,  setErrors]  = useState({});
  const [submitted, setDone]  = useState(false);

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const maxLoanable = SHARE_CAPITAL * 3;
  const selectedType = LOAN_TYPES.find(l => l.type === selType);

  const monthlyEst = selType && form.amount && form.term
    ? (parseFloat(form.amount) * (0.05/12) / (1 - Math.pow(1 + 0.05/12, -parseInt(form.term)))).toFixed(2)
    : 0;

  const validate = () => {
    const e = {};
    if (!form.amount || parseFloat(form.amount) <= 0)      e.amount  = "Enter a valid amount.";
    if (selectedType && parseFloat(form.amount) > Math.min(selectedType.maxAmt, maxLoanable))
      e.amount = `Maximum loanable amount is ₱${Math.min(selectedType.maxAmt, maxLoanable).toLocaleString()}.`;
    if (!form.purpose.trim()) e.purpose = "Purpose is required.";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setDone(true);
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
          <span className="la-elig-val">₱{SHARE_CAPITAL.toLocaleString()}</span>
        </div>
        <div className="la-elig-divider" />
        <div className="la-elig-item">
          <span className="la-elig-label">Max Loanable (×3)</span>
          <span className="la-elig-val green">₱{maxLoanable.toLocaleString()}</span>
        </div>
        <div className="la-elig-divider" />
        <div className="la-elig-item">
          <span className="la-elig-label">Eligibility</span>
          <span className="la-elig-badge eligible">✓ Eligible</span>
        </div>
      </div>

      {/* Step indicator */}
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
              Next: Loan Details →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && selectedType && (
        <div className="la-card">
          <div className="la-card-title">Loan Details — {selectedType.type}</div>
          <div className="la-form-grid">
            <div className="la-field">
              <label className="la-label">Loan Amount (₱) <span className="la-req">*</span></label>
              <div className="la-amount-wrap">
                <span className="la-peso">₱</span>
                <input
                  className={`la-amount-input ${errors.amount?"la-err":""}`}
                  type="number" name="amount" min="1"
                  max={Math.min(selectedType.maxAmt, maxLoanable)}
                  value={form.amount} onChange={e => { handle(e); setErrors(p=>({...p,amount:""})); }}
                  placeholder={`Max ₱${Math.min(selectedType.maxAmt, maxLoanable).toLocaleString()}`}
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

          {/* Monthly estimate */}
          {monthlyEst > 0 && (
            <div className="la-estimate">
              <div className="la-est-row"><span>Loan Amount</span><span>₱{parseFloat(form.amount).toLocaleString()}</span></div>
              <div className="la-est-row"><span>Term</span><span>{form.term} months</span></div>
              <div className="la-est-row"><span>Interest Rate</span><span>5% per annum</span></div>
              <div className="la-est-divider" />
              <div className="la-est-row highlight"><span>Est. Monthly Payment</span><span className="green fw">₱{parseFloat(monthlyEst).toLocaleString()}</span></div>
            </div>
          )}

          <div className="la-card-footer">
            <button className="la-btn-back" onClick={() => setStep(1)}>← Back</button>
            <button className="la-btn-next" onClick={() => { const e=validate(); if(Object.keys(e).length){setErrors(e);return;} setStep(3); }}>
              Next: Review →
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
              ["Loan Type",    selType],
              ["Amount",       `₱${parseFloat(form.amount).toLocaleString()}`],
              ["Term",         `${form.term} months`],
              ["Est. Monthly", `₱${parseFloat(monthlyEst).toLocaleString()}`],
              ["Purpose",      form.purpose],
              ["Collateral",   form.collateral || "None"],
              ["Note",         form.note || "—"],
            ].map(([k,v]) => (
              <div key={k} className="la-review-item">
                <span className="la-review-key">{k}</span>
                <span className={`la-review-val ${k==="Amount"?"green fw":""}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="la-review-notice">
            📋 By submitting, you confirm that all information provided is accurate. The admin will evaluate your application and notify you of the result.
          </div>
          <div className="la-card-footer">
            <button className="la-btn-back" onClick={() => setStep(2)}>← Back</button>
            <button className="la-btn-submit" onClick={handleSubmit}>Submit Application</button>
          </div>
        </div>
      )}
    </div>
  );
}