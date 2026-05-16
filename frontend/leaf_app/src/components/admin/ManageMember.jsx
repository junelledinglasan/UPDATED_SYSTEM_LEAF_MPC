import { useState, useEffect } from "react";
import { getMembersAPI, getMemberStatsAPI, getMemberAPI, updateMemberAPI, deleteMemberAPI, getApplicationsAPI, updateApplicationStatusAPI, convertToMemberAPI, registerMemberAPI } from "../../api/members";
import { Users, Clock, Eye, Pencil, Trash2, Search } from "lucide-react";
import "./ManageMember.css";

const STATUS_OPTIONS = ["All","Active","Inactive","Suspended"];
const ROWS_PER_PAGE  = 10;

// ─── View / Edit Member Modal ─────────────────────────────────────────────────
function ViewEditModal({ member, onClose, onSave }) {
  const [mode,    setMode]    = useState("view");
  const [detail,  setDetail]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const [form, setForm] = useState({
    first_name:             member.first_name     || "",
    last_name:              member.last_name      || "",
    middle_name:            member.middle_name    || "",
    status:                 member.status         || "Active",
    birth_date:             "",
    civil_status:           "",
    educational_attainment: "",
    contact:                member.contact        || "",
    email:                  member.email          || "",
    address:                "",
    occupation:             "",
    income:                 "",
    birth_certificate:      false,
    marriage_certificate:   false,
    classification:         member.classification || "",
    share_capital:          member.share_capital  || 0,
    plain_password:         "",
    // Sub-profile fields
    school_name:   "", year_level:  "", allowance:      "",
    pension_income:"", job_type:    "", monthly_income: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMemberAPI(member.id);
        setDetail(data);
        const pm = data.pre_member_info || {};
        const sp = data.student_profile  || {};
        const sr = data.senior_profile   || {};
        const jp = data.job_profile      || {};
        setForm({
          first_name:             data.first_name || pm.first_name || "",
          last_name:              data.last_name  || pm.last_name  || "",
          middle_name:            pm.middle_name            || "",
          status:                 data.status               || "Active",
          birth_date:             pm.birth_date             || "",
          civil_status:           pm.civil_status           || "Single",
          educational_attainment: pm.educational_attainment || "",
          contact:                data.contact              || "",
          email:                  data.email                || "",
          address:                pm.address                || "",
          occupation:             pm.occupation             || "",
          income:                 pm.income                 || "",
          birth_certificate:      pm.birth_certificate      || false,
          marriage_certificate:   pm.marriage_certificate   || false,
          classification:         pm.classification         || data.classification || "",
          share_capital:          data.share_capital        || 0,
          plain_password:         data.plain_password       || "",
          // Sub-profile
          school_name:    sp.school_name    || "",
          year_level:     sp.year_level     || "",
          allowance:      sp.allowance      || "",
          pension_income: sr.pension_income || "",
          job_type:       jp.job_type       || "",
          monthly_income: jp.monthly_income || "",
        });
      } catch(e) {
        console.error("Failed to load member details:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [member.id]);

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const maxLoanable = (parseFloat(form.share_capital) || 0) * 3;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(member.id, form);
      onClose();
    } catch(e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const username = detail?.user_username || "—";
  const memberId = detail?.member_id || member.member_id || "—";

  const Field = ({ label, name, type="text", options=null, full=false }) => (
    <div className={`modal-field${full?" full":""}`}>
      <div className="modal-field-label">{label}</div>
      {mode==="view" ? (
        <div className="modal-field-value">{form[name] || "—"}</div>
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
          <div className="modal-title">{mode==="view" ? "Member Profile" : "Edit Member"}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{textAlign:"center",padding:"40px 0",color:"#888"}}>
              Loading member details...
            </div>
          ) : (
            <>
              <div className="mm-view-header">
                <div className="mm-view-avatar">{(form.first_name||"M")[0].toUpperCase()}</div>
                <div className="mm-view-info">
                  <div className="mm-view-name">{form.first_name} {form.last_name}</div>
                  <div className="mm-view-id">{memberId}</div>
                  <div className="mm-view-username">@{username}</div>
                </div>
                <span className={`status-badge status-${(form.status||"").toLowerCase()}`}>{form.status}</span>
              </div>

              <div className="mm-view-capital">
                <div className="mm-vc-row">
                  <span className="mm-vc-label">Share Capital</span>
                  {mode==="edit"
                    ? <input className="modal-input mm-capital-input" type="number" name="share_capital" value={form.share_capital} onChange={handle}/>
                    : <span className="mm-vc-val">₱{Number(form.share_capital||0).toLocaleString()}</span>
                  }
                </div>
                <div className="mm-vc-row">
                  <span className="mm-vc-label">Max Loanable (×3)</span>
                  <span className="mm-vc-val green">₱{maxLoanable.toLocaleString()}</span>
                </div>
              </div>

              <div className="mm-view-section-title">Personal Information</div>
              <div className="modal-grid">
                <Field label="First Name"   name="first_name" />
                <Field label="Last Name"    name="last_name" />
                <Field label="Middle Name"  name="middle_name" />
                <Field label="Status"       name="status"       options={["Active","Inactive","Suspended"]} />
                <Field label="Birthdate"    name="birth_date"   type="date" />
                <Field label="Civil Status" name="civil_status" options={["Single","Married","Widowed","Separated"]} />
                <Field label="Contact No."  name="contact"      type="tel" />
                <Field label="Email"        name="email"        type="email" />
                <Field label="Occupation"   name="occupation" />
                <Field label="Address"      name="address"      full />
              </div>

              <div className="mm-view-section-title">Classification & Profile</div>
              <div className="modal-grid">
                <Field label="Classification" name="classification" options={["Student","Senior","Employed"]} />
                <Field label="Educational Attainment" name="educational_attainment" options={["Elementary","High School","Vocational","College","Post Graduate"]} />
                <Field label="Monthly Income (₱)" name="income" type="number" />
                <div className="modal-field">
                  <div className="modal-field-label">Birth Certificate</div>
                  {mode==="view" ? (
                    <div className="modal-field-value">{form.birth_certificate ? " Submitted" : " Not submitted"}</div>
                  ) : (
                    <label style={{display:"flex",alignItems:"center",gap:8,marginTop:4,fontSize:13,cursor:"pointer"}}>
                      <input type="checkbox" name="birth_certificate" checked={!!form.birth_certificate}
                        onChange={e => setForm(p=>({...p,birth_certificate:e.target.checked}))}/> Yes
                    </label>
                  )}
                </div>
                <div className="modal-field">
                  <div className="modal-field-label">Marriage Certificate</div>
                  {mode==="view" ? (
                    <div className="modal-field-value">{form.marriage_certificate ? " Submitted" : " Not submitted"}</div>
                  ) : (
                    <label style={{display:"flex",alignItems:"center",gap:8,marginTop:4,fontSize:13,cursor:"pointer"}}>
                      <input type="checkbox" name="marriage_certificate" checked={!!form.marriage_certificate}
                        onChange={e => setForm(p=>({...p,marriage_certificate:e.target.checked}))}/> Yes
                    </label>
                  )}
                </div>
              </div>

              {/* Student sub-profile */}
              {form.classification === "Student" && (
                <div className="modal-grid">
                  <Field label="School Name"         name="school_name" full />
                  <Field label="Year Level"          name="year_level" options={["Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12","1st Year","2nd Year","3rd Year","4th Year","5th Year","Graduate"]} />
                  <Field label="Monthly Allowance (₱)" name="allowance" type="number" />
                </div>
              )}
              {/* Senior sub-profile */}
              {form.classification === "Senior" && (
                <div className="modal-grid">
                  <Field label="Monthly Pension Income (₱)" name="pension_income" type="number" />
                </div>
              )}
              {/* Employed sub-profile */}
              {form.classification === "Employed" && (
                <div className="modal-grid">
                  <Field label="Employment Type"    name="job_type" options={["Employed","Self-Employed","Business","Freelance","Other"]} />
                  <Field label="Monthly Income (₱)" name="monthly_income" type="number" />
                </div>
              )}

              <div className="mm-view-section-title">Account</div>
              <div className="modal-grid">
                <div className="modal-field full">
                  <div className="modal-field-label">Member ID</div>
                  <input className="modal-input disabled" value={memberId} disabled />
                </div>
                <div className="modal-field full">
                  <div className="modal-field-label">Username</div>
                  <div className="modal-field-value mono">{username}</div>
                </div>

                {mode==="view" && (
                  <div className="modal-field full">
                    <div className="modal-field-label">Password</div>
                    <div className="mm-pass-view-wrap">
                      <span className="modal-field-value mono">
                        {showPw ? (form.plain_password || "No password saved") : "••••••••"}
                      </span>
                      <button type="button" className="mm-reveal-btn" onClick={() => setShowPw(p => !p)}>
                        {showPw ? "Hide" : "Show"}
                      </button>
                    </div>
                    {!form.plain_password && (
                      <div style={{fontSize:11,color:"#f57c00",marginTop:4}}>
                        ⚠ No saved password — member registered before this feature was added.
                      </div>
                    )}
                  </div>
                )}

                {mode==="edit" && (
                  <div className="modal-field full">
                    <div className="modal-field-label">
                      New Password
                      <span style={{fontSize:11,color:"#aaa",fontWeight:400,marginLeft:6}}>(leave blank to keep current)</span>
                    </div>
                    <div className="mm-pass-wrap">
                      <input
                        className="modal-input mm-pass-input"
                        type={showPw ? "text" : "password"}
                        name="plain_password"
                        value={form.plain_password}
                        onChange={handle}
                        placeholder="Enter new password (min. 6 chars)"
                      />
                      <button type="button" className="mm-eye-btn" onClick={() => setShowPw(p => !p)}>
                        {showPw ? "🙈" : "👁"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="modal-field full">
                  <div className="modal-field-label">Date Registered</div>
                  <div className="modal-field-value">
                    {detail?.date_registered
                      ? new Date(detail.date_registered).toLocaleDateString("en-PH", {
                          year:"numeric", month:"long", day:"numeric"
                        })
                      : "—"
                    }
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {mode==="view" ? (
            <>
              <button className="btn-modal-close" onClick={onClose}>Close</button>
              <button className="btn-modal-save" onClick={() => setMode("edit")}>✏ Edit Member</button>
            </>
          ) : (
            <>
              <button className="btn-modal-close" onClick={() => setMode("view")}>← Back</button>
              <button className="btn-modal-save" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ member, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  if (!member) return null;
  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(member.id);
    setLoading(false);
  };
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
          <p className="delete-sub-text">Member ID: <span className="mono">{member.member_id}</span></p>
          <p className="delete-sub-text" style={{color:"#e53935",marginTop:4}}>
            This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-modal-close" onClick={onClose}>Cancel</button>
          <button className="btn-modal-delete" onClick={handleConfirm} disabled={loading}>
            {loading ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pending Modal ────────────────────────────────────────────────────────────
function PendingModal({ app, onClose, onConvert }) {
  if (!app) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box mm-view-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Pending Application</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="mm-view-header">
            <div className="mm-view-avatar">{(app.first_name||"A")[0]}</div>
            <div className="mm-view-info">
              <div className="mm-view-name">{app.first_name} {app.last_name}</div>
              <div className="mm-view-id">{app.app_id}</div>
              <div className="mm-view-username">Submitted {(app.created_at||"").slice(0,10)}</div>
            </div>
            <span className="mm-pending-badge">⏳ Pending</span>
          </div>
          <div className="mm-pending-notice">
            📋 This applicant has been approved online. They need to visit the office to complete the process.
          </div>
          <div className="mm-view-section-title">Personal Information</div>
          <div className="modal-grid">
            {[
              ["Birthdate",    app.birth_date],
              ["Civil Status", app.civil_status],
              ["Contact",      app.contact_number],
              ["Email",        app.email],
              ["Occupation",   app.occupation],
              ["Classification", app.classification],
            ].map(([k,v]) => (
              <div key={k} className="modal-field">
                <div className="modal-field-label">{k}</div>
                <div className="modal-field-value">{v||"—"}</div>
              </div>
            ))}
            <div className="modal-field full">
              <div className="modal-field-label">Address</div>
              <div className="modal-field-value">{app.address||"—"}</div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-modal-close" onClick={onClose}>Close</button>
          <button className="btn-modal-save" onClick={() => onConvert(app)}>✓ Convert to Official Member</button>
        </div>
      </div>
    </div>
  );
}

// ─── Register Member Modal (F2F) ──────────────────────────────────────────────
function RegisterMemberModal({ onClose, onSuccess }) {
  const [tab,     setTab]    = useState("personal");
  const [loading, setLoading]= useState(false);
  const [errors,  setErrors] = useState({});
  const [result,  setResult] = useState(null);

  const TABS = [
    { key: "personal",       label: "👤 Personal Info" },
    { key: "classification", label: "📋 Classification" },
    { key: "account",        label: "🔐 Account Info"  },
  ];

  const [form, setForm] = useState({
    first_name:"", last_name:"", middle_name:"", birth_date:"", civil_status:"Single",
    educational_attainment:"", occupation:"", income:"", contact_number:"", address:"",
    birth_certificate:false, marriage_certificate:false,
    classification:"Employed", school_name:"", year_level:"", allowance:"",
    pension_income:"", job_type:"Employed", monthly_income:"",
  });

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
      const res = await registerMemberAPI({
        first_name: form.first_name, last_name: form.last_name, middle_name: form.middle_name,
        birth_date: form.birth_date, civil_status: form.civil_status,
        educational_attainment: form.educational_attainment, occupation: form.occupation,
        income: form.income || 0, contact_number: form.contact_number, address: form.address,
        birth_certificate: form.birth_certificate, marriage_certificate: form.marriage_certificate,
        classification: form.classification, school_name: form.school_name,
        year_level: form.year_level, allowance: form.allowance || 0,
        pension_income: form.pension_income || 0, job_type: form.job_type,
        monthly_income: form.monthly_income || 0,
      });
      setResult(res);
      setTab("account");
      onSuccess();
    } catch(err) {
      const msg = err.response?.data?.error || "Failed to register member.";
      setErrors({ first_name: msg });
      setTab("personal");
    } finally { setLoading(false); }
  };

  const RField = ({ label, name, type="text", options=null, full=false }) => (
    <div className={`modal-field${full?" full":""}`}>
      <div className="modal-field-label">
        {label}
        {["first_name","last_name","birth_date","contact_number","address"].includes(name) && <span style={{color:"#e53935"}}> *</span>}
      </div>
      {options ? (
        <select className="modal-input" name={name} value={form[name]} onChange={handle}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : type === "checkbox" ? (
        <label style={{display:"flex",alignItems:"center",gap:8,marginTop:4,fontSize:13}}>
          <input type="checkbox" name={name} checked={!!form[name]} onChange={handle}/>
          <span>Yes</span>
        </label>
      ) : (
        <input className={`modal-input${errors[name]?" err":""}`} type={type} name={name} value={form[name]} onChange={handle}/>
      )}
      {errors[name] && <div style={{fontSize:11,color:"#e53935",marginTop:2}}>{errors[name]}</div>}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box mm-view-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Register New Member</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{fontSize:12,color:"#888",padding:"6px 20px",background:"#f9fbe7",borderBottom:"1px solid #eee"}}>
          Walk-in / F2F member registration at the office
        </div>

        <div style={{display:"flex",borderBottom:"2px solid #e8f5e9"}}>
          {TABS.map((t,i) => (
            <button key={t.key} onClick={() => !result && setTab(t.key)} style={{
              flex:1, padding:"10px 8px", fontSize:12, fontWeight:600,
              color: tab===t.key ? "#2e7d32" : "#888",
              background: tab===t.key ? "#f9fef9" : "none",
              border:"none", borderBottom: tab===t.key ? "2px solid #2e7d32" : "none",
              marginBottom: tab===t.key ? -2 : 0, cursor: result ? "default" : "pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            }}>
              <span style={{
                width:20, height:20, borderRadius:"50%", fontSize:11,
                background: tab===t.key ? "#2e7d32" : "#e0e0e0",
                color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
              }}>{i+1}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {tab === "personal" && (
            <div className="modal-grid">
              <RField label="Last Name"              name="last_name"/>
              <RField label="First Name"             name="first_name"/>
              <RField label="Middle Name"            name="middle_name"/>
              <RField label="Birthdate"              name="birth_date" type="date"/>
              <RField label="Civil Status"           name="civil_status" options={["Single","Married","Widowed","Separated"]}/>
              <RField label="Educational Attainment" name="educational_attainment" options={["Elementary","High School","Vocational","College","Post Graduate"]}/>
              <RField label="Contact No."            name="contact_number"/>
              <RField label="Occupation"             name="occupation"/>
              <RField label="Monthly Income (₱)"    name="income" type="number"/>
              <RField label="Complete Address"       name="address" full/>
              <RField label="Birth Certificate Submitted"    name="birth_certificate"    type="checkbox"/>
              <RField label="Marriage Certificate Submitted" name="marriage_certificate" type="checkbox"/>
            </div>
          )}

          {tab === "classification" && (
            <div className="modal-grid">
              <div className="modal-field full">
                <div className="modal-field-label">Member Classification <span style={{color:"#e53935"}}>*</span></div>
                <div style={{display:"flex",gap:12,marginTop:8}}>
                  {["Student","Senior","Employed"].map(c => (
                    <div key={c} onClick={() => setForm(p => ({...p, classification:c}))} style={{
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
                <RField label="School Name" name="school_name"/>
                <RField label="Year Level"  name="year_level" options={["Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12","1st Year","2nd Year","3rd Year","4th Year","5th Year","Graduate"]}/>
                <RField label="Monthly Allowance (₱)" name="allowance" type="number"/>
              </>)}
              {form.classification === "Senior" && (<>
                <RField label="Educational Attainment" name="educational_attainment" options={["Elementary","High School","Vocational","College","Post Graduate"]}/>
                <RField label="Monthly Pension Income (₱)" name="pension_income" type="number"/>
              </>)}
              {form.classification === "Employed" && (<>
                <RField label="Occupation/Job Title" name="occupation"/>
                <RField label="Employment Type" name="job_type" options={["Employed","Self-Employed","Business","Freelance","Other"]}/>
                <RField label="Monthly Income (₱)" name="monthly_income" type="number"/>
              </>)}
            </div>
          )}

          {tab === "account" && (
            <div className="modal-grid">
              {result ? (<>
                <div className="modal-field full" style={{textAlign:"center",padding:"12px 0"}}>
                  <div style={{fontSize:36,marginBottom:8}}>🎉</div>
                  <div style={{fontSize:15,fontWeight:800,color:"#1b5e20",marginBottom:4}}>
                    {result.member?.fullname || `${form.first_name} ${form.last_name}`} is now an official member!
                  </div>
                  <div style={{fontSize:12,color:"#888"}}>Share the credentials below with the member.</div>
                </div>
                <div className="modal-field full" style={{background:"#f1f8e9",borderRadius:10,padding:16}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    {[
                      ["Member ID", result.member_id],
                      ["Username",  result.username],
                      ["Password",  result.plain_password],
                      ["Status",    "Active"],
                    ].map(([k,v]) => (
                      <div key={k}>
                        <div style={{fontSize:11,color:"#888",fontWeight:600}}>{k}</div>
                        <div style={{fontSize:13,fontWeight:700,color:"#1b5e20",fontFamily:"monospace"}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="modal-field full" style={{fontSize:11,color:"#f57c00",background:"#fff8e1",padding:"10px 14px",borderRadius:8,borderLeft:"3px solid #ff9800"}}>
                  ⚠ Please save or print these credentials. The password won't be shown again.
                </div>
              </>) : (
                <div className="modal-field full" style={{textAlign:"center",padding:"24px 0",color:"#888"}}>
                  Complete Personal Info and Classification tabs first, then submit.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {!result ? (<>
            {tab !== "personal" && (
              <button className="btn-modal-close" onClick={() => {
                const keys = TABS.map(t=>t.key);
                setTab(keys[keys.indexOf(tab)-1]);
              }}>← Previous</button>
            )}
            {tab === "personal" && <button className="btn-modal-close" onClick={onClose}>Cancel</button>}
            {tab !== "classification" ? (
              <button className="btn-modal-save" onClick={() => {
                const keys = TABS.map(t=>t.key);
                setTab(keys[keys.indexOf(tab)+1]);
              }}>Next →</button>
            ) : (
              <button className="btn-modal-save" onClick={handleSubmit} disabled={loading}>
                {loading ? "Registering..." : "✓ Register Member"}
              </button>
            )}
          </>) : (
            <button className="btn-modal-save" onClick={onClose}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ManageMember() {
  const [members,      setMembers]      = useState([]);
  const [pending,      setPending]      = useState([]);
  const [stats,        setStats]        = useState({ active:0, inactive:0, suspended:0, total:0 });
  const [loading,      setLoading]      = useState(true);
  const [mainTab,      setMainTab]      = useState("official");
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilter]       = useState("All");
  const [currentPage,  setPage]         = useState(1);
  const [viewMember,   setViewMember]   = useState(null);
  const [deleteMember, setDeleteMember] = useState(null);
  const [viewPending,  setViewPending]  = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type="success") => {
    setToast({msg,type});
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mem, st, apps] = await Promise.allSettled([
        getMembersAPI(),
        getMemberStatsAPI(),
        getApplicationsAPI({ status: "Approved" }),
      ]);
      if (mem.status==="fulfilled") setMembers(mem.value);
      if (st.status==="fulfilled")  setStats(st.value);
      if (apps.status==="fulfilled") {
        const convertedIds = mem.status==="fulfilled"
          ? mem.value.map(m => m.application_id).filter(Boolean)
          : [];
        setPending(apps.value.filter(a => !convertedIds.includes(a.id)));
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = members.filter(m => {
    const matchStatus = filterStatus==="All" || m.status===filterStatus;
    const q = search.toLowerCase();
    return matchStatus && (
      (m.first_name+" "+m.last_name).toLowerCase().includes(q) ||
      (m.fullname||"").toLowerCase().includes(q) ||
      (m.member_id||"").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length/ROWS_PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = filtered.slice((safePage-1)*ROWS_PER_PAGE, safePage*ROWS_PER_PAGE);

  const handleSaveEdit = async (id, form) => {
    try {
      await updateMemberAPI(id, form);
      showToast("Member updated successfully.");
      fetchData();
    } catch { showToast("Failed to update member.", "danger"); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMemberAPI(id);
      setDeleteMember(null);
      showToast("Member deleted.", "danger");
      fetchData();
    } catch { showToast("Failed to delete member.", "danger"); }
  };

  const handleConvert = async (app) => {
    try {
      const result = await convertToMemberAPI(app.id);
      setPending(prev => prev.filter(p => p.id !== app.id));
      setViewPending(null);
      showToast(`✓ ${app.first_name} ${app.last_name} is now an official member! ID: ${result.member_id}`, "success");
      fetchData();
    } catch(err) {
      const msg = err.response?.data?.error || "Failed to convert member.";
      showToast(msg, "danger");
    }
  };

  return (
    <div className="mm-wrapper">
      {toast && <div className={`mm-toast mm-toast-${toast.type}`}>{toast.msg}</div>}

      {showRegister && (
        <RegisterMemberModal
          onClose={() => setShowRegister(false)}
          onSuccess={() => { fetchData(); showToast("Member registered successfully!", "success"); }}
        />
      )}

      {viewMember && (
        <ViewEditModal
          member={viewMember}
          onClose={() => setViewMember(null)}
          onSave={handleSaveEdit}
        />
      )}

      {viewPending && (
        <PendingModal
          app={viewPending}
          onClose={() => setViewPending(null)}
          onConvert={handleConvert}
        />
      )}

      <DeleteModal
        member={deleteMember}
        onClose={() => setDeleteMember(null)}
        onConfirm={handleDelete}
      />

      {/* Page Header */}
      <div className="mm-page-header">
        <div>
          <div className="mm-page-title">Member Management</div>
          <div className="mm-page-sub">View, edit, and manage all registered LEAF MPC members.</div>
        </div>
        <div className="mm-header-stats">
          <div className="mm-mini-stat"><span className="mm-mini-val">{stats.active||0}</span><span className="mm-mini-label">Active</span></div>
          <div className="mm-mini-stat"><span className="mm-mini-val inactive">{stats.inactive||0}</span><span className="mm-mini-label">Inactive</span></div>
          <div className="mm-mini-stat"><span className="mm-mini-val suspended">{stats.suspended||0}</span><span className="mm-mini-label">Suspended</span></div>
          <div className="mm-mini-stat"><span className="mm-mini-val total">{stats.total||0}</span><span className="mm-mini-label">Total</span></div>
          <div className="mm-mini-stat" style={{cursor:"pointer"}} onClick={() => setMainTab("pending")}>
            <span className="mm-mini-val" style={{color:"#e65100"}}>{pending.length}</span>
            <span className="mm-mini-label">Pending</span>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="mm-main-tabs">
        <button className={`mm-main-tab ${mainTab==="official"?"active":""}`} onClick={() => setMainTab("official")}>
          <Users size={14}/> Official Members <span className="mm-tab-count">{members.length}</span>
        </button>
        <button className={`mm-main-tab ${mainTab==="pending"?"active pending-tab":""}`} onClick={() => setMainTab("pending")}>
          <Clock size={14}/> Pending for Approval
          {pending.length > 0 && <span className="mm-tab-count pending-count">{pending.length}</span>}
        </button>
      </div>

      {/* Official Members Table */}
      {mainTab==="official" && (
        <div className="mm-card">
          <div className="mm-toolbar">
            <div className="mm-search-wrap">
              <span className="mm-search-icon"><Search size={13} color="#aaa"/></span>
              <input
                className="mm-search-input"
                placeholder="Search by Name or Member ID..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && <button className="mm-clear-btn" onClick={() => { setSearch(""); setPage(1); }}>✕</button>}
            </div>
            <div className="mm-filter-tabs">
              {STATUS_OPTIONS.map(s => (
                <button key={s} className={`mm-filter-tab ${filterStatus===s?"active":""}`} onClick={() => { setFilter(s); setPage(1); }}>{s}</button>
              ))}
            </div>
          </div>

          <div className="mm-table-wrap">
            <table className="mm-table">
              <thead>
                <tr>
                  <th style={{width:"14%"}}>Member ID</th>
                  <th style={{width:"30%"}}>Full Name</th>
                  <th style={{width:"16%"}}>Contact</th>
                  <th style={{width:"14%"}}>Status</th>
                  <th style={{width:"18%",textAlign:"center"}}>Manage</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="mm-empty">Loading members...</td></tr>
                ) : paginated.length===0 ? (
                  <tr><td colSpan={5} className="mm-empty">No members found.</td></tr>
                ) : paginated.map((m, idx) => (
                  <tr
                    key={m.id}
                    className={idx%2===0?"row-even":"row-odd"}
                    onClick={() => setViewMember(m)}
                    style={{cursor:"pointer"}}
                  >
                    <td className="mono cell-id">{m.member_id}</td>
                    <td className="cell-name">{m.fullname}</td>
                    <td>{m.contact}</td>
                    <td><span className={`status-badge status-${(m.status||"").toLowerCase()}`}>{m.status}</span></td>
                    <td>
                      <div className="action-btns" onClick={e => e.stopPropagation()}>
                        <button className="action-btn view-btn"   title="View"   onClick={() => setViewMember(m)}><Eye size={13}/></button>
                        <button className="action-btn edit-btn"   title="Edit"   onClick={() => setViewMember(m)}><Pencil size={12}/></button>
                        <button className="action-btn delete-btn" title="Delete" onClick={() => setDeleteMember(m)}><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mm-footer">
            <div className="mm-count">
              Showing {filtered.length===0?0:(safePage-1)*ROWS_PER_PAGE+1}–{Math.min(safePage*ROWS_PER_PAGE,filtered.length)} of {filtered.length}
            </div>
            <div className="mm-pagination">
              <button className="page-btn" disabled={safePage===1} onClick={() => setPage(p => p-1)}>← Prev</button>
              {Array.from({length:totalPages},(_,i)=>i+1)
                .filter(p => p===1||p===totalPages||Math.abs(p-safePage)<=1)
                .reduce((acc,p,i,arr) => { if(i>0&&p-arr[i-1]>1)acc.push("..."); acc.push(p); return acc; },[])
                .map((p,i) => p==="..."
                  ? <span key={`e${i}`} className="page-ellipsis">…</span>
                  : <button key={p} className={`page-btn page-num ${safePage===p?"active":""}`} onClick={() => setPage(p)}>{p}</button>
                )}
              <button className="page-btn" disabled={safePage===totalPages} onClick={() => setPage(p => p+1)}>Next →</button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Tab */}
      {mainTab==="pending" && (
        <div className="mm-card">
          {pending.length===0 ? (
            <div className="mm-empty-pending">
              <div style={{fontSize:36}}></div>
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
                    <th style={{width:"14%"}}>Submitted</th>
                    <th style={{width:"12%",textAlign:"center"}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((p, idx) => (
                    <tr
                      key={p.id}
                      className={idx%2===0?"row-even":"row-odd"}
                      onClick={() => setViewPending(p)}
                      style={{cursor:"pointer"}}
                    >
                      <td className="mono cell-id">{p.app_id}</td>
                      <td className="cell-name">{p.fullname || `${p.first_name} ${p.last_name}`}</td>
                      <td>{p.contact_number}</td>
                      <td>{p.occupation}</td>
                      <td style={{fontSize:11,color:"#888"}}>{(p.created_at||"").slice(0,10)}</td>
                      <td>
                        <div className="action-btns" onClick={e => e.stopPropagation()}>
                          <button className="action-btn view-btn" onClick={() => setViewPending(p)}><Eye size={13}/></button>
                          <button className="mm-convert-btn" onClick={() => handleConvert(p)}>✓</button>
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