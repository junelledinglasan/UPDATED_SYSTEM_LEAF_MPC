import { useState } from "react";
import "./ManageMember.css";

// ─── Mock Data ──────────────────────────────────────────────────────────────
const INITIAL_MEMBERS = [
  { id: "LEAF-100-01", fullname: "Junelle Dinglasan",      username: "junelle0123", status: "Active" },
  { id: "LEAF-100-02", fullname: "MarkVincent Castillano", username: "mark0123",    status: "Active" },
  { id: "LEAF-100-03", fullname: "Hillery Verastigue",     username: "willery0123", status: "Active" },
  { id: "LEAF-100-04", fullname: "Syke Hufana",            username: "syke0123",    status: "Active" },
  { id: "LEAF-100-05", fullname: "Maria Santos",           username: "maria0123",   status: "Active" },
  { id: "LEAF-100-06", fullname: "Jose Reyes",             username: "jose0123",    status: "Inactive" },
  { id: "LEAF-100-07", fullname: "Ana Gonzales",           username: "ana0123",     status: "Active" },
  { id: "LEAF-100-08", fullname: "Pedro dela Cruz",        username: "pedro0123",   status: "Suspended" },
  { id: "LEAF-100-09", fullname: "Rosa Mendoza",           username: "rosa0123",    status: "Active" },
  { id: "LEAF-100-10", fullname: "Carlos Bautista",        username: "carlos0123",  status: "Inactive" },
  { id: "LEAF-100-11", fullname: "Lina Villanueva",        username: "lina0123",    status: "Active" },
  { id: "LEAF-100-12", fullname: "Ramon Aquino",           username: "ramon0123",   status: "Active" },
  { id: "LEAF-100-13", fullname: "Nena Pascual",           username: "nena0123",    status: "Active" },
  { id: "LEAF-100-14", fullname: "Dante Flores",           username: "dante0123",   status: "Suspended" },
  { id: "LEAF-100-15", fullname: "Ligaya Soriano",         username: "ligaya0123",  status: "Active" },
];

// ─── Pending for Approval (from approved online applications) ────────────────
const INITIAL_PENDING = [
  { appId:"OA-2026-003", fullname:"Carlos Bautista",  contact:"09391234567", email:"carlos.bautista@email.com", occupation:"Farmer",        address:"78 Bonifacio Rd., Tayabas City", approvedAt:"2026-03-17 14:05", validId:"UMID",              birthdate:"1975-08-22", gender:"Male",   civilStatus:"Married",  beneficiary:"Linda Bautista",   relationship:"Spouse" },
  { appId:"OA-2026-006", fullname:"Ligaya Soriano",   contact:"09671234567", email:"ligaya.soriano@email.com",  occupation:"Market Vendor", address:"89 Quezon Ave., Lucena City",    approvedAt:"2026-03-15 15:45", validId:"Voter's ID",        birthdate:"1990-03-18", gender:"Female", civilStatus:"Married",  beneficiary:"Ramon Soriano",    relationship:"Spouse" },
];

const STATUS_OPTIONS = ["All", "Active", "Inactive", "Suspended"];
const ROWS_PER_PAGE  = 10;

