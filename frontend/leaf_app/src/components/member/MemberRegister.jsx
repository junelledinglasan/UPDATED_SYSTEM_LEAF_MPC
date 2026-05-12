import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitApplicationAPI } from "../api/members";
import "./MemberRegister.css";

// FormField outside component to prevent re-mount on keystroke
function FormField({ name, label, type="text", options=null, required=false, full=false, value, onChange, error }) {
  return (
    <div className={`mr-field ${full?"mr-full":""}`}>
      <label className="mr-label">{label}{required && <span className="mr-req"> *</span>}</label>
      {options ? (
        <select className={`mr-input ${error?"mr-err":""}`} name={name} value={value} onChange={onChange}>
          {options.map(o => typeof o === "object"
            ? <option key={o.value} value={o.value}>{o.label}</option>
            : <option key={o}>{o}</option>
          )}
        </select>
      ) : type === "checkbox" ? (
        <label className="mr-checkbox-label">
          <input type="checkbox" name={name} checked={!!value} onChange={onChange}/>
          <span>Yes</span>
        </label>
      ) : (
        <input className={`mr-input ${error?"mr-err":""}`} type={type} name={name} value={value} onChange={onChange}/>
      )}
      {error && <div className="mr-field-err">{error}</div>}
    </div>
  );
}

