import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./StaffLayout.css";

// ─── Navigation Items (no Reports) ───────────────────────────────────────────
const NAV_ITEMS = [
  { to: "/staff/home",          icon: "🏠", label: "Home"               },
  { to: "/staff/members",       icon: "👥", label: "Manage Member"      },
  { to: "/staff/applications",  icon: "📋", label: "Online Application" },
  { to: "/staff/loan-payment",  icon: "💸", label: "Loan Payment"       },
  { to: "/staff/loan-approval", icon: "✅", label: "Loan Approval"      },
  { to: "/staff/announcement",  icon: "📢", label: "Announcement"       },
];

// ─── Page Header Config ───────────────────────────────────────────────────────
const PAGE_CONFIG = {
  "/staff/home": {
    title:   "Staff Portal",
    sub:     "Welcome to your Leaf MPC staff workspace.",
    actions: [
      { label: "+ New F2F Payment", cls: "sl-btn-blue",  action: "f2f"      },
      { label: "+ Register Member", cls: "sl-btn-green", action: "register" },
    ],
  },
  "/staff/members": {
    title:   "Manage Members",
    sub:     "View and manage registered LEAF MPC members.",
    actions: [
      { label: "+ Register Member", cls: "sl-btn-green", action: "register" },
    ],
  },
  "/staff/applications": {
    title:   "Online Applications",
    sub:     "Review membership registration applications submitted online.",
    actions: [],
  },
  "/staff/loan-payment": {
    title:   "Loan Payment",
    sub:     "Record F2F loan payments collected at the office.",
    actions: [
      { label: "+ New F2F Payment", cls: "sl-btn-blue", action: "f2f" },
    ],
  },
  "/staff/loan-approval": {
    title:   "Loan Approval",
    sub:     "Evaluate and process member loan applications.",
    actions: [],
  },
  "/staff/announcement": {
    title:   "Announcements",
    sub:     "Post activities, seminars, and notices to all members.",
    actions: [],
  },
};

const DEFAULT_CONFIG = {
  title:   "LEAF MPC Staff",
  sub:     "Cooperative Staff Portal",
  actions: [],
};

// ─── F2F Payment Modal ────────────────────────────────────────────────────────
const LOAN_OPTIONS = [
  { loanId:"LN-2026-001", memberId:"LEAF-100-01", fullname:"Junelle Dinglasan",      balance:12500, monthlyDue:1500 },
  { loanId:"LN-2026-002", memberId:"LEAF-100-02", fullname:"MarkVincent Castillano", balance:8000,  monthlyDue:900  },
  { loanId:"LN-2026-003", memberId:"LEAF-100-03", fullname:"Hillery Verastigue",     balance:42000, monthlyDue:4500 },
  { loanId:"LN-2026-004", memberId:"LEAF-100-05", fullname:"Maria Santos",           balance:3000,  monthlyDue:1200 },
  { loanId:"LN-2026-006", memberId:"LEAF-100-09", fullname:"Rosa Mendoza",           balance:10000, monthlyDue:1000 },
];

