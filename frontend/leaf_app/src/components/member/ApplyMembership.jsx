import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { submitApplicationAPI } from "../../api/members";
import "./ApplyMembership.css";

// ─── FormField OUTSIDE component — prevents re-mount on every keystroke ────
function FormField({ name, label, type="text", options=null, required=false, full=false, value, onChange, error }) {
  return (
    <div className={`am-field ${full ? "am-full" : ""}`}>
      <label className="am-label">{label}{required && <span className="am-req"> *</span>}</label>
      {options ? (
        <select className={`am-input ${error ? "am-input-err" : ""}`} name={name} value={value} onChange={onChange}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input className={`am-input ${error ? "am-input-err" : ""}`} type={type} name={name} value={value} onChange={onChange} />
      )}
      {error && <div className="am-field-err">{error}</div>}
    </div>
  );
}

export default function ApplyMembership() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab,    setTab]    = useState("personal");
  const [errors, setErrors] = useState({});
  const [done,   setDone]   = useState(false);
  const [loading,setLoading]= useState(false);

  const [form, setForm] = useState({
    // Personal Info
    firstname:   user?.name?.split(" ")[0] || "",
    lastname:    user?.name?.split(" ").slice(-1)[0] || "",
    middlename:  "",
    birthdate:   "",
    gender:      "Male",
    civilStatus: "Single",
    contact:     "",
    email:       "",
    address:     "",
    occupation:  "",

  });

  const handle = e => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setErrors(p => ({ ...p, [e.target.name]: "" }));
  };

  const validate = () => {
    const e = {};
    // Personal
    if (!form.firstname.trim())  e.firstname  = "Required";
    if (!form.lastname.trim())   e.lastname   = "Required";
    if (!form.birthdate)         e.birthdate  = "Required";
    if (!form.contact.trim())    e.contact    = "Required";
    if (!form.address.trim())    e.address    = "Required";
    if (!form.occupation.trim()) e.occupation = "Required";

    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      // Go to the tab that has errors
      const personalFields = ["firstname","lastname","birthdate","contact","address","occupation"];
      const idFields       = ["idNumber"];
      if (personalFields.some(f => e[f])) { setTab("personal"); return; }
      if (idFields.some(f => e[f]))       { setTab("id");       return; }
      return;
    }

    setLoading(true);
    try {
      await submitApplicationAPI({
        firstname:    form.firstname,    lastname:     form.lastname,
        middlename:   form.middlename,   birthdate:    form.birthdate,
        gender:       form.gender,       civil_status: form.civilStatus,
        contact:      form.contact,      email:        form.email,
        address:      form.address,      occupation:   form.occupation,

      });
      setDone(true);
    } catch(err) {
      const msg = err.response?.data?.detail || "Failed to submit. Please try again.";
      setErrors({ firstname: msg });
      setTab("personal");
    } finally { setLoading(false); }
  };

  // ── Success Screen ──
  if (done) return (
    <div className="am-wrap">
      <div className="am-success-card">
        <div className="am-success-icon">🎉</div>
        <div className="am-success-title">Application Submitted!</div>
        <div className="am-success-text">
          Your membership application has been submitted successfully.
          The admin or staff will review it and notify you once processed.
        </div>
        <div className="am-success-notice">
          <div className="am-notice-icon">📋</div>
          <div>
            You can check the status of your application in your profile.
            In the meantime, you can access <strong>Notifications</strong> and <strong>Announcements</strong>.
          </div>
        </div>
        <div className="am-success-actions">
          <button className="am-btn-primary" onClick={() => navigate("/member/notifications")}>
            Go to Notifications
          </button>
          <button className="am-btn-secondary" onClick={() => navigate("/member/profile")}>
            View My Profile
          </button>
        </div>
      </div>
    </div>
  );



  const TABS = [
    { key: "personal", label: "👤 Personal Info" },
  ];

  return (
    <div className="am-wrap">

      {/* Header */}
      <div className="am-header">
        <button className="am-back-btn" onClick={() => navigate(-1)}> Back</button>
        <div>
          <div className="am-title">Apply for Official Membership</div>
          <div className="am-sub">
            Fill out the form below. Your application will be sent to the admin for review.
          </div>
        </div>
      </div>

      {/* Info notice */}
      <div className="am-info-notice">
        <div className="am-notice-icon">ℹ</div>
        <div>
          Make sure all information is accurate and complete. Incomplete applications may be rejected.
          After submitting, the admin or staff will review and contact you.
        </div>
      </div>

      {/* Form Card */}
      <div className="am-card">

        {/* Tabs */}
        <div className="am-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`am-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="am-form-body">

          {/* ── Personal Info ── */}
          {tab === "personal" && (
            <div className="am-form-grid">
              <FormField name="lastname"    label="Last Name"    required value={form.lastname}    onChange={handle} error={errors.lastname}/>
              <FormField name="firstname"   label="First Name"   required value={form.firstname}   onChange={handle} error={errors.firstname}/>
              <FormField name="middlename"  label="Middle Name"           value={form.middlename}  onChange={handle}/>
              <FormField name="birthdate"   label="Birthdate"    required type="date" value={form.birthdate} onChange={handle} error={errors.birthdate}/>
              <FormField name="gender"      label="Gender"       options={["Male","Female","Other"]} value={form.gender} onChange={handle}/>
              <FormField name="civilStatus" label="Civil Status" options={["Single","Married","Widowed","Separated"]} value={form.civilStatus} onChange={handle}/>
              <FormField name="contact"     label="Contact No."  required value={form.contact}     onChange={handle} error={errors.contact}/>
              <FormField name="email"       label="Email"        type="email" value={form.email}   onChange={handle}/>
              <FormField name="occupation"  label="Occupation"   required value={form.occupation}  onChange={handle} error={errors.occupation}/>
              <FormField name="address"     label="Complete Address" full required value={form.address} onChange={handle} error={errors.address}/>
            </div>
          )}

          {/* ── Valid ID ── */}
          
          {/* ── Beneficiary ── */}
          
        </div>

        {/* Footer */}
        <div className="am-form-footer">
          <div className="am-tab-nav">
            <button
              className={`am-btn-submit ${loading ? "loading" : ""}`}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <span className="am-spinner" /> : "Submit Application"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}