export default function MemberRegister() {
  const navigate  = useNavigate();
  const [tab,     setTab]    = useState("personal");
  const [loading, setLoading]= useState(false);
  const [done,    setDone]   = useState(false);
  const [errors,  setErrors] = useState({});

  const [form, setForm] = useState({
    // Personal Info
    first_name:"", last_name:"", middle_name:"", birth_date:"",
    civil_status:"Single", educational_attainment:"", occupation:"",
    income:"", contact_number:"", address:"",
    birth_certificate:false, marriage_certificate:false,
    // Classification
    classification:"Employed",
    // Student
    school_name:"", year_level:"", allowance:"",
    // Senior
    pension_income:"",
    // Employed
    job_type:"Employed", monthly_income:"",
    // Account
    username:"", password:"", confirmPassword:"",
  });

  const handle = e => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [e.target.name]: val }));
    setErrors(p => ({ ...p, [e.target.name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.first_name.trim())    e.first_name    = "Required";
    if (!form.last_name.trim())     e.last_name     = "Required";
    if (!form.birth_date)           e.birth_date    = "Required";
    if (!form.contact_number.trim())e.contact_number= "Required";
    if (!form.address.trim())       e.address       = "Required";
    if (!form.username.trim())      e.username      = "Required";
    if (form.username.trim().length < 4) e.username = "Min 4 characters";
    if (!form.password)             e.password      = "Required";
    if (form.password.length < 6)   e.password      = "Min 6 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    // Classification-specific
    if (form.classification === "Student" && !form.school_name.trim()) e.school_name = "Required";
    if (form.classification === "Student" && !form.year_level.trim())  e.year_level  = "Required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      const personalFields = ["first_name","last_name","birth_date","contact_number","address"];
      const classFields    = ["school_name","year_level","pension_income","monthly_income"];
      if (personalFields.some(f => e[f])) { setTab("personal"); return; }
      if (classFields.some(f => e[f]))    { setTab("classification"); return; }
      setTab("account");
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
        occupation:             form.occupation,
        income:                 form.income || 0,
        contact_number:         form.contact_number,
        address:                form.address,
        classification:         form.classification,
        birth_certificate:      form.birth_certificate,
        marriage_certificate:   form.marriage_certificate,
        // Classification-specific
        school_name:    form.school_name,
        year_level:     form.year_level,
        allowance:      form.allowance || 0,
        pension_income: form.pension_income || 0,
        job_type:       form.job_type,
        monthly_income: form.monthly_income || 0,
        // Account
        username: form.username,
        password: form.password,
      });
      setDone(true);
    } catch(err) {
      const d   = err.response?.data;
      const msg = d?.detail || (d && Object.values(d)[0]?.[0]) || "Registration failed.";
      setErrors({ username: msg });
      setTab("account");
    } finally { setLoading(false); }
  };

  const TABS = [
    { key:"personal",       label:"👤 Personal Info" },
    { key:"classification", label:"📋 Classification" },
    { key:"account",        label:"🔐 Account" },
  ];

  if (done) return (
    <div className="mr-page">
      <div className="mr-success-card">
        <div className="mr-success-icon">🎉</div>
        <div className="mr-success-title">Application Submitted!</div>
        <div className="mr-success-text">
          Your membership application has been submitted.<br/><br/>
          You can now <strong>log in</strong> using your username and password.
          While your membership is pending, you can access <strong>Announcements</strong> and <strong>My Profile</strong>.
        </div>
        <div className="mr-success-notice">📋 The admin will review your application. Once approved and converted to official member, you will have full access.</div>
        <div className="mr-success-actions">
          <button className="mr-btn-primary" onClick={() => navigate("/login")}>Go to Login</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mr-page">
      <div className="mr-card">
        <div className="mr-header">
          <div className="mr-logo">🌿 LEAF MPC</div>
          <div className="mr-title">Create Account</div>
          <div className="mr-sub">Fill out the form to apply for LEAF MPC membership.</div>
        </div>

        <div className="mr-tabs">
          {TABS.map((t,i) => (
            <button key={t.key} className={`mr-tab ${tab===t.key?"active":""}`} onClick={() => setTab(t.key)}>
              <span className="mr-tab-num">{i+1}</span> {t.label}
            </button>
          ))}
        </div>

        <div className="mr-body">
          {/* ── Personal Info ── */}
          {tab === "personal" && (
            <div className="mr-grid">
              <FormField name="last_name"              label="Last Name"              required value={form.last_name}              onChange={handle} error={errors.last_name}/>
              <FormField name="first_name"             label="First Name"             required value={form.first_name}             onChange={handle} error={errors.first_name}/>
              <FormField name="middle_name"            label="Middle Name"                     value={form.middle_name}            onChange={handle}/>
              <FormField name="birth_date"             label="Birthdate"              required type="date" value={form.birth_date}  onChange={handle} error={errors.birth_date}/>
              <FormField name="civil_status"           label="Civil Status"           options={["Single","Married","Widowed","Separated"]} value={form.civil_status} onChange={handle}/>
              <FormField name="educational_attainment" label="Educational Attainment" options={["Elementary","High School","Vocational","College","Post Graduate"]} value={form.educational_attainment} onChange={handle}/>
              <FormField name="contact_number"         label="Contact No."            required value={form.contact_number}         onChange={handle} error={errors.contact_number}/>
              <FormField name="occupation"             label="Occupation"                      value={form.occupation}             onChange={handle}/>
              <FormField name="income"                 label="Monthly Income (₱)"     type="number" value={form.income}            onChange={handle}/>
              <FormField name="address"                label="Complete Address"       required full value={form.address}            onChange={handle} error={errors.address}/>
              <div className="mr-field">
                <label className="mr-label">Birth Certificate Submitted</label>
                <label className="mr-checkbox-label">
                  <input type="checkbox" name="birth_certificate" checked={form.birth_certificate} onChange={handle}/>
                  <span>Yes</span>
                </label>
              </div>
              <div className="mr-field">
                <label className="mr-label">Marriage Certificate Submitted</label>
                <label className="mr-checkbox-label">
                  <input type="checkbox" name="marriage_certificate" checked={form.marriage_certificate} onChange={handle}/>
                  <span>Yes (if married)</span>
                </label>
              </div>
            </div>
          )}

          {/* ── Classification ── */}
          {tab === "classification" && (
            <div className="mr-grid">
              <div className="mr-field mr-full">
                <label className="mr-label">Member Classification <span className="mr-req">*</span></label>
                <div className="mr-class-options">
                  {["Student","Senior","Employed"].map(c => (
                    <div key={c}
                      className={`mr-class-card ${form.classification===c?"selected":""}`}
                      onClick={() => setForm(p => ({...p, classification:c}))}>
                      <div className="mr-class-icon">{c==="Student"?"🎓":c==="Senior"?"👴":"💼"}</div>
                      <div className="mr-class-name">{c}</div>
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
                  <FormField name="occupation"     label="Occupation/Job Title"  value={form.occupation}     onChange={handle}/>
                  <FormField name="job_type"        label="Employment Type"
                    options={["Employed","Self-Employed","Business","Freelance","Other"]}
                    value={form.job_type} onChange={handle}/>
                  <FormField name="monthly_income" label="Monthly Income (₱)"    type="number" value={form.monthly_income} onChange={handle}/>
                </>
              )}
            </div>
          )}

          {/* ── Account ── */}
          {tab === "account" && (
            <div className="mr-grid">
              <FormField name="username" label="Username" required value={form.username} onChange={handle} error={errors.username}/>
              <div className="mr-field mr-full">
                <div className="mr-notice-sm">This will be your login username. Min 4 characters, no spaces.</div>
              </div>
              <FormField name="password"        label="Password"         required type="password" value={form.password}        onChange={handle} error={errors.password}/>
              <FormField name="confirmPassword" label="Confirm Password" required type="password" value={form.confirmPassword} onChange={handle} error={errors.confirmPassword}/>
              {form.password && (
                <div className="mr-strength mr-full">
                  <div className="mr-strength-bars">
                    {["weak","fair","strong"].map((s,i) => (
                      <div key={s} className={`mr-bar ${form.password.length > [0,4,7][i] ? s : ""}`}/>
                    ))}
                  </div>
                  <span className="mr-strength-label">
                    {form.password.length < 5 ? "Weak" : form.password.length < 8 ? "Fair" : "Strong"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mr-footer">
          <div className="mr-footer-nav">
            {tab !== "personal" && (
              <button className="mr-btn-back" onClick={() => {
                const keys = TABS.map(t=>t.key);
                setTab(keys[keys.indexOf(tab)-1]);
              }}>← Previous</button>
            )}
            {tab !== "account" ? (
              <button className="mr-btn-next" onClick={() => {
                const keys = TABS.map(t=>t.key);
                setTab(keys[keys.indexOf(tab)+1]);
              }}>Next →</button>
            ) : (
              <button className="mr-btn-submit" onClick={handleSubmit} disabled={loading}>
                {loading ? <span className="mr-spinner"/> : "Submit Application"}
              </button>
            )}
          </div>
          <div className="mr-login-link">
            Already have an account? <button onClick={() => navigate("/login")}>Login here</button>
          </div>
        </div>
      </div>
    </div>
  );
}