function F2FModal({ onClose }) {
  const [step,     setStep]   = useState(1);
  const [selected, setSelect] = useState(null);
  const [amount,   setAmount] = useState("");
  const [note,     setNote]   = useState("");
  const [error,    setError]  = useState("");
  const [done,     setDone]   = useState(false);
  const [search,   setSearch] = useState("");

  const filtered = LOAN_OPTIONS.filter(l =>
    l.fullname.toLowerCase().includes(search.toLowerCase()) ||
    l.memberId.toLowerCase().includes(search.toLowerCase()) ||
    l.loanId.toLowerCase().includes(search.toLowerCase())
  );

  const parsed  = parseFloat(amount) || 0;
  const isValid = parsed > 0 && selected && parsed <= selected.balance;

  const handlePay = () => {
    if (!parsed || parsed <= 0)    { setError("Enter a valid amount."); return; }
    if (parsed > selected.balance) { setError(`Exceeds remaining balance ₱${selected.balance.toLocaleString()}.`); return; }
    setDone(true);
  };

  if (done) return (
    <div className="sl-overlay" onClick={onClose}>
      <div className="sl-modal sl-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="sl-modal-body" style={{ alignItems:"center", textAlign:"center", padding:"32px 24px", gap:12 }}>
          <div style={{ fontSize:40 }}>✅</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#1b5e20" }}>Payment Recorded!</div>
          <div style={{ fontSize:12, color:"#888" }}>
            ₱{parsed.toLocaleString()} payment for <strong>{selected.fullname}</strong> has been saved.
          </div>
          <div style={{ fontSize:10, color:"#bbb", fontFamily:"monospace" }}>
            Hash: hx{Math.random().toString(36).slice(2,14)}-j{Math.floor(Math.random()*9)}
          </div>
        </div>
        <div className="sl-modal-footer">
          <button className="sl-btn-save" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="sl-overlay" onClick={onClose}>
      <div className="sl-modal" onClick={e => e.stopPropagation()}>
        <div className="sl-modal-header">
          <div>
            <div className="sl-modal-title">New F2F Payment</div>
            <div className="sl-modal-sub">
              Step {step} of 2 — {step === 1 ? "Select Member Loan" : "Enter Payment Details"}
            </div>
          </div>
          <button className="sl-modal-close" onClick={onClose}>✕</button>
        </div>

        {step === 1 && (
          <>
            <div className="sl-modal-body">
              <div className="sl-step-info">Select the member's active loan to record payment for.</div>
              <div className="sl-search-wrap">
                <span>🔍</span>
                <input
                  className="sl-search-in"
                  placeholder="Search by name, member ID, loan ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="sl-loan-list">
                {filtered.map(l => (
                  <div
                    key={l.loanId}
                    className={`sl-loan-item ${selected?.loanId === l.loanId ? "selected" : ""}`}
                    onClick={() => { setSelect(l); setAmount(String(l.monthlyDue)); setError(""); }}
                  >
                    <div className="sl-loan-avatar">{l.fullname.charAt(0)}</div>
                    <div className="sl-loan-info">
                      <div className="sl-loan-name">{l.fullname}</div>
                      <div className="sl-loan-meta">{l.memberId} · {l.loanId}</div>
                    </div>
                    <div className="sl-loan-bal">
                      <div className="sl-bal-val">₱{l.balance.toLocaleString()}</div>
                      <div className="sl-bal-label">balance</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="sl-modal-footer">
              <button className="sl-btn-cancel" onClick={onClose}>Cancel</button>
              <button className="sl-btn-save" onClick={() => setStep(2)} disabled={!selected}>Next →</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="sl-modal-body">
              <div className="sl-borrower-strip">
                <div className="sl-loan-avatar">{selected.fullname.charAt(0)}</div>
                <div>
                  <div className="sl-loan-name">{selected.fullname}</div>
                  <div className="sl-loan-meta">
                    {selected.memberId} · {selected.loanId} · Balance: ₱{selected.balance.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="sl-field">
                <label className="sl-label">Payment Amount (₱) <span className="sl-req">*</span></label>
                <div className="sl-amount-wrap">
                  <span className="sl-peso">₱</span>
                  <input
                    className="sl-amount-in"
                    type="number" min="1" max={selected.balance}
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setError(""); }}
                    autoFocus
                  />
                </div>
                <div className="sl-quick-row">
                  <button className="sl-quick" onClick={() => { setAmount(String(selected.monthlyDue)); setError(""); }}>
                    Monthly ₱{selected.monthlyDue.toLocaleString()}
                  </button>
                  <button className="sl-quick" onClick={() => { setAmount(String(selected.balance)); setError(""); }}>
                    Full ₱{selected.balance.toLocaleString()}
                  </button>
                </div>
              </div>

              <div className="sl-field">
                <label className="sl-label">Note (optional)</label>
                <input
                  className="sl-input"
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Partial payment, advance..."
                  maxLength={80}
                />
              </div>

              {error && <div className="sl-error">⚠ {error}</div>}

              {isValid && (
                <div className="sl-preview">
                  <div className="sl-prev-row">
                    <span>Current balance</span>
                    <span>₱{selected.balance.toLocaleString()}</span>
                  </div>
                  <div className="sl-prev-row deduct">
                    <span>Payment</span>
                    <span>− ₱{parsed.toLocaleString()}</span>
                  </div>
                  <div className="sl-prev-divider" />
                  <div className="sl-prev-row result">
                    <span>New balance</span>
                    <span className={(selected.balance - parsed) === 0 ? "sl-paid-green" : ""}>
                      ₱{(selected.balance - parsed).toLocaleString()}
                      {(selected.balance - parsed) === 0 && " 🎉 FULLY PAID"}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="sl-modal-footer">
              <button className="sl-btn-cancel" onClick={() => setStep(1)}>← Back</button>
              <button className="sl-btn-save" onClick={handlePay} disabled={!isValid}>
                Save Payment Record
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Register Member Modal ────────────────────────────────────────────────────
function RegisterModal({ onClose }) {
  const [form, setForm] = useState({
    firstname:"", lastname:"", middlename:"",
    birthdate:"", gender:"Male", civilStatus:"Single",
    contact:"", email:"", address:"", occupation:"",
    validId:"UMID", idNumber:"",
    beneficiary:"", relationship:"",
  });
  const [errors, setErrors] = useState({});
  const [done,   setDone]   = useState(false);
  const [tab,    setTab]    = useState("personal");
  const [copied, setCopied] = useState("");

  const [creds] = useState(() => {
    const seq = String(Math.floor(Math.random()*900)+100);
    return {
      memberId: `LEAF-100-${seq}`,
      username: `leaf${seq}`,
      password: `leaf${seq}`,
    };
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
    <div className="sl-overlay" onClick={onClose}>
      <div className="sl-modal" onClick={e => e.stopPropagation()}>
        <div className="sl-modal-header">
          <div className="sl-modal-title">🎉 Member Registered!</div>
          <button className="sl-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sl-modal-body" style={{ gap:14 }}>
          <div style={{ fontSize:12, color:"#666", lineHeight:1.6 }}>
            <strong>{form.firstname} {form.lastname}</strong> has been successfully registered.
            Give the member their credentials below so they can log in.
          </div>

          <div className="sl-cred-card">
            <div className="sl-cred-title">🔑 Login Credentials</div>
            <div className="sl-cred-sub">Give this slip to the member</div>

            <div className="sl-cred-row">
              <span className="sl-cred-label">Member ID</span>
              <div className="sl-cred-val-wrap">
                <span className="sl-cred-val">{creds.memberId}</span>
                <button className="sl-copy-btn" onClick={() => copyText(creds.memberId, "id")}>
                  {copied === "id" ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="sl-cred-row">
              <span className="sl-cred-label">Username</span>
              <div className="sl-cred-val-wrap">
                <span className="sl-cred-val">{creds.username}</span>
                <button className="sl-copy-btn" onClick={() => copyText(creds.username, "user")}>
                  {copied === "user" ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="sl-cred-row">
              <span className="sl-cred-label">Password</span>
              <div className="sl-cred-val-wrap">
                <span className="sl-cred-val">{creds.password}</span>
                <button className="sl-copy-btn" onClick={() => copyText(creds.password, "pass")}>
                  {copied === "pass" ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          <div className="sl-cred-notice">
            💡 The member can change their username and password anytime in <strong>My Profile → Account Settings</strong> after logging in.
          </div>
        </div>
        <div className="sl-modal-footer">
          <button className="sl-btn-save" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );

  const Field = ({ name, label, type="text", options=null, required=false }) => (
    <div className="sl-field">
      <label className="sl-label">{label}{required && <span className="sl-req"> *</span>}</label>
      {options ? (
        <select
          className={`sl-input ${errors[name] ? "sl-input-err" : ""}`}
          name={name} value={form[name]} onChange={handle}
        >
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input
          className={`sl-input ${errors[name] ? "sl-input-err" : ""}`}
          type={type} name={name} value={form[name]}
          onChange={e => { handle(e); setErrors(p => ({ ...p, [name]:"" })); }}
        />
      )}
      {errors[name] && <div className="sl-field-err">{errors[name]}</div>}
    </div>
  );

  return (
    <div className="sl-overlay" onClick={onClose}>
      <div className="sl-modal sl-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="sl-modal-header">
          <div>
            <div className="sl-modal-title">Register New Member</div>
            <div className="sl-modal-sub">Walk-in / F2F member registration at the office</div>
          </div>
          <button className="sl-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="sl-reg-tabs">
          {[["personal","👤 Personal Info"],["id","🪪 Valid ID"],["beneficiary","👥 Beneficiary"]].map(([k,l]) => (
            <button
              key={k}
              className={`sl-reg-tab ${tab === k ? "active" : ""}`}
              onClick={() => setTab(k)}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="sl-modal-body">
          {tab === "personal" && (
            <div className="sl-form-grid">
              <Field name="lastname"    label="Last Name"    required />
              <Field name="firstname"   label="First Name"   required />
              <Field name="middlename"  label="Middle Name" />
              <Field name="birthdate"   label="Birthdate"    type="date" required />
              <Field name="gender"      label="Gender"       options={["Male","Female","Other"]} />
              <Field name="civilStatus" label="Civil Status" options={["Single","Married","Widowed","Separated"]} />
              <Field name="contact"     label="Contact No."  required />
              <Field name="email"       label="Email"        type="email" />
              <Field name="occupation"  label="Occupation" />
              <div className="sl-field sl-full">
                <label className="sl-label">Address <span className="sl-req">*</span></label>
                <input
                  className={`sl-input ${errors.address ? "sl-input-err" : ""}`}
                  name="address" value={form.address}
                  onChange={e => { handle(e); setErrors(p => ({ ...p, address:"" })); }}
                  placeholder="Full address"
                />
                {errors.address && <div className="sl-field-err">{errors.address}</div>}
              </div>
            </div>
          )}

          {tab === "id" && (
            <div className="sl-form-grid">
              <Field
                name="validId"
                label="Type of Valid ID"
                options={["UMID","Philippine Passport","Driver's License","SSS ID","PhilHealth ID","Voter's ID","PRC ID","Postal ID"]}
              />
              <Field name="idNumber" label="ID Number" required />
            </div>
          )}

          {tab === "beneficiary" && (
            <div className="sl-form-grid">
              <Field name="beneficiary"  label="Beneficiary Name" />
              <Field name="relationship" label="Relationship" options={["Spouse","Parent","Child","Sibling","Other"]} />
            </div>
          )}
        </div>

        <div className="sl-modal-footer">
          <button className="sl-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="sl-btn-save" onClick={handleSubmit}>Register Member</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Staff Layout ────────────────────────────────────────────────────────
export default function StaffLayout() {
  const [clock,       setClock]   = useState("");
  const [showF2F,     setF2F]     = useState(false);
  const [showReg,     setReg]     = useState(false);
  const [sidebarOpen, setSidebar] = useState(false);
  const navigate                  = useNavigate();
  const location                  = useLocation();
  const { logout, user }          = useAuth();

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
  };

  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  return (
    <div className="sl-layout">
      {showF2F && <F2FModal      onClose={() => setF2F(false)} />}
      {showReg && <RegisterModal onClose={() => setReg(false)} />}

      {/* Mobile overlay */}
      <div
        className={`sl-overlay-bg ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebar(false)}
      />

      {/* SIDEBAR */}
      <aside className={`sl-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sl-logo">
          <div className="sl-logo-icon">🌿</div>
          <div>
            <div className="sl-logo-text">Leaf MPC</div>
            <div className="sl-logo-sub">STAFF</div>
          </div>
        </div>

        <nav className="sl-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => "sl-nav-item" + (isActive ? " active" : "")}
            >
              <span className="sl-nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sl-sidebar-bottom">
          <div className="sl-clock">{clock}</div>
          <button className="sl-logout-btn" onClick={handleLogout}>
            LOGOUT
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="sl-main">
        <header className="sl-topbar">
          <button
            className={`sl-hamburger ${sidebarOpen ? "open" : ""}`}
            onClick={() => setSidebar(s => !s)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>

          <div className="sl-topbar-left">
            <div className="sl-page-title">{config.title}</div>
            <div className="sl-page-sub">{config.sub}</div>
          </div>

          <div className="sl-topbar-right">
            {config.actions.map((action, i) => (
              <button
                key={i}
                className={`sl-btn ${action.cls}`}
                onClick={() => handleAction(action.action)}
              >
                {action.label}
              </button>
            ))}
            <div className="sl-user-chip">
              <div className="sl-user-avatar">{user?.initials?.[0] || "S"}</div>
              <div>
                <span className="sl-user-name">{user?.name || "Staff"}</span>
                <span className="sl-user-role">Staff</span>
              </div>
            </div>
          </div>
        </header>

        <main className="sl-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}