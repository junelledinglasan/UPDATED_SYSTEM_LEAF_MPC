import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUserAPI } from "../../api/auth";
import "./MemberRegister.css";

function FormField({ name, label, type="text", required=false, full=false, value, onChange, error }) {
  return (
    <div className={`mr-field ${full?"mr-full":""}`}>
      <label className="mr-label">{label}{required && <span className="mr-req"> *</span>}</label>
      <input
        className={`mr-input ${error?"mr-err":""}`}
        type={type} name={name} value={value} onChange={onChange}
      />
      {error && <div className="mr-field-err">{error}</div>}
    </div>
  );
}

export default function MemberRegister() {
  const navigate  = useNavigate();
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [errors,  setErrors]  = useState({});

  const [form, setForm] = useState({
    username: "", password: "", confirmPassword: "",
  });

  const handle = e => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setErrors(p => ({ ...p, [e.target.name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.username.trim())           e.username        = "Required";
    if (form.username.trim().length < 4) e.username        = "Min 4 characters";
    if (form.username.includes(" "))     e.username        = "No spaces allowed";
    if (!form.password)                  e.password        = "Required";
    if (form.password.length < 6)        e.password        = "Min 6 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      await registerUserAPI({ username: form.username, password: form.password });
      setDone(true);
    } catch(err) {
      const d   = err.response?.data;
      const msg = d?.detail || (d?.username?.[0]) || (d && Object.values(d)[0]?.[0]) || "Registration failed.";
      setErrors({ username: msg });
    } finally { setLoading(false); }
  };

  if (done) return (
    <div className="mr-page">
      <div className="mr-success-card">
        <div className="mr-success-icon"></div>
        <div className="mr-success-title">Account Created!</div>
        <div className="mr-success-text">
          Your account has been created successfully.<br/><br/>
          You can now <strong>log in</strong> using your username and password.
          Once logged in, you can apply for official membership to unlock full access.
        </div>
        <div className="mr-success-notice">
          📋 After logging in, go to <strong>Apply for Membership</strong> to submit your membership application for admin approval.
        </div>
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
          <div className="mr-logo">LEAF MPC</div>
          <div className="mr-title">Create Account</div>
          <div className="mr-sub">Create your LEAF MPC account to get started.</div>
        </div>

        <div className="mr-body" style={{padding:"24px"}}>
          <div className="mr-grid">
            <div className="mr-field mr-full" style={{background:"#f1f8e9",borderRadius:10,padding:"12px 16px",borderLeft:"3px solid #2e7d32",marginBottom:4}}>
              <div style={{fontSize:12,color:"#2e7d32",fontWeight:600}}>ℹ️ Note</div>
              <div style={{fontSize:12,color:"#555",marginTop:4,lineHeight:1.6}}>
                Creating an account does <strong>not</strong> make you an official member yet.
                After logging in, you can submit a membership application for admin review.
              </div>
            </div>

            <FormField
              name="username" label="Username" required full
              value={form.username} onChange={handle} error={errors.username}
            />
            <div className="mr-field mr-full" style={{fontSize:11,color:"#888",marginTop:-8}}>
              Min 4 characters, no spaces allowed.
            </div>

            <FormField
              name="password" label="Password" type="password" required
              value={form.password} onChange={handle} error={errors.password}
            />
            <FormField
              name="confirmPassword" label="Confirm Password" type="password" required
              value={form.confirmPassword} onChange={handle} error={errors.confirmPassword}
            />

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
        </div>

        <div className="mr-footer">
          <div className="mr-footer-nav">
            <button className="mr-btn-submit" onClick={handleSubmit} disabled={loading}>
              {loading ? <span className="mr-spinner"/> : "Create Account"}
            </button>
          </div>
          <div className="mr-login-link">
            Already have an account? <button onClick={() => navigate("/login")}>Login here</button>
          </div>
        </div>
      </div>
    </div>
  );
}