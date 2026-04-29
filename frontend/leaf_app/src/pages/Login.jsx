import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Leaf, Eye, EyeOff, Lock } from "lucide-react";
import "./Login.css";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [form,   setForm]   = useState({ username: "", password: "" });
  const [error,  setError]  = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showMsg,setShowMsg]= useState(false);

  const handle = e => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.username.trim()) { setError("Please enter your username."); return; }
    if (!form.password)        { setError("Please enter your password."); return; }

    const result = await login(form.username, form.password);

    if (!result.success) {
      setError(result.message);
      return;
    }

    // Auto-redirect based on role
    if (result.role === "admin")  navigate("/admin/dashboard",  { replace: true });
    if (result.role === "staff")  navigate("/staff/home",       { replace: true });
    if (result.role === "member") navigate("/member/dashboard", { replace: true });
  };

  const handleKeyDown = e => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="lp-page">

      {/* Forgot Password Modal */}
      {showMsg && (
        <div className="lp-msg-overlay" onClick={() => setShowMsg(false)}>
          <div className="lp-msg-box" onClick={e => e.stopPropagation()}>
            <div className="lp-msg-icon"><Lock size={32} color="#2e7d32"/></div>
            <div className="lp-msg-title">Forgot Password?</div>
            <div className="lp-msg-text">
              Para sa password reset, mangyaring bumisita sa opisina o makipag-ugnayan sa LEAF MPC administrator.
            </div>
            <button className="lp-msg-btn" onClick={() => setShowMsg(false)}>Got it</button>
          </div>
        </div>
      )}

      {/* Left Panel */}
      <div className="lp-left">
        <div className="lp-left-content">
          {/*
            ╔══════════════════════════════════════╗
            ║  LOGO PLACEMENT                      ║
            ║  1. I-save ang logo bilang logo.png  ║
            ║  2. Ilagay sa leaf_app/public/       ║
            ║  3. Palitan ang div na ito ng:       ║
            ║     <img src="/logo.png"             ║
            ║          alt="LEAF MPC"              ║
            ║          className="lp-logo-img" />  ║
            ╚══════════════════════════════════════╝
          */}
          <div className="lp-logo-placeholder">
            <img src="/logo.png" alt="LEAF MPC" className="lp-logo-img" />
          </div>
          <div className="lp-left-title">Cooperative Management System</div>
          <div className="lp-left-sub">Admin, Staff and Member Portal</div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="lp-right">
        <div className="lp-card">

          <div className="lp-card-icon"><Leaf size={24} color="#4caf50" fill="#4caf50"/></div>
          <div className="lp-card-title">Login</div>
          <div className="lp-card-sub">Enter your credentials to continue</div>

          <div className="lp-form">

            <div className="lp-field">
              <label className="lp-label">Username</label>
              <input
                className={`lp-input ${error ? "lp-input-err" : ""}`}
                type="text"
                name="username"
                placeholder="Enter your username"
                value={form.username}
                onChange={handle}
                onKeyDown={handleKeyDown}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="lp-field">
              <label className="lp-label">Password</label>
              <div className="lp-pw-wrap">
                <input
                  className={`lp-input ${error ? "lp-input-err" : ""}`}
                  type={showPw ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handle}
                  onKeyDown={handleKeyDown}
                  autoComplete="current-password"
                />
                <button
                  className="lp-pw-eye"
                  onClick={() => setShowPw(p => !p)}
                  tabIndex={-1}
                  type="button"
                >
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <div className="lp-links-row">
              <button className="lp-link" onClick={() => setShowMsg(true)}>
                Forgot Password?
              </button>
              <button className="lp-link" onClick={() => navigate("/register")}>
                Create Account
              </button>
            </div>

            {error && <div className="lp-error">⚠ {error}</div>}

            <button
              className="lp-login-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <span className="lp-spinner" /> : "Login"}
            </button>

          </div>

          <div className="lp-notice">
            <Lock size={12}/> Your account will automatically be directed to the correct portal
          </div>

        </div>
      </div>
    </div>
  );
}