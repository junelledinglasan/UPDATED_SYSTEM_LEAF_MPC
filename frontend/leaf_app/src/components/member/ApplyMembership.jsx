import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./ApplyMembership.css";

const VALID_IDS = [
  "UMID", "Philippine Passport", "Driver's License",
  "SSS ID", "PhilHealth ID", "Voter's ID", "PRC ID",
  "Postal ID", "School ID",
];

export default function ApplyMembership() {
  const { user, submitMembershipApplication } = useAuth();
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
    // Valid ID
    validId:     "UMID",
    idNumber:    "",
    // Beneficiary
    beneficiary:  "",
    relationship: "Spouse",
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
    // ID
    if (!form.idNumber.trim())   e.idNumber   = "Required";
    return e;
  };

  const handleSubmit = () => {
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
    setTimeout(() => {
      submitMembershipApplication({
        ...form,
        submittedBy: user?.username || "unknown",
      });
      setLoading(false);
      setDone(true);
    }, 700);
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

  const Field = ({ name, label, type = "text", options = null, required = false, full = false }) => (
    <div className={`am-field ${full ? "am-full" : ""}`}>
      <label className="am-label">
        {label}{required && <span className="am-req"> *</span>}
      </label>
      {options ? (
        <select
          className={`am-input ${errors[name] ? "am-input-err" : ""}`}
          name={name} value={form[name]} onChange={handle}
        >
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input
          className={`am-input ${errors[name] ? "am-input-err" : ""}`}
          type={type} name={name} value={form[name]}
          onChange={handle}
        />
      )}
      {errors[name] && <div className="am-field-err">{errors[name]}</div>}
    </div>
  );

  const TABS = [
    { key: "personal",    label: "👤 Personal Info" },
    { key: "id",          label: "🪪 Valid ID" },
    { key: "beneficiary", label: "👥 Beneficiary" },
  ];

  return (
    <div className="am-wrap">

      {/* Header */}
      <div className="am-header">
        <button className="am-back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div>
          <div className="am-title">Apply for Official Membership</div>
          <div className="am-sub">
            Fill out the form below. Your application will be sent to the admin for review.
          </div>
        </div>
      </div>

      {/* Info notice */}
      <div className="am-info-notice">
        <div className="am-notice-icon">ℹ️</div>
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
              <Field name="lastname"   label="Last Name"    required />
              <Field name="firstname"  label="First Name"   required />
              <Field name="middlename" label="Middle Name" />
              <Field name="birthdate"  label="Birthdate"    type="date" required />
              <Field name="gender"     label="Gender"       options={["Male","Female","Other"]} />
              <Field name="civilStatus"label="Civil Status" options={["Single","Married","Widowed","Separated"]} />
              <Field name="contact"    label="Contact No."  required />
              <Field name="email"      label="Email"        type="email" />
              <Field name="occupation" label="Occupation"   required />
              <Field name="address"    label="Complete Address" full required />
            </div>
          )}

          {/* ── Valid ID ── */}
          {tab === "id" && (
            <div className="am-form-grid">
              <Field name="validId"  label="Type of Valid ID" options={VALID_IDS} />
              <Field name="idNumber" label="ID Number"        required />
              <div className="am-id-notice am-full">
                💡 Make sure your ID is valid and not expired. The admin may request a physical copy during office visit.
              </div>
            </div>
          )}

          {/* ── Beneficiary ── */}
          {tab === "beneficiary" && (
            <div className="am-form-grid">
              <Field name="beneficiary"  label="Beneficiary / Emergency Contact Name" />
              <Field name="relationship" label="Relationship" options={["Spouse","Parent","Child","Sibling","Other"]} />
              <div className="am-id-notice am-full">
                💡 This is your emergency contact and designated beneficiary for cooperative benefits.
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="am-form-footer">
          <div className="am-tab-nav">
            {tab !== "personal" && (
              <button className="am-btn-secondary" onClick={() => {
                const keys = TABS.map(t => t.key);
                setTab(keys[keys.indexOf(tab) - 1]);
              }}>← Previous</button>
            )}
            {tab !== "beneficiary" ? (
              <button className="am-btn-primary" onClick={() => {
                const keys = TABS.map(t => t.key);
                setTab(keys[keys.indexOf(tab) + 1]);
              }}>Next →</button>
            ) : (
              <button
                className={`am-btn-submit ${loading ? "loading" : ""}`}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <span className="am-spinner" /> : "Submit Application"}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}