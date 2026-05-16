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
          {options.map(o => typeof o === "object"
            ? <option key={o.value} value={o.value}>{o.label}</option>
            : <option key={o}>{o}</option>
          )}
        </select>
      ) : type === "checkbox" ? (
        <label className="am-checkbox-label">
          <input type="checkbox" name={name} checked={!!value} onChange={onChange}/>
          <span>Yes</span>
        </label>
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

  const [tab,     setTab]    = useState("personal");
  const [errors,  setErrors] = useState({});
  const [done,    setDone]   = useState(false);
  const [loading, setLoading]= useState(false);

  const [form, setForm] = useState({
    // Personal Info
    first_name:             user?.name?.split(" ")[0] || "",
    last_name:              user?.name?.split(" ").slice(-1)[0] || "",
    middle_name:            "",
    birth_date:             "",
    civil_status:           "Single",
    educational_attainment: "",
    contact_number:         "",
    email:                  "",
    address:                "",
    occupation:             "",
    income:                 "",
    birth_certificate:      false,
    marriage_certificate:   false,
    // Classification
    classification:  "Employed",
    school_name:     "",
    year_level:      "",
    allowance:       "",
    pension_income:  "",
    job_type:        "Employed",
    monthly_income:  "",
  });

  const handle = e => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [e.target.name]: val }));
    setErrors(p => ({ ...p, [e.target.name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.first_name.trim())      e.first_name      = "Required";
    if (!form.last_name.trim())       e.last_name       = "Required";
    if (!form.birth_date)             e.birth_date      = "Required";
    if (!form.contact_number.trim())  e.contact_number  = "Required";
    if (!form.address.trim())         e.address         = "Required";
    if (!form.occupation.trim())      e.occupation      = "Required";
    // Classification-specific
    if (form.classification === "Student" && !form.school_name.trim()) e.school_name = "Required";
    if (form.classification === "Student" && !form.year_level.trim())  e.year_level  = "Required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      const personalFields = ["first_name","last_name","birth_date","contact_number","address","occupation"];
      const classFields    = ["school_name","year_level"];
      if (personalFields.some(f => e[f])) { setTab("personal");        return; }
      if (classFields.some(f => e[f]))    { setTab("classification");   return; }
      return;
    }

    setLoading(true);
    try {
      await submitApplicationAPI({
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
      setDone(true);
    } catch(err) {
      const msg = err.response?.data?.detail || "Failed to submit. Please try again.";
      setErrors({ first_name: msg });
      setTab("personal");
    } finally { setLoading(false); }
  };

  const TABS = [
    { key: "personal",       label: "👤 Personal Info" },
    { key: "classification", label: "📋 Classification" },
  ];

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
          {TABS.map((t, i) => (
            <button
              key={t.key}
              className={`am-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <span className="am-tab-num">{i + 1}</span> {t.label}
            </button>
          ))}
        </div>

        <div className="am-form-body">

          {/* ── Personal Info ── */}
          {tab === "personal" && (
            <div className="am-form-grid">
              <FormField name="last_name"              label="Last Name"              required value={form.last_name}              onChange={handle} error={errors.last_name}/>
              <FormField name="first_name"             label="First Name"             required value={form.first_name}             onChange={handle} error={errors.first_name}/>
              <FormField name="middle_name"            label="Middle Name"                     value={form.middle_name}            onChange={handle}/>
              <FormField name="birth_date"             label="Birthdate"              required type="date" value={form.birth_date}  onChange={handle} error={errors.birth_date}/>
              <FormField name="civil_status"           label="Civil Status"           options={["Single","Married","Widowed","Separated"]} value={form.civil_status} onChange={handle}/>
              <FormField name="educational_attainment" label="Educational Attainment" options={["Elementary","High School","Vocational","College","Post Graduate"]} value={form.educational_attainment} onChange={handle}/>
              <FormField name="contact_number"         label="Contact No."            required value={form.contact_number}         onChange={handle} error={errors.contact_number}/>
              <FormField name="occupation"             label="Occupation"             required value={form.occupation}             onChange={handle} error={errors.occupation}/>
              <FormField name="income"                 label="Monthly Income (₱)"     type="number" value={form.income}            onChange={handle}/>
              <FormField name="email"                  label="Email"                  type="email" value={form.email}              onChange={handle}/>
              <FormField name="address"                label="Complete Address"       required full value={form.address}            onChange={handle} error={errors.address}/>
              <div className="am-field">
                <label className="am-label">Birth Certificate Submitted</label>
                <label className="am-checkbox-label">
                  <input type="checkbox" name="birth_certificate" checked={form.birth_certificate} onChange={handle}/>
                  <span>Yes</span>
                </label>
              </div>
              <div className="am-field">
                <label className="am-label">Marriage Certificate Submitted</label>
                <label className="am-checkbox-label">
                  <input type="checkbox" name="marriage_certificate" checked={form.marriage_certificate} onChange={handle}/>
                  <span>Yes (if married)</span>
                </label>
              </div>
            </div>
          )}

          {/* ── Classification ── */}
          {tab === "classification" && (
            <div className="am-form-grid">
              <div className="am-field am-full">
                <label className="am-label">Member Classification <span className="am-req">*</span></label>
                <div className="am-class-options">
                  {["Student","Senior","Employed"].map(c => (
                    <div
                      key={c}
                      className={`am-class-card ${form.classification === c ? "selected" : ""}`}
                      onClick={() => setForm(p => ({ ...p, classification: c }))}>
                      <div className="am-class-icon">{c==="Student"?"🎓":c==="Senior"?"👴":"💼"}</div>
                      <div className="am-class-name">{c}</div>
                    </div>
                  ))}
                </div>
              </div>

              {form.classification === "Student" && (
                <>
                  <FormField name="school_name" label="School Name"  required value={form.school_name} onChange={handle} error={errors.school_name}/>
                  <FormField name="year_level"  label="Year Level"   required value={form.year_level}  onChange={handle} error={errors.year_level}
                    options={["Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12","1st Year","2nd Year","3rd Year","4th Year","5th Year","Graduate"]}/>
                  <FormField name="allowance"   label="Monthly Allowance (₱)" type="number" value={form.allowance} onChange={handle}/>
                </>
              )}

              {form.classification === "Senior" && (
                <>
                  <FormField name="educational_attainment" label="Educational Attainment"
                    options={["Elementary","High School","Vocational","College","Post Graduate"]}
                    value={form.educational_attainment} onChange={handle}/>
                  <FormField name="pension_income" label="Monthly Pension Income (₱)" type="number" value={form.pension_income} onChange={handle}/>
                </>
              )}

              {form.classification === "Employed" && (
                <>
                  <FormField name="occupation"     label="Occupation/Job Title" value={form.occupation}     onChange={handle}/>
                  <FormField name="job_type"       label="Employment Type"
                    options={["Employed","Self-Employed","Business","Freelance","Other"]}
                    value={form.job_type} onChange={handle}/>
                  <FormField name="monthly_income" label="Monthly Income (₱)"   type="number" value={form.monthly_income} onChange={handle}/>
                </>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="am-form-footer">
          <div className="am-tab-nav">
            {tab !== "personal" && (
              <button className="am-btn-back" onClick={() => {
                const keys = TABS.map(t => t.key);
                setTab(keys[keys.indexOf(tab) - 1]);
              }}>← Previous</button>
            )}
            {tab !== "classification" ? (
              <button className="am-btn-next" onClick={() => {
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