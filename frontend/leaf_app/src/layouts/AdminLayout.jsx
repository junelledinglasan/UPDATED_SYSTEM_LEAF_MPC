import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Users, UserCog, FileText,
  CreditCard, CheckSquare, Megaphone, BarChart2, Leaf
} from "lucide-react";
import { getLoansAPI, createLoanAPI, updateLoanStatusAPI } from "../api/loans";
import { getMembersAPI, registerMemberAPI } from "../api/members";
import { recordPaymentAPI } from "../api/payments";
import "./AdminLayout.css";
import logo from '../assets/logo.png';

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
      { label: "+ New F2F Payment",      cls: "btn-blue",  action: "f2f"     },
      { label: "+ New Loan Application", cls: "btn-green", action: "newloan" },
    ],
  },
  "/admin/loan-approval": {
    title: "Loan Approval",
    sub:   "Evaluate and process member loan applications.",
    actions: [],
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
// ─── Quick F2F Payment Modal ─────────────────────────────────────────────────
function F2FModal({ onClose }) {
  const [step,     setStep]   = useState(1);
  const [loans,    setLoans]  = useState([]);
  const [selected, setSelect] = useState(null);
  const [amount,   setAmount] = useState("");
  const [note,     setNote]   = useState("");
  const [error,    setError]  = useState("");
  const [done,     setDone]   = useState(false);
  const [loading,  setLoad]   = useState(false);
  const [fetching, setFetch]  = useState(true);
  const [search,   setSearch] = useState("");

  useEffect(() => {
    getLoansAPI({ status: "Active" })
      .then(data => setLoans(data))
      .catch(e => console.error(e))
      .finally(() => setFetch(false));
  }, []);

  const filtered = loans.filter(l =>
    (l.member_name||"").toLowerCase().includes(search.toLowerCase()) ||
    (l.member_code||"").toLowerCase().includes(search.toLowerCase()) ||
    (l.loan_id||"").toLowerCase().includes(search.toLowerCase())
  );

  const parsed  = parseFloat(amount) || 0;
  const balance = parseFloat(selected?.balance || 0);
  const isValid = parsed > 0 && selected && parsed <= balance;

  const handlePay = async () => {
    if (!parsed || parsed <= 0) { setError("Enter a valid amount."); return; }
    if (parsed > balance)       { setError(`Exceeds remaining balance ₱${balance.toLocaleString()}.`); return; }
    setLoad(true);
    try {
      await recordPaymentAPI({ loan: selected.id, member: selected.member, amount: parsed, note });
      setDone(true);
    } catch { setError("Failed to record payment. Please try again."); }
    finally { setLoad(false); }
  };

  if (done) return (
    <div className="al-overlay" onClick={onClose}>
      <div className="al-modal al-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="al-modal-body" style={{alignItems:"center",textAlign:"center",padding:"32px 24px",gap:12}}>
          <div style={{fontSize:40}}>✅</div>
          <div style={{fontSize:15,fontWeight:700,color:"#1b5e20"}}>Payment Recorded!</div>
          <div style={{fontSize:12,color:"#888"}}>
            ₱{parsed.toLocaleString()} payment for <strong>{selected.member_name}</strong> has been saved.
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
                {fetching ? <div style={{textAlign:"center",padding:20,color:"#aaa"}}>Loading loans...</div>
                : filtered.length === 0 ? <div style={{textAlign:"center",padding:20,color:"#aaa"}}>No active loans found.</div>
                : filtered.map(l => (
                  <div key={l.id} className={`al-loan-item ${selected?.id === l.id ? "selected" : ""}`}
                    onClick={() => { setSelect(l); setAmount(String(l.monthly_due||"")); setError(""); }}>
                    <div className="al-loan-avatar">{(l.member_name||"M")[0]}</div>
                    <div className="al-loan-info">
                      <div className="al-loan-name">{l.member_name}</div>
                      <div className="al-loan-meta">{l.member_code} · {l.loan_id}</div>
                    </div>
                    <div className="al-loan-bal">
                      <div className="al-bal-val">₱{Number(l.balance).toLocaleString()}</div>
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
              <div className="al-borrower-strip">
                <div className="al-loan-avatar">{(selected.member_name||"M")[0]}</div>
                <div>
                  <div className="al-loan-name">{selected.member_name}</div>
                  <div className="al-loan-meta">{selected.member_code} · {selected.loan_id} · Balance: ₱{balance.toLocaleString()}</div>
                </div>
              </div>
              <div className="al-field">
                <label className="al-label">Payment Amount (₱) <span className="al-req">*</span></label>
                <div className="al-amount-wrap">
                  <span className="al-peso">₱</span>
                  <input className="al-amount-in" type="number" min="1" max={balance}
                    value={amount} onChange={e => { setAmount(e.target.value); setError(""); }} autoFocus />
                </div>
                <div className="al-quick-row">
                  <button className="al-quick" onClick={() => { setAmount(String(selected.monthly_due||"")); setError(""); }}>Monthly ₱{Number(selected.monthly_due||0).toLocaleString()}</button>
                  <button className="al-quick" onClick={() => { setAmount(String(balance)); setError(""); }}>Full ₱{balance.toLocaleString()}</button>
                </div>
              </div>
              <div className="al-field">
                <label className="al-label">Note (optional)</label>
                <input className="al-input" type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Partial payment, advance..." maxLength={80} />
              </div>
              {error && <div className="al-error">⚠ {error}</div>}
              {isValid && (
                <div className="al-preview">
                  <div className="al-prev-row"><span>Current balance</span><span>₱{balance.toLocaleString()}</span></div>
                  <div className="al-prev-row deduct"><span>Payment</span><span>− ₱{parsed.toLocaleString()}</span></div>
                  <div className="al-prev-divider"/>
                  <div className="al-prev-row result">
                    <span>New balance</span>
                    <span className={(balance-parsed)===0?"paid-green":""}>
                      ₱{(balance-parsed).toLocaleString()}
                      {(balance-parsed)===0 && " 🎉 FULLY PAID"}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="al-modal-footer">
              <button className="al-btn-cancel" onClick={() => setStep(1)}>← Back</button>
              <button className="al-btn-save" onClick={handlePay} disabled={!isValid||loading}>{loading?"Saving...":"Save Payment Record"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Quick Register Member Modal ───
// ─── FormField — OUTSIDE RegisterModal to prevent re-mount on every keystroke ─
function RegField({ name, label, type="text", options=null, required=false, form, errors, handle, clearErr }) {
  return (
    <div className="al-field">
      <label className="al-label">{label}{required && <span className="al-req"> *</span>}</label>
      {options ? (
        <select className={`al-input ${errors[name] ? "al-input-err" : ""}`} name={name} value={form[name]||""} onChange={handle}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input
          className={`al-input ${errors[name] ? "al-input-err" : ""}`}
          type={type} name={name} value={form[name]||""}
          onChange={e => { handle(e); if(clearErr) clearErr(name); }}
        />
      )}
      {errors[name] && <div className="al-field-err">{errors[name]}</div>}
    </div>
  );
}

function RegisterModal({ onClose }) {
  const TABS = [
    { key: "personal",       label: "👤 Personal Info"  },
    { key: "classification", label: "📋 Classification" },
    { key: "account",        label: "🔐 Account Info"   },
  ];

  const [form, setForm] = useState({
    // Personal
    first_name: "", last_name: "", middle_name: "", birth_date: "",
    civil_status: "Single", educational_attainment: "",
    contact_number: "", email: "", address: "", occupation: "",
    income: "", birth_certificate: false, marriage_certificate: false,
    // Classification
    classification: "Employed",
    school_name: "", year_level: "", allowance: "",
    pension_income: "", job_type: "Employed", monthly_income: "",
  });
  const [errors,  setErrors]  = useState({});
  const [done,    setDone]    = useState(false);
  const [tab,     setTab]     = useState("personal");
  const [copied,  setCopied]  = useState("");
  const [loading, setLoading] = useState(false);
  const [creds,   setCreds]   = useState({ memberId: "", username: "", password: "" });

  const handle = e => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [e.target.name]: val }));
    setErrors(p => ({ ...p, [e.target.name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.first_name.trim())     e.first_name     = "Required";
    if (!form.last_name.trim())      e.last_name      = "Required";
    if (!form.birth_date)            e.birth_date     = "Required";
    if (!form.contact_number.trim()) e.contact_number = "Required";
    if (!form.address.trim())        e.address        = "Required";
    if (form.classification === "Student" && !form.school_name.trim()) e.school_name = "Required";
    if (form.classification === "Student" && !form.year_level.trim())  e.year_level  = "Required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      const personalFields = ["first_name","last_name","birth_date","contact_number","address"];
      const classFields    = ["school_name","year_level"];
      if (personalFields.some(f => e[f])) { setTab("personal");        return; }
      if (classFields.some(f => e[f]))    { setTab("classification");   return; }
      return;
    }
    setLoading(true);
    try {
      const result = await registerMemberAPI({
        first_name:             form.first_name,
        last_name:              form.last_name,
        middle_name:            form.middle_name,
        birth_date:             form.birth_date,
        civil_status:           form.civil_status,
        educational_attainment: form.educational_attainment,
        contact_number:         form.contact_number,
        email:                  form.email,
        address:                form.address,
        occupation:             form.occupation,
        income:                 form.income || 0,
        birth_certificate:      form.birth_certificate,
        marriage_certificate:   form.marriage_certificate,
        classification:         form.classification,
        school_name:            form.school_name,
        year_level:             form.year_level,
        allowance:              form.allowance || 0,
        pension_income:         form.pension_income || 0,
        job_type:               form.job_type,
        monthly_income:         form.monthly_income || 0,
      });
      setCreds({ memberId: result.member_id, username: result.username, password: result.plain_password });
      setDone(true);
      setTab("account");
    } catch(err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || "Failed to register member.";
      setErrors({ first_name: msg });
      setTab("personal");
    } finally { setLoading(false); }
  };

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(""), 1800);
  };

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

        {/* 3 Tabs */}
        <div className="al-reg-tabs">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              className={`al-reg-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => !done && setTab(t.key)}
              style={{ cursor: done ? "default" : "pointer" }}
            >
              <span className="al-reg-tab-num">{i + 1}</span> {t.label}
            </button>
          ))}
        </div>

        <div className="al-modal-body">

          {/* ── Personal Info ── */}
          {tab === "personal" && (
            <div className="al-form-grid">
              <RegField name="last_name"              label="Last Name"              required form={form} errors={errors} handle={handle} clearErr={n => setErrors(p=>({...p,[n]:""})) }/>
              <RegField name="first_name"             label="First Name"             required form={form} errors={errors} handle={handle} clearErr={n => setErrors(p=>({...p,[n]:""})) }/>
              <RegField name="middle_name"            label="Middle Name"                     form={form} errors={errors} handle={handle}/>
              <RegField name="birth_date"             label="Birthdate"              required type="date" form={form} errors={errors} handle={handle} clearErr={n => setErrors(p=>({...p,[n]:""})) }/>
              <RegField name="civil_status"           label="Civil Status"           options={["Single","Married","Widowed","Separated"]} form={form} errors={errors} handle={handle}/>
              <RegField name="educational_attainment" label="Educational Attainment" options={["Elementary","High School","Vocational","College","Post Graduate"]} form={form} errors={errors} handle={handle}/>
              <RegField name="contact_number"         label="Contact No."            required form={form} errors={errors} handle={handle} clearErr={n => setErrors(p=>({...p,[n]:""})) }/>
              <RegField name="email"                  label="Email"                  type="email" form={form} errors={errors} handle={handle}/>
              <RegField name="occupation"             label="Occupation"                      form={form} errors={errors} handle={handle}/>
              <RegField name="income"                 label="Monthly Income (₱)"     type="number" form={form} errors={errors} handle={handle}/>
              <div className="al-field al-full">
                <label className="al-label">Address <span className="al-req">*</span></label>
                <input className={`al-input ${errors.address ? "al-input-err" : ""}`} name="address" value={form.address} onChange={handle} placeholder="Full address"/>
                {errors.address && <div className="al-field-err">{errors.address}</div>}
              </div>
              <div className="al-field">
                <label className="al-label">Birth Certificate Submitted</label>
                <label style={{display:"flex",alignItems:"center",gap:8,marginTop:4,fontSize:13,cursor:"pointer"}}>
                  <input type="checkbox" name="birth_certificate" checked={form.birth_certificate} onChange={handle}/> Yes
                </label>
              </div>
              <div className="al-field">
                <label className="al-label">Marriage Certificate Submitted</label>
                <label style={{display:"flex",alignItems:"center",gap:8,marginTop:4,fontSize:13,cursor:"pointer"}}>
                  <input type="checkbox" name="marriage_certificate" checked={form.marriage_certificate} onChange={handle}/> Yes (if married)
                </label>
              </div>
            </div>
          )}

          {/* ── Classification ── */}
          {tab === "classification" && (
            <div className="al-form-grid">
              <div className="al-field al-full">
                <label className="al-label">Member Classification <span className="al-req">*</span></label>
                <div style={{display:"flex",gap:12,marginTop:8}}>
                  {["Student","Senior","Employed"].map(c => (
                    <div key={c}
                      onClick={() => setForm(p => ({...p, classification: c}))}
                      style={{
                        flex:1, border:`2px solid ${form.classification===c?"#2e7d32":"#e0e0e0"}`,
                        borderRadius:10, padding:"16px 10px", textAlign:"center", cursor:"pointer",
                        background: form.classification===c ? "#e8f5e9" : "#fafafa", transition:"all 0.2s",
                      }}>
                      <div style={{fontSize:26,marginBottom:6}}>{c==="Student"?"🎓":c==="Senior"?"👴":"💼"}</div>
                      <div style={{fontSize:12,fontWeight:700,color:"#2e7d32"}}>{c}</div>
                    </div>
                  ))}
                </div>
              </div>

              {form.classification === "Student" && (<>
                <RegField name="school_name" label="School Name" required form={form} errors={errors} handle={handle} clearErr={n => setErrors(p=>({...p,[n]:""})) }/>
                <RegField name="year_level"  label="Year Level"  required form={form} errors={errors} handle={handle}
                  options={["Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12","1st Year","2nd Year","3rd Year","4th Year","5th Year","Graduate"]}/>
                <RegField name="allowance"   label="Monthly Allowance (₱)" type="number" form={form} errors={errors} handle={handle}/>
              </>)}

              {form.classification === "Senior" && (<>
                <RegField name="educational_attainment" label="Educational Attainment"
                  options={["Elementary","High School","Vocational","College","Post Graduate"]}
                  form={form} errors={errors} handle={handle}/>
                <RegField name="pension_income" label="Monthly Pension Income (₱)" type="number" form={form} errors={errors} handle={handle}/>
              </>)}

              {form.classification === "Employed" && (<>
                <RegField name="occupation"     label="Occupation/Job Title" form={form} errors={errors} handle={handle}/>
                <RegField name="job_type"       label="Employment Type"
                  options={["Employed","Self-Employed","Business","Freelance","Other"]}
                  form={form} errors={errors} handle={handle}/>
                <RegField name="monthly_income" label="Monthly Income (₱)" type="number" form={form} errors={errors} handle={handle}/>
              </>)}
            </div>
          )}

          {/* ── Account Info ── */}
          {tab === "account" && (
            <div className="al-form-grid">
              {done ? (<>
                <div className="al-field al-full" style={{textAlign:"center",padding:"12px 0"}}>
                  <div style={{fontSize:40,marginBottom:8}}>🎉</div>
                  <div style={{fontSize:15,fontWeight:800,color:"#1b5e20",marginBottom:4}}>
                    {form.first_name} {form.last_name} is now an official member!
                  </div>
                  <div style={{fontSize:12,color:"#888"}}>Share the credentials below with the member.</div>
                </div>
                <div className="al-cred-card" style={{gridColumn:"1/-1"}}>
                  <div className="al-cred-title">🔑 Login Credentials</div>
                  <div className="al-cred-sub">Give this slip to the member</div>
                  {[["Member ID",creds.memberId,"id"],["Username",creds.username,"user"],["Password",creds.password,"pass"]].map(([k,v,key]) => (
                    <div key={k} className="al-cred-row">
                      <span className="al-cred-label">{k}</span>
                      <div className="al-cred-val-wrap">
                        <span className="al-cred-val">{v}</span>
                        <button className="al-copy-btn" onClick={() => copyText(v,key)}>
                          {copied===key ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="al-cred-notice" style={{gridColumn:"1/-1"}}>
                  💡 The member can change their username and password anytime in <strong>My Profile → Account Settings</strong> after logging in.
                </div>
              </>) : (
                <div className="al-field al-full" style={{textAlign:"center",padding:"24px 0",color:"#888"}}>
                  Complete Personal Info and Classification first, then submit to generate credentials.
                </div>
              )}
            </div>
          )}

        </div>

        <div className="al-modal-footer">
          {!done ? (<>
            {tab !== "personal" && (
              <button className="al-btn-cancel" onClick={() => {
                const keys = TABS.map(t => t.key);
                setTab(keys[keys.indexOf(tab) - 1]);
              }}>← Previous</button>
            )}
            {tab === "personal" && <button className="al-btn-cancel" onClick={onClose}>Cancel</button>}
            {tab !== "classification" ? (
              <button className="al-btn-save" onClick={() => {
                const keys = TABS.map(t => t.key);
                setTab(keys[keys.indexOf(tab) + 1]);
              }}>Next →</button>
            ) : (
              <button className="al-btn-save" onClick={handleSubmit} disabled={loading}>
                {loading ? "Registering..." : "✓ Register Member"}
              </button>
            )}
          </>) : (
            <button className="al-btn-save" onClick={onClose}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New F2F Loan Application Modal ──────────────────────────────────────────
const LOAN_TYPES_LIST = ["Regular Loan","Emergency Loan","Salary Loan","Housing Loan","Business Loan"];
const MAX_TERM = { "Regular Loan":24,"Emergency Loan":12,"Salary Loan":12,"Housing Loan":48,"Business Loan":36 };

function NewLoanModal({ onClose }) {
  const [step,          setStep]         = useState(1);
  const [selMember,     setMember]        = useState(null);
  const [search,        setSearch]        = useState("");
  const [form,          setForm]          = useState({ loanType:"Regular Loan", amount:"", term:"12", purpose:"", collateral:"" });
  const [errors,        setErrors]        = useState({});
  const [done,          setDone]          = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [refNo,         setRefNo]         = useState("");
  const [monthlyResult, setMonthlyResult] = useState(0);
  const [members,       setMembers]       = useState([]);
  const [fetching,      setFetching]      = useState(true);

  const handle   = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const clearErr = name => setErrors(p => ({ ...p, [name]: "" }));

  useEffect(() => {
    getMembersAPI()
      .then(data => setMembers(data))
      .catch(e => console.error(e))
      .finally(() => setFetching(false));
  }, []);

  const filtered = members.filter(m =>
    (m.fullname||"").toLowerCase().includes(search.toLowerCase()) ||
    (m.member_id||"").toLowerCase().includes(search.toLowerCase())
  );

  const maxLoanable = selMember ? parseFloat(selMember.share_capital||0) * 3 : 0;
  const maxForType  = selMember ? Math.min(maxLoanable, { "Regular Loan":50000,"Emergency Loan":20000,"Salary Loan":30000,"Housing Loan":100000,"Business Loan":80000 }[form.loanType] || 50000) : 0;

  // ── LEAF MPC Computation ────────────────────────────────────────────────
  const amount      = parseFloat(form.amount) || 0;
  const term        = parseInt(form.term) || 12;
  const monthlyRate = amount <= 50000 ? 0.0125 : amount <= 150000 ? 0.01125 : 0.01;
  const interest    = monthlyRate * amount * term;
  const serviceFee  = amount * 0.03;
  const filingFee   = amount <= 50000 ? 50 : 100;
  const insurance   = amount * 0.0125;
  const sd          = amount * 0.01;
  const sc          = amount * 0.03;
  const totalDed    = interest + serviceFee + filingFee + insurance + sd + sc;
  const netProceeds = amount - totalDed;
  const monthly     = amount > 0 ? ((amount + interest) / term).toFixed(2) : 0;

  const validate = () => {
    const e = {};
    if (!form.amount || parseFloat(form.amount) <= 0)      e.amount  = "Enter a valid amount.";
    if (selMember && parseFloat(form.amount) > maxForType) e.amount  = `Max loanable: ₱${maxForType.toLocaleString()}`;
    if (!form.purpose.trim())                              e.purpose = "Purpose is required.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoadingSubmit(true);
    try {
      const result = await createLoanAPI({
        member:      selMember.id,
        loan_type:   form.loanType,
        amount:      parseFloat(form.amount),
        term_months: parseInt(form.term),
        purpose:     form.purpose,
        collateral:  form.collateral,
      });
      // Auto-approve → Active so it appears in Active Loans immediately
      await updateLoanStatusAPI(result.id, "Approved");
      setRefNo(result.loan_id);
      setMonthlyResult(result.monthly_due);
      setDone(true);
    } catch(err) {
      setErrors({ amount: err.response?.data?.detail || "Failed to submit loan." });
    } finally { setLoadingSubmit(false); }
  };



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
            <div className="al-cred-row"><span className="al-cred-label">Loan ID</span><span className="al-cred-val">{refNo}</span></div>
            <div className="al-cred-row"><span className="al-cred-label">Member</span><span className="al-cred-val">{selMember.member_id}</span></div>
            <div className="al-cred-row"><span className="al-cred-label">Loan Type</span><span className="al-cred-val">{form.loanType}</span></div>
            <div className="al-cred-row"><span className="al-cred-label">Amount</span><span className="al-cred-val">₱{parseFloat(form.amount).toLocaleString()}</span></div>
            <div className="al-cred-row"><span className="al-cred-label">Monthly</span><span className="al-cred-val">₱{parseFloat(monthlyResult||monthly).toLocaleString()}</span></div>
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
                {fetching ? <div style={{textAlign:"center",padding:20,color:"#aaa"}}>Loading members...</div>
                : filtered.length===0 ? <div style={{textAlign:"center",padding:20,color:"#aaa"}}>No members found.</div>
                : filtered.map(m => (
                  <div
                    key={m.id}
                    className={`al-loan-item ${selMember?.id===m.id?"selected":""}`}
                    onClick={() => setMember(m)}
                  >
                    <div className="al-loan-avatar">{m.fullname.charAt(0)}</div>
                    <div className="al-loan-info">
                      <div className="al-loan-name">{m.fullname}</div>
                      <div className="al-loan-meta">{m.member_id}</div>
                    </div>
                    <div className="al-loan-bal">
                      <div className="al-bal-val" style={{color:"#2e7d32"}}>₱{(parseFloat(m.share_capital||0)*3).toLocaleString()}</div>
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
                  <div className="al-loan-meta">{selMember.member_id} · Share Capital: ₱{parseFloat(selMember.share_capital||0).toLocaleString()} · Max: ₱{maxLoanable.toLocaleString()}</div>
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

              {/* LEAF MPC Full Deduction Breakdown */}
              {amount >= 3000 && (
                <div style={{marginTop:12}}>
                  <div className="al-deduct-title">🧮 Loan Computation (LEAF MPC)</div>
                  <div className="al-deduct-box">
                    <div className="al-deduct-row">
                      <span className="al-deduct-label">Loan Amount</span>
                      <span className="al-deduct-val">₱{amount.toLocaleString()}</span>
                    </div>
                    <div className="al-deduct-row">
                      <span className="al-deduct-label">Interest Rate</span>
                      <span className="al-deduct-val">{(monthlyRate*100).toFixed(3)}%/mo × {term} months</span>
                    </div>
                    <div className="al-deduct-row">
                      <span className="al-deduct-label">Monthly Amortization</span>
                      <span className="al-deduct-val" style={{color:"#2e7d32",fontWeight:700}}>₱{parseFloat(monthly).toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                    </div>
                    <div className="al-deduct-divider"/>
                    <div style={{fontSize:11,fontWeight:600,color:"#555",margin:"4px 0 4px"}}>Upfront Deductions from Loan Release:</div>
                    <div className="al-deduct-row">
                      <span className="al-deduct-label">Interest <span className="al-deduct-rate">({(monthlyRate*100)}% × {term} mos)</span></span>
                      <span className="al-deduct-val al-deduct-red">− ₱{interest.toFixed(2)}</span>
                    </div>
                    <div className="al-deduct-row">
                      <span className="al-deduct-label">Service Fee <span className="al-deduct-rate">(3%)</span></span>
                      <span className="al-deduct-val al-deduct-red">− ₱{serviceFee.toFixed(2)}</span>
                    </div>
                    <div className="al-deduct-row">
                      <span className="al-deduct-label">Filing Fee</span>
                      <span className="al-deduct-val al-deduct-red">− ₱{filingFee.toFixed(2)}</span>
                    </div>
                    <div className="al-deduct-row">
                      <span className="al-deduct-label">Insurance <span className="al-deduct-rate">(1.25%)</span></span>
                      <span className="al-deduct-val al-deduct-red">− ₱{insurance.toFixed(2)}</span>
                    </div>
                    <div className="al-deduct-row">
                      <span className="al-deduct-label">Savings Deposit <span className="al-deduct-rate">(1%)</span></span>
                      <span className="al-deduct-val al-deduct-red">− ₱{sd.toFixed(2)}</span>
                    </div>
                    <div className="al-deduct-row">
                      <span className="al-deduct-label">Share Capital CBU <span className="al-deduct-rate">(3%)</span></span>
                      <span className="al-deduct-val al-deduct-red">− ₱{sc.toFixed(2)}</span>
                    </div>
                    <div className="al-deduct-divider"/>
                    <div className="al-deduct-row al-deduct-net">
                      <span className="al-deduct-label">Net Proceeds <span className="al-deduct-rate">(actual release)</span></span>
                      <span className="al-net-val">₱{netProceeds.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="al-deduct-notice">
                    💡 Member will receive <strong>₱{netProceeds.toFixed(2)}</strong> after all deductions.
                  </div>
                </div>
              )}
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
    navigate("/login");
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
            <img
                    src={logo}
                    alt="LEAF MPC Logo"
                    style={{ height: "35px", width: "300px", objectFit: "contain" }}
                  />
          </div>
          <div>
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