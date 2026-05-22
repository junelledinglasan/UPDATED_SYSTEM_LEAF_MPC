import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getMyProfileAPI, getMyApplicationAPI, updateMemberAPI } from "../../api/members";
import api from "../../api/axiosInstance";
import "./MemberProfile.css";

export default function MemberProfile() {
  const { user } = useAuth();
  const [profile,     setProfile]    = useState(null);
  const [application, setApplication]= useState(null);
  const [isOfficial,  setIsOfficial] = useState(false);
  const [loading,     setLoading]    = useState(true);
  const [tab,         setTab]        = useState("info");
  const [editing,     setEditing]    = useState(false);
  const [form,        setForm]       = useState({ contact:"", email:"", address:"", occupation:"" });
  const [saved,       setSaved]      = useState(false);

  // Security state
  const [username,    setUsername]   = useState(user?.username || "");
  const [newUsername, setNewUsername]= useState("");
  const [unError,     setUnError]    = useState("");
  const [unSaved,     setUnSaved]    = useState(false);
  const [passForm,    setPassForm]   = useState({ current:"", newPass:"", confirm:"" });
  const [passError,   setPassError]  = useState("");
  const [passSaved,   setPassSaved]  = useState(false);
  const [showCurr,    setShowCurr]   = useState(false);
  const [showNew,     setShowNew]    = useState(false);
  const [showConf,    setShowConf]   = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const p = await getMyProfileAPI();
        setProfile(p);
        setIsOfficial(true);
        const pm = p.pre_member_info || {};
        setForm({
          contact:    p.contact     || "",
          email:      p.email       || "",
          address:    pm.address    || "",
          occupation: pm.occupation || "",
        });
      } catch {
        try {
          const app = await getMyApplicationAPI();
          setApplication(app);
        } catch { /* no application yet */ }
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const PROFILE = profile || {};
  const PM      = PROFILE.pre_member_info || {};

  const handle     = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handlePass = e => setPassForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    try {
      await updateMemberAPI(profile.id, {
        contact: form.contact, email: form.email,
        address: form.address, occupation: form.occupation,
      });
      setProfile(p => ({ ...p, ...form }));
      setSaved(true); setEditing(false);
      setTimeout(() => setSaved(false), 2500);
    } catch(e) { console.error(e); }
  };

  const handleUsernameChange = async () => {
    if (!newUsername.trim())         { setUnError("Username cannot be empty."); return; }
    if (newUsername.trim().length<4) { setUnError("Username must be at least 4 characters."); return; }
    if (/\s/.test(newUsername))      { setUnError("Username cannot have spaces."); return; }
    try {
      await api.patch("/auth/me/update/", { username: newUsername.trim() });
      setUsername(newUsername.trim());
      setNewUsername(""); setUnError("");
      setUnSaved(true); setTimeout(() => setUnSaved(false), 2500);
    } catch(err) {
      setUnError(err.response?.data?.username?.[0] || "Failed to update username.");
    }
  };

  const handlePasswordChange = async () => {
    if (passForm.newPass.length < 6)          { setPassError("New password must be at least 6 characters."); return; }
    if (passForm.newPass !== passForm.confirm) { setPassError("Passwords do not match."); return; }
    try {
      await api.post("/auth/change-password/", { current_password: passForm.current, new_password: passForm.newPass });
      setPassForm({ current:"", newPass:"", confirm:"" });
      setPassError(""); setPassSaved(true);
      setTimeout(() => setPassSaved(false), 2500);
    } catch(err) {
      setPassError(err.response?.data?.detail || "Current password is incorrect.");
    }
  };

  if (loading) return <div style={{textAlign:"center",padding:"60px",color:"#aaa"}}>Loading profile...</div>;

  // ── Non-official member view ──────────────────────────────────────────────
  if (!isOfficial) {
    const appStatus = application?.application_status || null;
    return (
      <div className="mp-wrapper">
        <div className="mp-header-card" style={{flexDirection:"column",alignItems:"flex-start",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div className="mp-avatar-large">{(user?.name?.[0]||"M").toUpperCase()}</div>
            <div>
              <div className="mp-header-name">{user?.name || "Member"}</div>
              <div className="mp-header-id">@{user?.username || "—"}</div>
              <div className="mp-header-since">Not yet an official member</div>
            </div>
          </div>
        </div>

        <div className="mp-card">
          <div className="mp-card-title">Membership Application Status</div>
          {!appStatus ? (
            <div style={{padding:"20px 0",textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:8}}>📋</div>
              <div style={{fontWeight:700,color:"#1b5e20",marginBottom:6}}>No application submitted yet</div>
              <div style={{fontSize:12,color:"#888",marginBottom:16}}>Submit a membership application to become an official member.</div>
              <a href="/member/apply-membership" style={{
                background:"#2e7d32",color:"#fff",borderRadius:8,
                padding:"10px 24px",fontWeight:700,fontSize:13,textDecoration:"none",
              }}>Apply for Membership</a>
            </div>
          ) : (
            <div>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <div style={{fontSize:32}}>
                  {appStatus==="Pending"?"⏳":appStatus==="Approved"?"✅":"❌"}
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:
                    appStatus==="Approved"?"#1b5e20":appStatus==="Rejected"?"#c62828":"#f57c00"
                  }}>{appStatus}</div>
                  <div style={{fontSize:12,color:"#888"}}>
                    Application ID: {application.app_id} · Submitted {application.created_at?.slice(0,10)}
                  </div>
                </div>
              </div>
              {appStatus === "Pending" && (
                <div style={{background:"#fff8e1",border:"1px solid #ffe082",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#5d4037"}}>
                  ⏳ Your application is currently under review. The admin or staff will notify you once processed.
                </div>
              )}
              {appStatus === "Approved" && (
                <div style={{background:"#e8f5e9",border:"1px solid #a5d6a7",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#1b5e20"}}>
                  ✅ Your application has been <strong>approved!</strong> Please visit the LEAF MPC office to complete the process.
                </div>
              )}
              {appStatus === "Rejected" && (
                <div>
                  <div style={{background:"#ffebee",border:"1px solid #ef9a9a",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#c62828",marginBottom:8}}>
                    ❌ Your application was <strong>not approved</strong>.
                    {application.reject_reason && <div style={{marginTop:6,fontStyle:"italic"}}>Reason: {application.reject_reason}</div>}
                  </div>
                  <a href="/member/apply-membership" style={{
                    display:"inline-block",background:"#2e7d32",color:"#fff",borderRadius:8,
                    padding:"8px 20px",fontWeight:700,fontSize:13,textDecoration:"none",marginTop:8,
                  }}>Re-apply for Membership</a>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mp-card">
          <div className="mp-card-title">Account Information</div>
          <div className="mp-info-grid">
            <div className="mp-info-item"><span className="mp-info-key">Username</span><span className="mp-info-val">{user?.username}</span></div>
            <div className="mp-info-item"><span className="mp-info-key">Role</span><span className="mp-info-val">Member (Non-official)</span></div>
          </div>
        </div>
      </div>
    );
  }

  // ── Official member view ──────────────────────────────────────────────────
  return (
    <div className="mp-wrapper">
      {saved && <div className="mp-toast">✓ Profile updated successfully!</div>}

      {/* Header */}
      <div className="mp-header-card">
        <div className="mp-avatar-large">{(PROFILE.first_name?.[0] || PM.first_name?.[0] || "M").toUpperCase()}</div>
        <div className="mp-header-info">
          <div className="mp-header-name">{PROFILE.fullname || `${PM.first_name||""} ${PM.last_name||""}`.trim()}</div>
          <div className="mp-header-id">{PROFILE.member_id || "—"}</div>
          <div className="mp-header-since">Member since {PROFILE.date_registered?.slice(0,10) || "—"}</div>
        </div>
        <div className="mp-header-stats">
          <div className="mp-stat-item">
            <span className="mp-stat-val">₱{parseFloat(PROFILE.share_capital||0).toLocaleString()}</span>
            <span className="mp-stat-label">Share Capital</span>
          </div>
          <div className="mp-stat-divider"/>
          <div className="mp-stat-item">
            <span className="mp-stat-val">₱{(parseFloat(PROFILE.share_capital||0)*2).toLocaleString()}</span>
            <span className="mp-stat-label">Max Loanable</span>
          </div>
          <div className="mp-stat-divider"/>
          <div className="mp-stat-item">
            <span className={`mp-status-badge ${(PROFILE.status||"active").toLowerCase()}`}>{PROFILE.status||"Active"}</span>
            <span className="mp-stat-label">Status</span>
          </div>
        </div>
      </div>

      {/* Tabs — only Personal Info and Security */}
      <div className="mp-tabs">
        {[["info","Personal Info"],["security","Security"]].map(([k,l]) => (
          <button key={k} className={`mp-tab ${tab===k?"active":""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* Personal Info tab */}
      {tab === "info" && (
        <div className="mp-card">
          <div className="mp-card-header">
            <div className="mp-card-title">Personal Information</div>
            {!editing ? (
              <button className="mp-edit-btn" onClick={() => setEditing(true)}>✏ Edit</button>
            ) : (
              <div style={{display:"flex",gap:8}}>
                <button className="mp-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
                <button className="mp-save-btn"   onClick={handleSave}>Save Changes</button>
              </div>
            )}
          </div>
          <div className="mp-info-grid">
            {[
              ["Last Name",       PROFILE.last_name  || PM.last_name   || "—"],
              ["First Name",      PROFILE.first_name || PM.first_name  || "—"],
              ["Middle Name",     PM.middle_name     || "—"],
              ["Birthdate",       PM.birth_date      || "—"],
              ["Civil Status",    PM.civil_status    || "—"],
              ["Classification",  PM.classification  || PROFILE.classification || "—"],
              ["Educ. Attainment",PM.educational_attainment || "—"],
            ].map(([k,v]) => (
              <div key={k} className="mp-info-item">
                <span className="mp-info-key">{k}</span>
                <span className="mp-info-val">{v}</span>
              </div>
            ))}

            {/* Editable: Contact */}
            <div className="mp-info-item">
              <span className="mp-info-key">Contact No.</span>
              {editing
                ? <input className="mp-edit-input" type="tel" name="contact" value={form.contact} onChange={handle}/>
                : <span className="mp-info-val">{form.contact || "—"}</span>
              }
            </div>

            {/* Editable: Email */}
            <div className="mp-info-item">
              <span className="mp-info-key">Email</span>
              {editing
                ? <input className="mp-edit-input" type="email" name="email" value={form.email} onChange={handle}/>
                : <span className="mp-info-val">{form.email || "—"}</span>
              }
            </div>

            {/* Editable: Occupation */}
            <div className="mp-info-item">
              <span className="mp-info-key">Occupation</span>
              {editing
                ? <input className="mp-edit-input" name="occupation" value={form.occupation} onChange={handle}/>
                : <span className="mp-info-val">{form.occupation || "—"}</span>
              }
            </div>

            {/* Editable: Address — full width */}
            <div className="mp-info-item mp-full">
              <span className="mp-info-key">Address</span>
              {editing
                ? <input className="mp-edit-input" name="address" value={form.address} onChange={handle}/>
                : <span className="mp-info-val">{form.address || "—"}</span>
              }
            </div>
          </div>
        </div>
      )}

      {/* Security tab */}
      {tab === "security" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>

          {/* Account Info */}
          <div className="mp-card">
            <div className="mp-card-title">Account Information</div>
            <div className="mp-cred-info-card">
              <div className="mp-cred-row">
                <span className="mp-cred-label">Member ID</span>
                <span className="mp-cred-val">{PROFILE.member_id || "—"}</span>
              </div>
              <div className="mp-cred-row">
                <span className="mp-cred-label">Username</span>
                <span className="mp-cred-val">{username}</span>
              </div>
              <div className="mp-cred-row">
                <span className="mp-cred-label">Status</span>
                <span className="mp-cred-val" style={{color:"#69f0ae",fontWeight:700}}>Active</span>
              </div>
            </div>
          </div>

          {/* Change Username */}
          <div className="mp-card">
            <div className="mp-card-title">Change Username</div>
            <div className="mp-card-sub2">Current username: <strong>{username}</strong></div>
            {unSaved && <div className="mp-success-banner">✓ Username changed successfully!</div>}
            <div className="mp-sec-form">
              <div className="mp-sec-field">
                <label className="mp-info-key">New Username</label>
                <input
                  className={`mp-sec-input ${unError?"mp-sec-err":""}`}
                  type="text"
                  placeholder="Enter new username (min. 4 chars)"
                  value={newUsername}
                  onChange={e => { setNewUsername(e.target.value); setUnError(""); }}
                />
                {unError && <div className="mp-sec-error-msg">{unError}</div>}
              </div>
              <button className="mp-save-btn" onClick={handleUsernameChange}>Change Username</button>
            </div>
            <div className="mp-sec-hint">
              💡 Your username is used to log in to the LEAF MPC member portal.
            </div>
          </div>

          {/* Change Password */}
          <div className="mp-card">
            <div className="mp-card-title">Change Password</div>
            <div className="mp-card-sub2">Keep your account secure with a strong password.</div>
            {passSaved && <div className="mp-success-banner">✓ Password changed successfully!</div>}
            {passError && <div className="mp-sec-error-banner">⚠ {passError}</div>}
            <div className="mp-sec-form">
              <div className="mp-sec-field">
                <label className="mp-info-key">Current Password</label>
                <div className="mp-pass-wrap">
                  <input
                    className="mp-sec-input"
                    type={showCurr?"text":"password"}
                    name="current"
                    placeholder="Enter current password"
                    value={passForm.current}
                    onChange={e => { handlePass(e); setPassError(""); }}
                  />
                  <button type="button" className="mp-eye" onClick={() => setShowCurr(s=>!s)}>{showCurr?"🙈":"👁"}</button>
                </div>
              </div>
              <div className="mp-sec-field">
                <label className="mp-info-key">New Password</label>
                <div className="mp-pass-wrap">
                  <input
                    className="mp-sec-input"
                    type={showNew?"text":"password"}
                    name="newPass"
                    placeholder="New password (min. 6 characters)"
                    value={passForm.newPass}
                    onChange={e => { handlePass(e); setPassError(""); }}
                  />
                  <button type="button" className="mp-eye" onClick={() => setShowNew(s=>!s)}>{showNew?"🙈":"👁"}</button>
                </div>
                {passForm.newPass && (
                  <div className="mp-strength-row">
                    {["weak","fair","strong"].map((s,i) => (
                      <div key={s} className={`mp-strength-bar ${passForm.newPass.length >= [1,5,8][i] ? s : ""}`}/>
                    ))}
                    <span className="mp-strength-label">
                      {passForm.newPass.length < 5 ? "Weak" : passForm.newPass.length < 8 ? "Fair" : "Strong"}
                    </span>
                  </div>
                )}
              </div>
              <div className="mp-sec-field">
                <label className="mp-info-key">Confirm New Password</label>
                <div className="mp-pass-wrap">
                  <input
                    className="mp-sec-input"
                    type={showConf?"text":"password"}
                    name="confirm"
                    placeholder="Re-enter new password"
                    value={passForm.confirm}
                    onChange={e => { handlePass(e); setPassError(""); }}
                  />
                  <button type="button" className="mp-eye" onClick={() => setShowConf(s=>!s)}>{showConf?"🙈":"👁"}</button>
                </div>
              </div>
              <button className="mp-save-btn" onClick={handlePasswordChange}>Change Password</button>
            </div>
            <div className="mp-sec-hint">
              💡 If you forgot your current password, please visit the LEAF MPC office for a password reset.
            </div>
          </div>

        </div>
      )}
    </div>
  );
}