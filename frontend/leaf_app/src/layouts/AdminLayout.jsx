import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Users, UserCog, FileText,
  CreditCard, CheckSquare, Megaphone, BarChart2, Leaf
} from "lucide-react";
import "./AdminLayout.css";

const NAV_ITEMS = [
  { to: "/admin/dashboard",    icon: <LayoutDashboard size={15} />, label: "Dashboard"          },
  { to: "/admin/members",      icon: <Users           size={15} />, label: "Manage Member"      },
  { to: "/admin/staff",        icon: <UserCog         size={15} />, label: "Manage Staff"       },
  { to: "/admin/applications", icon: <FileText        size={15} />, label: "Online Application" },
  { to: "/admin/loan-payment", icon: <CreditCard      size={15} />, label: "Loan Payment"       },
  { to: "/admin/loan-approval",icon: <CheckSquare     size={15} />, label: "Loan Approval"      },
  { to: "/admin/announcement", icon: <Megaphone       size={15} />, label: "Announcement"       },
  { to: "/admin/reports",      icon: <BarChart2       size={15} />, label: "Reports"            },
];

const PAGE_CONFIG = {
  "/admin/dashboard": {
    title: "Office Operations Dashboard",
    sub:   "Manage LEAF MPC member records and financial audits.",
    actions: [
      { label: "⬇ Export Excel",    cls: "btn-outline", action: "export"   },
      { label: "+ New F2F Payment", cls: "btn-blue",    action: "f2f"      },
      { label: "+ Register Member", cls: "btn-green",   action: "register" },
    ],
  },
  "/admin/members": {
    title: "Manage Members",
    sub:   "View, edit, and manage all registered LEAF MPC members.",
    actions: [
      { label: "+ Register Member", cls: "btn-green", action: "register" },
    ],
  },
  "/admin/staff": {
    title: "Manage Staff",
    sub:   "Add and manage staff accounts for office personnel.",
    actions: [],
  },
  "/admin/applications": {
    title: "Online Applications",
    sub:   "Review membership registration applications submitted online.",
    actions: [],
  },
  "/admin/loan-payment": {
    title: "Loan Payment",
    sub:   "Record F2F loan payments collected at the office.",
    actions: [
      { label: "+ New F2F Payment", cls: "btn-blue", action: "f2f" },
    ],
  },
  "/admin/loan-approval": {
    title: "Loan Approval",
    sub:   "Evaluate and process member loan applications.",
    actions: [
      { label: "+ New Loan Application", cls: "btn-green", action: "newloan" },
    ],
  },
  "/admin/announcement": {
    title: "Announcements",
    sub:   "Post activities, seminars, and notices to all members.",
    actions: [],
  },
  "/admin/reports": {
    title: "Reports & Analytics",
    sub:   "Financial summaries, loan analytics, and payment behavior reports.",
    actions: [
      { label: "⬇ Export Excel", cls: "btn-outline", action: "export" },
    ],
  },
};

const DEFAULT_CONFIG = { title: "LEAF MPC Admin", sub: "Cooperative Information System", actions: [] };

// ─── Quick F2F Payment Modal ──────────────────────────────────────────────────
const LOAN_OPTIONS = [
  { loanId:"LN-2026-001", memberId:"LEAF-100-01", fullname:"Junelle Dinglasan",      balance:12500, monthlyDue:1500 },
  { loanId:"LN-2026-002", memberId:"LEAF-100-02", fullname:"MarkVincent Castillano", balance:8000,  monthlyDue:900  },
  { loanId:"LN-2026-003", memberId:"LEAF-100-03", fullname:"Hillery Verastigue",     balance:42000, monthlyDue:4500 },
  { loanId:"LN-2026-004", memberId:"LEAF-100-05", fullname:"Maria Santos",           balance:3000,  monthlyDue:1200 },
  { loanId:"LN-2026-006", memberId:"LEAF-100-09", fullname:"Rosa Mendoza",           balance:10000, monthlyDue:1000 },
];