// ─── Pending Member Modal ─────────────────────────────────────────────────────
function PendingModal({ app, onClose, onConvert, onReject }) {
  if (!app) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box mm-view-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Pending Application</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          {/* Header */}
          <div className="mm-view-header">
            <div className="mm-view-avatar">{app.fullname.charAt(0)}</div>
            <div className="mm-view-info">
              <div className="mm-view-name">{app.fullname}</div>
              <div className="mm-view-id">{app.appId}</div>
              <div className="mm-view-username">Approved {app.approvedAt}</div>
            </div>
            <span className="mm-pending-badge">⏳ Pending</span>
          </div>

          {/* Notice */}
          <div className="mm-pending-notice">
            📋 This applicant has been approved online. They need to visit the office to complete the process before becoming an official member.
          </div>

          {/* Info */}
          <div className="mm-view-section-title">Personal Information</div>
          <div className="modal-grid">
            {[
              ["Birthdate",    app.birthdate],
              ["Gender",       app.gender],
              ["Civil Status", app.civilStatus],
              ["Contact No.",  app.contact],
              ["Email",        app.email],
              ["Occupation",   app.occupation],
              ["Valid ID",     app.validId],
            ].map(([k,v]) => (
              <div key={k} className="modal-field">
                <div className="modal-field-label">{k}</div>
                <div className="modal-field-value">{v}</div>
              </div>
            ))}
            <div className="modal-field full">
              <div className="modal-field-label">Address</div>
              <div className="modal-field-value">{app.address}</div>
            </div>
          </div>

          <div className="mm-view-section-title">Beneficiary</div>
          <div className="modal-grid">
            <div className="modal-field">
              <div className="modal-field-label">Beneficiary</div>
              <div className="modal-field-value">{app.beneficiary}</div>
            </div>
            <div className="modal-field">
              <div className="modal-field-label">Relationship</div>
              <div className="modal-field-value">{app.relationship}</div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-modal-close" onClick={onClose}>Close</button>
          <button className="mm-reject-btn" onClick={() => onReject(app.appId)}>✗ Remove</button>
          <button className="btn-modal-save" onClick={() => onConvert(app)}>✓ Convert to Official Member</button>
        </div>
      </div>
    </div>
  );
}

// ─── View Member Modal ──────────────────────────────────────────────────────
const MEMBER_DETAILS = {
  "LEAF-100-01": { birthdate:"1990-03-15", gender:"Female",  civilStatus:"Single",   contact:"09171111001", email:"junelle@email.com", address:"12 Mabini St., Lucena City",  occupation:"Teacher",       shareCapital:9500,  validId:"UMID",             beneficiary:"Rosario Dinglasan",  relationship:"Mother",  password:"leaf001" },
  "LEAF-100-02": { birthdate:"1988-07-22", gender:"Male",    civilStatus:"Married",  contact:"09171111002", email:"mark@email.com",    address:"45 Rizal Ave., Lucena City",  occupation:"Engineer",      shareCapital:12000, validId:"SSS ID",            beneficiary:"Anna Castillano",    relationship:"Spouse",  password:"leaf002" },
  "LEAF-100-03": { birthdate:"1992-11-05", gender:"Female",  civilStatus:"Single",   contact:"09171111003", email:"hillery@email.com", address:"78 Quezon Blvd., Lucena",     occupation:"Nurse",         shareCapital:7500,  validId:"PhilHealth ID",    beneficiary:"Roberto Verastigue", relationship:"Father",  password:"leaf003" },
  "LEAF-100-04": { birthdate:"1995-02-18", gender:"Male",    civilStatus:"Single",   contact:"09171111004", email:"syke@email.com",    address:"23 Luna St., Lucena City",    occupation:"Developer",     shareCapital:5000,  validId:"Driver's License", beneficiary:"Marites Hufana",     relationship:"Mother",  password:"leaf004" },
  "LEAF-100-05": { birthdate:"1988-05-20", gender:"Female",  civilStatus:"Married",  contact:"09171234567", email:"maria@email.com",   address:"45 Rizal St., Lucena City",   occupation:"Nurse",         shareCapital:8500,  validId:"SSS ID",            beneficiary:"Roberto Santos",     relationship:"Spouse",  password:"leaf005" },
  "LEAF-100-06": { birthdate:"1985-09-30", gender:"Male",    civilStatus:"Married",  contact:"09171111006", email:"jose@email.com",    address:"90 Bonifacio St., Lucena",    occupation:"Farmer",        shareCapital:6000,  validId:"Voter's ID",       beneficiary:"Carina Reyes",       relationship:"Spouse",  password:"leaf006" },
  "LEAF-100-07": { birthdate:"1993-04-12", gender:"Female",  civilStatus:"Single",   contact:"09171111007", email:"ana@email.com",     address:"34 Aguinaldo Ave., Lucena",   occupation:"Accountant",    shareCapital:11000, validId:"PRC ID",            beneficiary:"Marco Gonzales",     relationship:"Brother", password:"leaf007" },
  "LEAF-100-08": { birthdate:"1980-12-25", gender:"Male",    civilStatus:"Married",  contact:"09171111008", email:"pedro@email.com",   address:"56 Del Pilar St., Lucena",    occupation:"Businessman",   shareCapital:15000, validId:"UMID",             beneficiary:"Ligaya dela Cruz",   relationship:"Spouse",  password:"leaf008" },
  "LEAF-100-09": { birthdate:"1991-06-08", gender:"Female",  civilStatus:"Widowed",  contact:"09171111009", email:"rosa@email.com",    address:"67 Jacinto St., Lucena City", occupation:"Vendor",        shareCapital:4500,  validId:"PhilHealth ID",    beneficiary:"Maria Mendoza",      relationship:"Daughter",password:"leaf009" },
  "LEAF-100-10": { birthdate:"1987-08-14", gender:"Male",    civilStatus:"Separated",contact:"09171111010", email:"carlos@email.com",  address:"89 Mabini Ave., Lucena City", occupation:"Security Guard",shareCapital:3500,  validId:"Postal ID",        beneficiary:"Jose Bautista",      relationship:"Son",     password:"leaf010" },
};