function F2FModal({ onClose }) {
  const [step,     setStep]    = useState(1);
  const [selected, setSelect]  = useState(null);
  const [amount,   setAmount]  = useState("");
  const [note,     setNote]    = useState("");
  const [error,    setError]   = useState("");
  const [done,     setDone]    = useState(false);
  const [search,   setSearch]  = useState("");

  const filtered = LOAN_OPTIONS.filter(l =>
    l.fullname.toLowerCase().includes(search.toLowerCase()) ||
    l.memberId.toLowerCase().includes(search.toLowerCase()) ||
    l.loanId.toLowerCase().includes(search.toLowerCase())
  );

  const parsed  = parseFloat(amount) || 0;
  const isValid = parsed > 0 && selected && parsed <= selected.balance;

  const handlePay = () => {
    if (!parsed || parsed <= 0)           { setError("Enter a valid amount."); return; }
    if (parsed > selected.balance)        { setError(`Exceeds remaining balance ₱${selected.balance.toLocaleString()}.`); return; }
    setDone(true);
  };

  if (done) return (
    <div className="al-overlay" onClick={onClose}>
      <div className="al-modal al-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="al-modal-body" style={{alignItems:"center",textAlign:"center",padding:"32px 24px",gap:12}}>
          <div style={{fontSize:40}}>✅</div>
          <div style={{fontSize:15,fontWeight:700,color:"#1b5e20"}}>Payment Recorded!</div>
          <div style={{fontSize:12,color:"#888"}}>
            ₱{parsed.toLocaleString()} payment for <strong>{selected.fullname}</strong> has been saved to the blockchain ledger.
          </div>
          <div style={{fontSize:10,color:"#bbb",fontFamily:"monospace"}}>
            Hash: hx{Math.random().toString(36).slice(2,14)}-j{Math.floor(Math.random()*9)}
          </div>
        </div>
        <div className="al-modal-footer">
          <button className="al-btn-save" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="al-overlay" onClick={onClose}>
      <div className="al-modal" onClick={e => e.stopPropagation()}>
        <div className="al-modal-header">
          <div>
            <div className="al-modal-title">New F2F Payment</div>
            <div className="al-modal-sub">Step {step} of 2 — {step === 1 ? "Select Member Loan" : "Enter Payment Details"}</div>
          </div>
          <button className="al-modal-close" onClick={onClose}>✕</button>
        </div>

        {step === 1 && (
          <>
            <div className="al-modal-body">
              <div className="al-step-info">Select the member's active loan to record payment for.</div>
              <div className="al-search-wrap">
                <span>🔍</span>
                <input className="al-search-in" placeholder="Search by name, member ID, loan ID..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="al-loan-list">
                {filtered.map(l => (
                  <div
                    key={l.loanId}
                    className={`al-loan-item ${selected?.loanId === l.loanId ? "selected" : ""}`}
                    onClick={() => { setSelect(l); setAmount(String(l.monthlyDue)); setError(""); }}
                  >
                    <div className="al-loan-avatar">{l.fullname.charAt(0)}</div>
                    <div className="al-loan-info">
                      <div className="al-loan-name">{l.fullname}</div>
                      <div className="al-loan-meta">{l.memberId} · {l.loanId}</div>
                    </div>
                    <div className="al-loan-bal">
                      <div className="al-bal-val">₱{l.balance.toLocaleString()}</div>
                      <div className="al-bal-label">balance</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="al-modal-footer">
              <button className="al-btn-cancel" onClick={onClose}>Cancel</button>
              <button className="al-btn-save" onClick={() => setStep(2)} disabled={!selected}>Next →</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="al-modal-body">
              {/* Selected borrower strip */}
              <div className="al-borrower-strip">
                <div className="al-loan-avatar">{selected.fullname.charAt(0)}</div>
                <div>
                  <div className="al-loan-name">{selected.fullname}</div>
                  <div className="al-loan-meta">{selected.memberId} · {selected.loanId} · Balance: ₱{selected.balance.toLocaleString()}</div>
                </div>
              </div>

              {/* Amount */}
              <div className="al-field">
                <label className="al-label">Payment Amount (₱) <span className="al-req">*</span></label>
                <div className="al-amount-wrap">
                  <span className="al-peso">₱</span>
                  <input
                    className="al-amount-in"
                    type="number" min="1" max={selected.balance}
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setError(""); }}
                    autoFocus
                  />
                </div>
                <div className="al-quick-row">
                  <button className="al-quick" onClick={() => { setAmount(String(selected.monthlyDue)); setError(""); }}>Monthly ₱{selected.monthlyDue.toLocaleString()}</button>
                  <button className="al-quick" onClick={() => { setAmount(String(selected.balance)); setError(""); }}>Full ₱{selected.balance.toLocaleString()}</button>
                </div>
              </div>

              <div className="al-field">
                <label className="al-label">Note (optional)</label>
                <input className="al-input" type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Partial payment, advance..." maxLength={80} />
              </div>

              {error && <div className="al-error">⚠ {error}</div>}

              {/* Preview */}
              {isValid && (
                <div className="al-preview">
                  <div className="al-prev-row"><span>Current balance</span><span>₱{selected.balance.toLocaleString()}</span></div>
                  <div className="al-prev-row deduct"><span>Payment</span><span>− ₱{parsed.toLocaleString()}</span></div>
                  <div className="al-prev-divider"/>
                  <div className="al-prev-row result">
                    <span>New balance</span>
                    <span className={(selected.balance - parsed) === 0 ? "paid-green" : ""}>
                      ₱{(selected.balance - parsed).toLocaleString()}
                      {(selected.balance - parsed) === 0 && " 🎉 FULLY PAID"}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="al-modal-footer">
              <button className="al-btn-cancel" onClick={() => setStep(1)}>← Back</button>
              <button className="al-btn-save" onClick={handlePay} disabled={!isValid}>Save Payment Record</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Quick Register Member Modal ──────────────────────────────────────────────
function RegisterModal({ onClose }) {
  const [form, setForm] = useState({ firstname:"", lastname:"", middlename:"", birthdate:"", gender:"Male", civilStatus:"Single", contact:"", email:"", address:"", occupation:"", validId:"UMID", idNumber:"", beneficiary:"", relationship:"" });
  const [errors, setErrors] = useState({});
  const [done,   setDone]   = useState(false);
  const [tab,    setTab]    = useState("personal");
  const [copied, setCopied] = useState("");

  // Generate Member ID + default credentials (stable across renders)
  const [creds] = useState(() => {
    const seq = String(Math.floor(Math.random()*900)+100);
    return { memberId:`LEAF-100-${seq}`, username:`leaf${seq}`, password:`leaf${seq}` };
  });

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.firstname.trim()) e.firstname = "Required";
    if (!form.lastname.trim())  e.lastname  = "Required";
    if (!form.birthdate)        e.birthdate = "Required";
    if (!form.contact.trim())   e.contact   = "Required";
    if (!form.address.trim())   e.address   = "Required";
    if (!form.idNumber.trim())  e.idNumber  = "Required";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); setTab("personal"); return; }
    setDone(true);
  };

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(""), 1800);
  };

  if (done) return (
    <div className="al-overlay" onClick={onClose}>
      <div className="al-modal" onClick={e => e.stopPropagation()}>
        <div className="al-modal-header">
          <div className="al-modal-title">🎉 Member Registered!</div>
          <button className="al-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="al-modal-body" style={{gap:14}}>
          <div style={{fontSize:12,color:"#666",lineHeight:1.6}}>
            <strong>{form.firstname} {form.lastname}</strong> has been successfully registered.
            Please give the member their credentials below so they can log in.
          </div>

          {/* Credentials card */}
          <div className="al-cred-card">
            <div className="al-cred-title">🔑 Login Credentials</div>
            <div className="al-cred-sub">Give this slip to the member</div>

            <div className="al-cred-row">
              <span className="al-cred-label">Member ID</span>
              <div className="al-cred-val-wrap">
                <span className="al-cred-val">{creds.memberId}</span>
                <button className="al-copy-btn" onClick={() => copyText(creds.memberId,"id")}>
                  {copied==="id" ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="al-cred-row">
              <span className="al-cred-label">Username</span>
              <div className="al-cred-val-wrap">
                <span className="al-cred-val">{creds.username}</span>
                <button className="al-copy-btn" onClick={() => copyText(creds.username,"user")}>
                  {copied==="user" ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="al-cred-row">
              <span className="al-cred-label">Password</span>
              <div className="al-cred-val-wrap">
                <span className="al-cred-val">{creds.password}</span>
                <button className="al-copy-btn" onClick={() => copyText(creds.password,"pass")}>
                  {copied==="pass" ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          <div className="al-cred-notice">
            💡 The member can change their username and password anytime in <strong>My Profile → Account Settings</strong> after logging in.
          </div>
        </div>
        <div className="al-modal-footer">
          <button className="al-btn-save" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );

  const Field = ({ name, label, type="text", options=null, required=false }) => (
    <div className="al-field">
      <label className="al-label">{label}{required && <span className="al-req"> *</span>}</label>
      {options ? (
        <select className={`al-input ${errors[name] ? "al-input-err" : ""}`} name={name} value={form[name]} onChange={handle}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input className={`al-input ${errors[name] ? "al-input-err" : ""}`} type={type} name={name} value={form[name]} onChange={e => { handle(e); setErrors(p => ({...p,[name]:""})); }} />
      )}
      {errors[name] && <div className="al-field-err">{errors[name]}</div>}
    </div>
  );

  return (
    <div className="al-overlay" onClick={onClose}>
      <div className="al-modal al-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="al-modal-header">
          <div>
            <div className="al-modal-title">Register New Member</div>
            <div className="al-modal-sub">Walk-in / F2F member registration at the office</div>
          </div>
          <button className="al-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="al-reg-tabs">
          {[["personal","👤 Personal Info"],["id","🪪 Valid ID"],["beneficiary","👥 Beneficiary"]].map(([k,l]) => (
            <button key={k} className={`al-reg-tab ${tab===k?"active":""}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        <div className="al-modal-body">
          {tab === "personal" && (
            <div className="al-form-grid">
              <Field name="lastname"    label="Last Name"    required />
              <Field name="firstname"   label="First Name"   required />
              <Field name="middlename"  label="Middle Name" />
              <Field name="birthdate"   label="Birthdate"    type="date" required />
              <Field name="gender"      label="Gender"       options={["Male","Female","Other"]} />
              <Field name="civilStatus" label="Civil Status" options={["Single","Married","Widowed","Separated"]} />
              <Field name="contact"     label="Contact No."  required />
              <Field name="email"       label="Email"        type="email" />
              <Field name="occupation"  label="Occupation" />
              <div className="al-field al-full">
                <label className="al-label">Address <span className="al-req">*</span></label>
                <input className={`al-input ${errors.address ? "al-input-err" : ""}`} name="address" value={form.address} onChange={e => { handle(e); setErrors(p => ({...p,address:""})); }} placeholder="Full address" />
                {errors.address && <div className="al-field-err">{errors.address}</div>}
              </div>
            </div>
          )}

          {tab === "id" && (
            <div className="al-form-grid">
              <Field name="validId"  label="Type of Valid ID" options={["UMID","Philippine Passport","Driver's License","SSS ID","PhilHealth ID","Voter's ID","PRC ID","Postal ID"]} />
              <Field name="idNumber" label="ID Number" required />
            </div>
          )}

          {tab === "beneficiary" && (
            <div className="al-form-grid">
              <Field name="beneficiary"  label="Beneficiary Name" />
              <Field name="relationship" label="Relationship"     options={["Spouse","Parent","Child","Sibling","Other"]} />
            </div>
          )}
        </div>

        <div className="al-modal-footer">
          <button className="al-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="al-btn-save" onClick={handleSubmit}>Register Member</button>
        </div>
      </div>
    </div>
  );
}

// ─── New F2F Loan Application Modal ──────────────────────────────────────────
const MEMBERS_LIST = [
  { memberId:"LEAF-100-01", fullname:"Junelle Dinglasan",      shareCapital:9500  },
  { memberId:"LEAF-100-02", fullname:"MarkVincent Castillano", shareCapital:12000 },
  { memberId:"LEAF-100-03", fullname:"Hillery Verastigue",     shareCapital:7500  },
  { memberId:"LEAF-100-04", fullname:"Syke Hufana",            shareCapital:5000  },
  { memberId:"LEAF-100-05", fullname:"Maria Santos",           shareCapital:8500  },
  { memberId:"LEAF-100-07", fullname:"Ana Gonzales",           shareCapital:11000 },
  { memberId:"LEAF-100-09", fullname:"Rosa Mendoza",           shareCapital:4500  },
  { memberId:"LEAF-100-11", fullname:"Lina Villanueva",        shareCapital:6000  },
  { memberId:"LEAF-100-12", fullname:"Ramon Aquino",           shareCapital:8000  },
  { memberId:"LEAF-100-13", fullname:"Nena Pascual",           shareCapital:9000  },
];

const LOAN_TYPES_LIST = ["Regular Loan","Emergency Loan","Salary Loan","Housing Loan","Business Loan"];
const MAX_TERM = { "Regular Loan":24,"Emergency Loan":12,"Salary Loan":12,"Housing Loan":48,"Business Loan":36 };

function NewLoanModal({ onClose }) {
  const [step,     setStep]    = useState(1);
  const [selMember,setMember]  = useState(null);
  const [search,   setSearch]  = useState("");
  const [form,     setForm]    = useState({ loanType:"Regular Loan", amount:"", term:"12", purpose:"", collateral:"" });
  const [errors,   setErrors]  = useState({});
  const [done,     setDone]    = useState(false);

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const filtered = MEMBERS_LIST.filter(m =>
    m.fullname.toLowerCase().includes(search.toLowerCase()) ||
    m.memberId.toLowerCase().includes(search.toLowerCase())
  );

  const maxLoanable = selMember ? selMember.shareCapital * 3 : 0;
  const maxForType  = selMember ? Math.min(maxLoanable, { "Regular Loan":50000,"Emergency Loan":20000,"Salary Loan":30000,"Housing Loan":100000,"Business Loan":80000 }[form.loanType] || 50000) : 0;

  const monthly = form.amount && form.term
    ? (parseFloat(form.amount) * (0.05/12) / (1 - Math.pow(1 + 0.05/12, -parseInt(form.term)))).toFixed(2)
    : 0;

  const validate = () => {
    const e = {};
    if (!form.amount || parseFloat(form.amount) <= 0)      e.amount  = "Enter a valid amount.";
    if (selMember && parseFloat(form.amount) > maxForType) e.amount  = `Max loanable: ₱${maxForType.toLocaleString()}`;
    if (!form.purpose.trim())                              e.purpose = "Purpose is required.";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setDone(true);
  };

  const refNo = `LA-2026-${String(Math.floor(Math.random()*900)+100)}`;

  if (done) return (
    <div className="al-overlay" onClick={onClose}>
      <div className="al-modal al-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="al-modal-header">
          <div className="al-modal-title">✅ Application Recorded!</div>
          <button className="al-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="al-modal-body" style={{gap:12}}>
          <div style={{fontSize:12,color:"#666",lineHeight:1.6}}>
            Loan application for <strong>{selMember.fullname}</strong> has been recorded and is now <strong>For Review</strong>.
          </div>
          <div className="al-cred-card">
            <div className="al-cred-title">📋 Application Details</div>
            <div className="al-cred-row"><span className="al-cred-label">Ref No.</span><span className="al-cred-val">{refNo}</span></div>
            <div className="al-cred-row"><span className="al-cred-label">Member</span><span className="al-cred-val">{selMember.memberId}</span></div>
            <div className="al-cred-row"><span className="al-cred-label">Loan Type</span><span className="al-cred-val">{form.loanType}</span></div>
            <div className="al-cred-row"><span className="al-cred-label">Amount</span><span className="al-cred-val">₱{parseFloat(form.amount).toLocaleString()}</span></div>
            <div className="al-cred-row"><span className="al-cred-label">Monthly</span><span className="al-cred-val">₱{parseFloat(monthly).toLocaleString()}</span></div>
          </div>
          <div className="al-cred-notice">Go to Loan Approval page to process this application.</div>
        </div>
        <div className="al-modal-footer">
          <button className="al-btn-save" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="al-overlay" onClick={onClose}>
      <div className="al-modal al-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="al-modal-header">
          <div>
            <div className="al-modal-title">New F2F Loan Application</div>
            <div className="al-modal-sub">Step {step} of 2 — {step===1 ? "Select Member" : "Loan Details"}</div>
          </div>
          <button className="al-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Step 1 — Pick member */}
        {step === 1 && (
          <>
            <div className="al-modal-body">
              <div className="al-step-info">Select the member who is applying for a loan.</div>
              <div className="al-search-wrap">
                <span>🔍</span>
                <input className="al-search-in" placeholder="Search by name or member ID..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="al-loan-list">
                {filtered.map(m => (
                  <div
                    key={m.memberId}
                    className={`al-loan-item ${selMember?.memberId===m.memberId?"selected":""}`}
                    onClick={() => setMember(m)}
                  >
                    <div className="al-loan-avatar">{m.fullname.charAt(0)}</div>
                    <div className="al-loan-info">
                      <div className="al-loan-name">{m.fullname}</div>
                      <div className="al-loan-meta">{m.memberId}</div>
                    </div>
                    <div className="al-loan-bal">
                      <div className="al-bal-val" style={{color:"#2e7d32"}}>₱{(m.shareCapital*3).toLocaleString()}</div>
                      <div className="al-bal-label">max loanable</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="al-modal-footer">
              <button className="al-btn-cancel" onClick={onClose}>Cancel</button>
              <button className="al-btn-save" onClick={() => setStep(2)} disabled={!selMember}>Next →</button>
            </div>
          </>
        )}

        {/* Step 2 — Loan details */}
        {step === 2 && (
          <>
            <div className="al-modal-body">
              {/* Member strip */}
              <div className="al-borrower-strip">
                <div className="al-loan-avatar">{selMember.fullname.charAt(0)}</div>
                <div>
                  <div className="al-loan-name">{selMember.fullname}</div>
                  <div className="al-loan-meta">{selMember.memberId} · Share Capital: ₱{selMember.shareCapital.toLocaleString()} · Max: ₱{maxLoanable.toLocaleString()}</div>
                </div>
              </div>

              <div className="al-form-grid">
                {/* Loan type */}
                <div className="al-field al-full">
                  <label className="al-label">Loan Type</label>
                  <select className="al-input" name="loanType" value={form.loanType} onChange={e => { handle(e); setErrors({}); }}>
                    {LOAN_TYPES_LIST.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                {/* Amount */}
                <div className="al-field">
                  <label className="al-label">Amount (₱) <span className="al-req">*</span></label>
                  <div className="al-amount-wrap">
                    <span className="al-peso">₱</span>
                    <input
                      className={`al-amount-in ${errors.amount?"border-red":""}`}
                      type="number" name="amount" min="1"
                      placeholder={`Max ₱${maxForType.toLocaleString()}`}
                      value={form.amount}
                      onChange={e => { handle(e); setErrors(p=>({...p,amount:""})); }}
                    />
                  </div>
                  {errors.amount && <div className="al-error" style={{marginTop:4}}>{errors.amount}</div>}
                </div>

                {/* Term */}
                <div className="al-field">
                  <label className="al-label">Term (months)</label>
                  <select className="al-input" name="term" value={form.term} onChange={handle}>
                    {[3,6,9,12,18,24,36,48].filter(t => t <= (MAX_TERM[form.loanType]||24)).map(t => (
                      <option key={t} value={t}>{t} months</option>
                    ))}
                  </select>
                </div>

                {/* Purpose */}
                <div className="al-field al-full">
                  <label className="al-label">Purpose <span className="al-req">*</span></label>
                  <textarea
                    className={`al-input ${errors.purpose?"border-red":""}`}
                    name="purpose" rows={2}
                    placeholder="Reason for the loan..."
                    value={form.purpose}
                    onChange={e => { handle(e); setErrors(p=>({...p,purpose:""})); }}
                    style={{resize:"none"}}
                  />
                  {errors.purpose && <div className="al-error" style={{marginTop:4}}>{errors.purpose}</div>}
                </div>

                {/* Collateral */}
                <div className="al-field al-full">
                  <label className="al-label">Collateral (optional)</label>
                  <input className="al-input" name="collateral" placeholder="e.g. Land title, vehicle" value={form.collateral} onChange={handle} />
                </div>
              </div>

              {/* Deduction breakdown — live computed */}
              {monthly > 0 && (() => {
                const amt          = parseFloat(form.amount);
                const svcCharge    = amt * 0.01;
                const savingsDed   = amt * 0.02;
                const insurance    = 50;
                const totalDed     = svcCharge + savingsDed + insurance;
                const netProceeds  = amt - totalDed;
                return (
                  <div style={{marginTop:12}}>
                    <div className="al-deduct-title">💰 Loan Summary & Deductions</div>
                    <div className="al-deduct-box">
                      <div className="al-deduct-row">
                        <span className="al-deduct-label">Loan Amount</span>
                        <span className="al-deduct-val">₱{amt.toLocaleString()}</span>
                      </div>
                      <div className="al-deduct-row">
                        <span className="al-deduct-label">Term</span>
                        <span className="al-deduct-val">{form.term} months</span>
                      </div>
                      <div className="al-deduct-row">
                        <span className="al-deduct-label">Interest Rate</span>
                        <span className="al-deduct-val">5% per annum</span>
                      </div>
                      <div className="al-deduct-row">
                        <span className="al-deduct-label">Est. Monthly</span>
                        <span className="al-deduct-val" style={{color:"#2e7d32",fontWeight:700}}>₱{parseFloat(monthly).toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                      </div>
                      <div className="al-deduct-divider" />
                      <div className="al-deduct-row">
                        <span className="al-deduct-label">Service Charge <span className="al-deduct-rate">(1%)</span></span>
                        <span className="al-deduct-val al-deduct-red">− ₱{svcCharge.toFixed(2)}</span>
                      </div>
                      <div className="al-deduct-row">
                        <span className="al-deduct-label">Savings Deposit <span className="al-deduct-rate">(2%)</span></span>
                        <span className="al-deduct-val al-deduct-red">− ₱{savingsDed.toFixed(2)}</span>
                      </div>
                      <div className="al-deduct-row">
                        <span className="al-deduct-label">Insurance Fee <span className="al-deduct-rate">(fixed)</span></span>
                        <span className="al-deduct-val al-deduct-red">− ₱{insurance.toFixed(2)}</span>
                      </div>
                      <div className="al-deduct-divider" />
                      <div className="al-deduct-row al-deduct-net">
                        <span className="al-deduct-label">Net Proceeds <span className="al-deduct-rate">(actual release)</span></span>
                        <span className="al-net-val">₱{netProceeds.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="al-deduct-notice">
                      💡 Member will receive <strong>₱{netProceeds.toFixed(2)}</strong> after deductions.
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="al-modal-footer">
              <button className="al-btn-cancel" onClick={() => setStep(1)}>← Back</button>
              <button className="al-btn-save" onClick={handleSubmit}>Submit Application</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function AdminLayout() {
  const [clock,       setClock]  = useState("");
  const [showF2F,     setF2F]    = useState(false);
  const [showReg,     setReg]    = useState(false);
  const [showLoan,    setLoan]   = useState(false);
  const [sidebarOpen, setSidebar]= useState(false);
  const navigate                 = useNavigate();
  const location                 = useLocation();
  const { logout, user }         = useAuth();

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebar(false); }, [location.pathname]);

  const config = PAGE_CONFIG[location.pathname] || DEFAULT_CONFIG;

  useEffect(() => {
    const tick = () => {
      const now  = new Date();
      const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
      const mons = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
      const pad  = n => String(n).padStart(2, "0");
      setClock(`${days[now.getDay()]} ${mons[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} — ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleAction = (action) => {
    if (action === "f2f")      setF2F(true);
    if (action === "register") setReg(true);
    if (action === "newloan")  setLoan(true);
    if (action === "export")   alert("Export feature will be connected to the backend.");
  };

  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  return (
    <div className="admin-layout">
      {showF2F  && <F2FModal      onClose={() => setF2F(false)} />}
      {showReg  && <RegisterModal onClose={() => setReg(false)} />}
      {showLoan && <NewLoanModal  onClose={() => setLoan(false)} />}

      {/* Mobile sidebar overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebar(false)}
      />

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          {/*
          ════════════════════════════════════════════════════
          📌 HOW TO ADD YOUR LOGO IMAGE HERE
          ════════════════════════════════════════════════════
          STEP 1: Save your logo file to:
                  src/assets/logo.png  (transparent PNG)

          STEP 2: Import it at the top of this file:
                  import logo from "../../assets/logo.png";
                  (adjust path based on your folder structure)

          STEP 3: Replace the <div className="logo-icon"> block
                  below with this:

                  <img
                    src={logo}
                    alt="LEAF MPC Logo"
                    style={{ height: "34px", width: "auto", objectFit: "contain" }}
                  />

          That's it! The logo will appear in the sidebar header.
          ════════════════════════════════════════════════════
          */}
          <div className="logo-icon">
            <Leaf size={18} color="#fff" />
          </div>
          <div>
            <div className="logo-text">Leaf MPC</div>
            <div className="logo-sub">ADMIN</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="clock-display">{clock}</div>
          <button className="logout-btn" onClick={handleLogout}>LOGOUT</button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="admin-main">
        <header className="topbar">
          {/* Hamburger — visible on mobile only */}
          <button
            className={`hamburger ${sidebarOpen ? "open" : ""}`}
            onClick={() => setSidebar(s => !s)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
          <div className="topbar-left">
            <div className="topbar-brand">ADMIN</div>
          </div>
          <div className="topbar-right">
            {config.actions.map((action, i) => (
              <button key={i} className={`btn ${action.cls}`} onClick={() => handleAction(action.action)}>
                {action.label}
              </button>
            ))}
            <div className="user-chip">
              <div className="user-avatar">{user?.initials?.[0] || "A"}</div>
              <div>
                <span className="user-name">{user?.name || "Admin"}</span>
                <span className="user-role">Admin</span>
              </div>
            </div>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}