// ─── View / Edit Member Modal (combined) ────────────────────────────────────
function ViewEditModal({ member, onClose, onSave, initialMode = "view" }) {
  const [mode, setMode] = useState(initialMode); // "view" | "edit"
  const details = MEMBER_DETAILS[member.id] || {};

  const [form, setForm] = useState({
    fullname:        member.fullname,
    username:        member.username,
    status:          member.status,
    birthdate:       details.birthdate    || "",
    gender:          details.gender       || "Male",
    civilStatus:     details.civilStatus  || "Single",
    contact:         details.contact      || "",
    email:           details.email        || "",
    address:         details.address      || "",
    occupation:      details.occupation   || "",
    shareCapital:    details.shareCapital || 0,
    validId:         details.validId      || "UMID",
    beneficiary:     details.beneficiary  || "",
    relationship:    details.relationship || "Spouse",
    currentPassword: details.password     || "leaf000",
    newPassword:     "",
    confirmPassword: "",
  });

  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passError,   setPassError]   = useState("");

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const maxLoanable = (form.shareCapital || 0) * 3;

  const handleSave = () => {
    if (!form.fullname.trim() || !form.username.trim()) return;
    // Validate password only if admin typed something
    if (form.newPassword) {
      if (form.newPassword.length < 6)                   { setPassError("Password must be at least 6 characters."); return; }
      if (form.newPassword !== form.confirmPassword)      { setPassError("Passwords do not match."); return; }
    }
    setPassError("");
    onSave({ ...member, fullname: form.fullname, username: form.username, status: form.status });
    onClose();
  };

  const Field = ({ label, name, type="text", options=null, disabled=false }) => (
    <div className="modal-field">
      <div className="modal-field-label">{label}</div>
      {mode === "view" ? (
        <div className="modal-field-value">{form[name] || "—"}</div>
      ) : disabled ? (
        <input className="modal-input disabled" value={form[name]} disabled />
      ) : options ? (
        <select className="modal-input" name={name} value={form[name]} onChange={handle}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input className="modal-input" type={type} name={name} value={form[name]} onChange={handle} />
      )}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box mm-view-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {mode === "view" ? "Member Profile" : "Edit Member"}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Header strip */}
          <div className="mm-view-header">
            <div className="mm-view-avatar">{form.fullname.charAt(0)}</div>
            <div className="mm-view-info">
              <div className="mm-view-name">{form.fullname}</div>
              <div className="mm-view-id">{member.id}</div>
              <div className="mm-view-username">@{form.username}</div>
            </div>
            <span className={`status-badge status-${form.status.toLowerCase()}`}>
              {form.status}
            </span>
          </div>

          {/* Share capital */}
          <div className="mm-view-capital">
            <div className="mm-vc-row">
              <span className="mm-vc-label">Share Capital</span>
              {mode === "edit"
                ? <input className="modal-input mm-capital-input" type="number" name="shareCapital" value={form.shareCapital} onChange={handle} />
                : <span className="mm-vc-val">₱{(form.shareCapital||0).toLocaleString()}</span>
              }
            </div>
            <div className="mm-vc-row">
              <span className="mm-vc-label">Max Loanable (×3)</span>
              <span className="mm-vc-val green">₱{maxLoanable.toLocaleString()}</span>
            </div>
          </div>

          {/* Personal Information */}
          <div className="mm-view-section-title">Personal Information</div>
          <div className="modal-grid">
            <Field label="Full Name"   name="fullname"   />
            <Field label="Username"    name="username"   />
            <Field label="Status"      name="status"     options={["Active","Inactive","Suspended"]} />
            <Field label="Birthdate"   name="birthdate"  type="date" />
            <Field label="Gender"      name="gender"     options={["Male","Female","Other"]} />
            <Field label="Civil Status"name="civilStatus"options={["Single","Married","Widowed","Separated"]} />
            <Field label="Contact No." name="contact"    type="tel" />
            <Field label="Email"       name="email"      type="email" />
            <Field label="Occupation"  name="occupation" />
            <div className="modal-field full">
              <div className="modal-field-label">Address</div>
              {mode === "view"
                ? <div className="modal-field-value">{form.address || "—"}</div>
                : <input className="modal-input" name="address" value={form.address} onChange={handle} />
              }
            </div>
          </div>

          {/* Valid ID & Beneficiary */}
          <div className="mm-view-section-title">Valid ID & Beneficiary</div>
          <div className="modal-grid">
            <Field label="Valid ID Type"  name="validId"      options={["UMID","Philippine Passport","Driver's License","SSS ID","PhilHealth ID","Voter's ID","PRC ID","Postal ID"]} />
            <Field label="Beneficiary"    name="beneficiary"  />
            <Field label="Relationship"   name="relationship" options={["Spouse","Parent","Child","Sibling","Other"]} />
          </div>

          {/* Account */}
          <div className="mm-view-section-title">Account</div>
          <div className="modal-grid">
            {/* Member ID — always read only */}
            <div className="modal-field full">
              <div className="modal-field-label">Member ID</div>
              <input className="modal-input disabled" value={member.id} disabled />
            </div>

            {/* Username */}
            <div className="modal-field full">
              <div className="modal-field-label">Username</div>
              {mode === "view"
                ? <div className="modal-field-value mono">{form.username}</div>
                : <input className="modal-input" name="username" value={form.username} onChange={handle} placeholder="Username" />
              }
            </div>

            {/* Password — view: show masked with reveal, edit: change fields */}
            {mode === "view" && (
              <div className="modal-field full">
                <div className="modal-field-label">Password</div>
                <div className="mm-pass-view-wrap">
                  <span className="modal-field-value mono mm-pass-dots" id="mm-pass-display">
                    ••••••••
                  </span>
                  <button
                    type="button"
                    className="mm-reveal-btn"
                    onClick={e => {
                      const el = e.currentTarget.previousSibling;
                      if (el.textContent === "••••••••") {
                        el.textContent = form.currentPassword;
                        e.currentTarget.textContent = "Hide";
                      } else {
                        el.textContent = "••••••••";
                        e.currentTarget.textContent = "Show";
                      }
                    }}
                  >
                    Show
                  </button>
                </div>
              </div>
            )}

            {/* Password — only show fields in edit mode */}
            {mode === "edit" && (
              <>
                <div className="modal-field full">
                  <div className="modal-field-label">New Password <span style={{color:"#aaa",fontWeight:400,textTransform:"none"}}>(leave blank to keep current)</span></div>
                  <div className="mm-pass-wrap">
                    <input
                      className="modal-input mm-pass-input"
                      type={showPass ? "text" : "password"}
                      name="newPassword"
                      value={form.newPassword}
                      onChange={e => { handle(e); setPassError(""); }}
                      placeholder="Enter new password (min. 6 chars)"
                    />
                    <button type="button" className="mm-eye-btn" onClick={() => setShowPass(s => !s)}>
                      {showPass ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>
                <div className="modal-field full">
                  <div className="modal-field-label">Confirm New Password</div>
                  <div className="mm-pass-wrap">
                    <input
                      className="modal-input mm-pass-input"
                      type={showConfirm ? "text" : "password"}
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={e => { handle(e); setPassError(""); }}
                      placeholder="Re-enter new password"
                    />
                    <button type="button" className="mm-eye-btn" onClick={() => setShowConfirm(s => !s)}>
                      {showConfirm ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>
                {passError && (
                  <div className="modal-field full">
                    <div className="mm-pass-error">⚠ {passError}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="modal-footer">
          {mode === "view" ? (
            <>
              <button className="btn-modal-close" onClick={onClose}>Close</button>
              <button className="btn-modal-save" onClick={() => setMode("edit")}>✏ Edit Member</button>
            </>
          ) : (
            <>
              <button className="btn-modal-close" onClick={() => setMode("view")}>← Back</button>
              <button className="btn-modal-save" onClick={handleSave}>Save Changes</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ───────────────────────────────────────────────────
function DeleteModal({ member, onClose, onConfirm }) {
  if (!member) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title danger-title">Delete Member</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="delete-warning-icon">⚠️</div>
          <p className="delete-confirm-text">
            Are you sure you want to delete <strong>{member.fullname}</strong>?
          </p>
          <p className="delete-sub-text">Member ID: <span className="mono">{member.id}</span></p>
          <p className="delete-sub-text" style={{ color: "#e53935", marginTop: 4 }}>
            This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-modal-close" onClick={onClose}>Cancel</button>
          <button className="btn-modal-delete" onClick={() => onConfirm(member.id)}>
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ManageMember() {
  const [members, setMembers]         = useState(INITIAL_MEMBERS);
  const [pending, setPending]         = useState(() => {
    // Merge mock data with any newly approved from OnlineApplications
    const extra = (typeof window !== "undefined" && window.__leafPending) ? window.__leafPending : [];
    const merged = [...INITIAL_PENDING];
    extra.forEach(e => { if (!merged.find(p => p.appId === e.appId)) merged.push(e); });
    return merged;
  });
  const [mainTab, setMainTab]         = useState("official"); // "official" | "pending"
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilter]     = useState("All");
  const [currentPage, setPage]        = useState(1);
  const [viewMember, setViewMember]   = useState(null);
  const [editMember, setEditMember]   = useState(null);
  const [deleteMember, setDeleteMember] = useState(null);
  const [viewPending, setViewPending] = useState(null);
  const [toast, setToast]             = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Filter + search
  const filtered = members.filter(m => {
    const matchStatus = filterStatus === "All" || m.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch =
      m.fullname.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.username.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // Pagination
  const totalPages  = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage    = Math.min(currentPage, totalPages);
  const paginated   = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleSearch  = () => setPage(1);
  const handleKeyDown = e => { if (e.key === "Enter") handleSearch(); };

  const handleSaveEdit = updated => {
    setMembers(ms => ms.map(m => m.id === updated.id ? updated : m));
    setEditMember(null);
    showToast(`Member "${updated.fullname}" updated successfully.`);
  };

  const handleDelete = id => {
    const name = members.find(m => m.id === id)?.fullname;
    setMembers(ms => ms.filter(m => m.id !== id));
    setDeleteMember(null);
    showToast(`Member "${name}" has been deleted.`, "danger");
  };

  const handleConvert = (app) => {
    const seq      = String(members.length + 100 + 1).padStart(2,"0");
    const newId    = `LEAF-100-${seq}`;
    const newMember = {
      id:       newId,
      fullname: app.fullname,
      username: `leaf${seq}`,
      status:   "Active",
    };
    setMembers(ms => [...ms, newMember]);
    setPending(ps => ps.filter(p => p.appId !== app.appId));
    // Also remove from global store
    if (typeof window !== "undefined" && window.__leafPending) {
      window.__leafPending = window.__leafPending.filter(p => p.appId !== app.appId);
    }
    setViewPending(null);
    showToast(`✓ ${app.fullname} is now an official member! ID: ${newId}`, "success");
  };

  const handleRemovePending = (appId) => {
    const name = pending.find(p => p.appId === appId)?.fullname;
    setPending(ps => ps.filter(p => p.appId !== appId));
    setViewPending(null);
    showToast(`${name} removed from pending list.`, "danger");
  };

  return (
    <div className="mm-wrapper">

      {/* Toast */}
      {toast && (
        <div className={`mm-toast mm-toast-${toast.type}`}>{toast.msg}</div>
      )}

      {/* Modals */}
      {viewMember && (
        <ViewEditModal
          member={viewMember}
          initialMode={editMember ? "edit" : "view"}
          onClose={() => { setViewMember(null); setEditMember(null); }}
          onSave={updated => {
            setMembers(ms => ms.map(m => m.id === updated.id ? updated : m));
            showToast(`Member "${updated.fullname}" updated successfully.`);
            setViewMember(null);
          }}
        />
      )}
      {viewPending && (
        <PendingModal
          app={viewPending}
          onClose={() => setViewPending(null)}
          onConvert={handleConvert}
          onReject={handleRemovePending}
        />
      )}
      <DeleteModal member={deleteMember} onClose={() => setDeleteMember(null)} onConfirm={handleDelete} />

      {/* Page Header */}
      <div className="mm-page-header">
        <div>
          <div className="mm-page-title">Member Management</div>
          <div className="mm-page-sub">View, edit, and manage all registered LEAF MPC members.</div>
        </div>
        <div className="mm-header-stats">
          <div className="mm-mini-stat">
            <span className="mm-mini-val">{members.filter(m => m.status === "Active").length}</span>
            <span className="mm-mini-label">Active</span>
          </div>
          <div className="mm-mini-stat">
            <span className="mm-mini-val inactive">{members.filter(m => m.status === "Inactive").length}</span>
            <span className="mm-mini-label">Inactive</span>
          </div>
          <div className="mm-mini-stat">
            <span className="mm-mini-val suspended">{members.filter(m => m.status === "Suspended").length}</span>
            <span className="mm-mini-label">Suspended</span>
          </div>
          <div className="mm-mini-stat">
            <span className="mm-mini-val total">{members.length}</span>
            <span className="mm-mini-label">Total</span>
          </div>
          <div className="mm-mini-stat" style={{cursor:"pointer"}} onClick={() => setMainTab("pending")}>
            <span className="mm-mini-val" style={{color:"#e65100"}}>{pending.length}</span>
            <span className="mm-mini-label">Pending</span>
          </div>
        </div>
      </div>

      {/* Main tabs */}
      <div className="mm-main-tabs">
        <button className={`mm-main-tab ${mainTab==="official"?"active":""}`} onClick={() => setMainTab("official")}>
          👥 Official Members <span className="mm-tab-count">{members.length}</span>
        </button>
        <button className={`mm-main-tab ${mainTab==="pending"?"active pending-tab":""}`} onClick={() => setMainTab("pending")}>
          ⏳ Pending for Approval
          {pending.length > 0 && <span className="mm-tab-count pending-count">{pending.length}</span>}
        </button>
      </div>
      {mainTab === "official" && (
      <div className="mm-card">

        {/* Search + Filter Bar */}
        <div className="mm-toolbar">
          <div className="mm-search-wrap">
            <span className="mm-search-icon">🔍</span>
            <input
              className="mm-search-input"
              placeholder="Search by Name, Member ID, or Username..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              onKeyDown={handleKeyDown}
            />
            {search && (
              <button className="mm-clear-btn" onClick={() => { setSearch(""); setPage(1); }}>✕</button>
            )}
          </div>

          <div className="mm-filter-tabs">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                className={`mm-filter-tab ${filterStatus === s ? "active" : ""}`}
                onClick={() => { setFilter(s); setPage(1); }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="mm-table-wrap">
          <table className="mm-table">
            <thead>
              <tr>
                <th style={{ width: "14%" }}>Member ID</th>
                <th style={{ width: "28%" }}>Full Name</th>
                <th style={{ width: "22%" }}>Username</th>
                <th style={{ width: "14%" }}>Status</th>
                <th style={{ width: "22%", textAlign: "center" }}>Manage</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="mm-empty">No members found.</td>
                </tr>
              ) : paginated.map((m, idx) => (
                <tr
                  key={m.id}
                  className={idx % 2 === 0 ? "row-even" : "row-odd"}
                  onClick={() => setViewMember(m)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="mono cell-id">{m.id}</td>
                  <td className="cell-name">{m.fullname}</td>
                  <td className="mono cell-user">{m.username}</td>
                  <td>
                    <span className={`status-badge status-${m.status.toLowerCase()}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns" onClick={e => e.stopPropagation()}>
                      <button
                        className="action-btn view-btn"
                        title="View"
                        onClick={() => setViewMember(m)}
                      >
                        👁
                      </button>
                      <button
                        className="action-btn edit-btn"
                        title="Edit"
                        onClick={() => { setViewMember(m); setEditMember(m); }}
                      >
                        ✏️
                      </button>
                      <button
                        className="action-btn delete-btn"
                        title="Delete"
                        onClick={() => setDeleteMember(m)}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="mm-footer">
          <div className="mm-count">
            Showing {filtered.length === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1}–{Math.min(safePage * ROWS_PER_PAGE, filtered.length)} of {filtered.length} member{filtered.length !== 1 ? "s" : ""}
          </div>
          <div className="mm-pagination">
            <button
              className="page-btn"
              disabled={safePage === 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`e${i}`} className="page-ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    className={`page-btn page-num ${safePage === p ? "active" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              className="page-btn"
              disabled={safePage === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
      )} {/* end official tab */}

      {/* ── PENDING FOR APPROVAL TABLE ── */}
      {mainTab === "pending" && (
        <div className="mm-card">
          {pending.length === 0 ? (
            <div className="mm-empty-pending">
              <div style={{fontSize:36}}>✅</div>
              <div style={{fontSize:14,fontWeight:700,color:"#1b5e20",marginTop:8}}>No pending applications</div>
              <div style={{fontSize:12,color:"#aaa",marginTop:4}}>All approved applicants have been processed.</div>
            </div>
          ) : (
            <div className="mm-table-wrap">
              <table className="mm-table">
                <thead>
                  <tr>
                    <th style={{width:"14%"}}>App ID</th>
                    <th style={{width:"26%"}}>Full Name</th>
                    <th style={{width:"18%"}}>Contact</th>
                    <th style={{width:"16%"}}>Occupation</th>
                    <th style={{width:"14%"}}>Approved</th>
                    <th style={{width:"12%",textAlign:"center"}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((p, idx) => (
                    <tr
                      key={p.appId}
                      className={idx % 2 === 0 ? "row-even" : "row-odd"}
                      onClick={() => setViewPending(p)}
                      style={{cursor:"pointer"}}
                    >
                      <td className="mono cell-id">{p.appId}</td>
                      <td className="cell-name">{p.fullname}</td>
                      <td>{p.contact}</td>
                      <td>{p.occupation}</td>
                      <td style={{fontSize:11,color:"#888"}}>{p.approvedAt.slice(0,10)}</td>
                      <td>
                        <div className="action-btns" onClick={e => e.stopPropagation()}>
                          <button className="action-btn view-btn" onClick={() => setViewPending(p)} title="View">👁</button>
                          <button className="mm-convert-btn" onClick={() => handleConvert(p)} title="Convert to Official Member">✓</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}