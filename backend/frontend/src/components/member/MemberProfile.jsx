import { useState } from "react";
import "./MemberProfile.css";

const PROFILE = {
  firstname: "Maria", lastname: "Santos", middlename: "Reyes",
  birthdate: "1988-05-20", gender: "Female", civilStatus: "Married",
  contact: "09171234567", email: "maria.santos@email.com",
  address: "45 Rizal St., Lucena City, Quezon",
  occupation: "Nurse", memberId: "LEAF-100-05",
  memberSince: "2023-01-15", status: "Active",
  shareCapital: 8500, validId: "SSS ID", idNumber: "SS-1234-5678",
  beneficiary: "Roberto Santos", relationship: "Spouse",
  initials: "MS",
};

export default function MemberProfile() {
  const [tab,     setTab]     = useState("info");
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({ contact: PROFILE.contact, email: PROFILE.email, address: PROFILE.address, occupation: PROFILE.occupation });
  const [saved,   setSaved]   = useState(false);

  // Account settings state
  const [username,    setUsername]    = useState("leaf005");
  const [newUsername, setNewUsername] = useState("");
  const [unError,     setUnError]     = useState("");
  const [unSaved,     setUnSaved]     = useState(false);

  const [passForm, setPassForm] = useState({ current:"", newPass:"", confirm:"" });
  const [passError,setPassError]= useState("");
  const [passSaved,setPassSaved]= useState(false);
  const [showCurr, setShowCurr] = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);

  const CURRENT_PASSWORD = "leaf005"; // mock — replace with auth context later

  const handle    = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handlePass= e => setPassForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = () => { setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 2500); };

  const handleUsernameChange = () => {
    if (!newUsername.trim())         { setUnError("Username cannot be empty."); return; }
    if (newUsername.trim().length<4) { setUnError("Username must be at least 4 characters."); return; }
    if (/\s/.test(newUsername))      { setUnError("Username cannot have spaces."); return; }
    setUsername(newUsername.trim());
    setNewUsername("");
    setUnError("");
    setUnSaved(true);
    setTimeout(() => setUnSaved(false), 2500);
  };

  const handlePasswordChange = () => {
    if (passForm.current !== CURRENT_PASSWORD) { setPassError("Current password is incorrect."); return; }
    if (passForm.newPass.length < 6)           { setPassError("New password must be at least 6 characters."); return; }
    if (passForm.newPass !== passForm.confirm)  { setPassError("Passwords do not match."); return; }
    setPassForm({ current:"", newPass:"", confirm:"" });
    setPassError("");
    setPassSaved(true);
    setTimeout(() => setPassSaved(false), 2500);
  };

  return (
    <div className="mp-wrapper">
      {saved && <div className="mp-toast">✓ Profile updated successfully!</div>}

      {/* Header card */}
      <div className="mp-header-card">
        <div className="mp-avatar-large">{PROFILE.initials}</div>
        <div className="mp-header-info">
          <div className="mp-header-name">{PROFILE.firstname} {PROFILE.middlename.charAt(0)}. {PROFILE.lastname}</div>
          <div className="mp-header-id">{PROFILE.memberId}</div>
          <div className="mp-header-since">Member since {PROFILE.memberSince}</div>
        </div>
        <div className="mp-header-stats">
          <div className="mp-stat-item">
            <span className="mp-stat-val">₱{PROFILE.shareCapital.toLocaleString()}</span>
            <span className="mp-stat-label">Share Capital</span>
          </div>
          <div className="mp-stat-divider" />
          <div className="mp-stat-item">
            <span className="mp-stat-val">₱{(PROFILE.shareCapital*3).toLocaleString()}</span>
            <span className="mp-stat-label">Max Loanable</span>
          </div>
          <div className="mp-stat-divider" />
          <div className="mp-stat-item">
            <span className={`mp-status-badge ${PROFILE.status.toLowerCase()}`}>{PROFILE.status}</span>
            <span className="mp-stat-label">Status</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mp-tabs">
        {[["info","Personal Info"],["id","Valid ID"],["beneficiary","Beneficiary"],["security","Security"]].map(([k,l]) => (
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
                <button className="mp-save-btn" onClick={handleSave}>Save Changes</button>
              </div>
            )}
          </div>
          <div className="mp-info-grid">
            {[
              ["Last Name",    PROFILE.lastname,    false],
              ["First Name",   PROFILE.firstname,   false],
              ["Middle Name",  PROFILE.middlename,  false],
              ["Birthdate",    PROFILE.birthdate,   false],
              ["Gender",       PROFILE.gender,      false],
              ["Civil Status", PROFILE.civilStatus, false],
            ].map(([k,v]) => (
              <div key={k} className="mp-info-item">
                <span className="mp-info-key">{k}</span>
                <span className="mp-info-val">{v}</span>
              </div>
            ))}
            {/* Editable fields */}
            {[
              ["Contact No.", "contact", "tel"],
              ["Email",       "email",   "email"],
            ].map(([label, name, type]) => (
              <div key={name} className="mp-info-item">
                <span className="mp-info-key">{label}</span>
                {editing
                  ? <input className="mp-edit-input" type={type} name={name} value={form[name]} onChange={handle} />
                  : <span className="mp-info-val">{form[name]}</span>
                }
              </div>
            ))}
            <div className="mp-info-item mp-full">
              <span className="mp-info-key">Address</span>
              {editing
                ? <input className="mp-edit-input" name="address" value={form.address} onChange={handle} />
                : <span className="mp-info-val">{form.address}</span>
              }
            </div>
            <div className="mp-info-item">
              <span className="mp-info-key">Occupation</span>
              {editing
                ? <input className="mp-edit-input" name="occupation" value={form.occupation} onChange={handle} />
                : <span className="mp-info-val">{form.occupation}</span>
              }
            </div>
          </div>
        </div>
      )}

      {/* Valid ID tab */}
      {tab === "id" && (
        <div className="mp-card">
          <div className="mp-card-title">Valid Identification</div>
          <div className="mp-info-grid">
            <div className="mp-info-item"><span className="mp-info-key">Type of ID</span><span className="mp-info-val">{PROFILE.validId}</span></div>
            <div className="mp-info-item"><span className="mp-info-key">ID Number</span><span className="mp-info-val mono">{PROFILE.idNumber}</span></div>
          </div>
          <div className="mp-id-notice">🔒 To update your valid ID, please visit the office with your original document.</div>
        </div>
      )}

      {/* Beneficiary tab */}
      {tab === "beneficiary" && (
        <div className="mp-card">
          <div className="mp-card-title">Beneficiary / Emergency Contact</div>
          <div className="mp-info-grid">
            <div className="mp-info-item"><span className="mp-info-key">Beneficiary Name</span><span className="mp-info-val">{PROFILE.beneficiary}</span></div>
            <div className="mp-info-item"><span className="mp-info-key">Relationship</span><span className="mp-info-val">{PROFILE.relationship}</span></div>
          </div>
          <div className="mp-id-notice">To update your beneficiary information, please visit the LEAF MPC office.</div>
        </div>
      )}

      {/* Security tab */}
      {tab === "security" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>

          {/* Current account info */}
          <div className="mp-card">
            <div className="mp-card-title">Account Information</div>
            <div className="mp-cred-info-card">
              <div className="mp-cred-row">
                <span className="mp-cred-label">Member ID</span>
                <span className="mp-cred-val">{PROFILE.memberId}</span>
              </div>
              <div className="mp-cred-row">
                <span className="mp-cred-label">Username</span>
                <span className="mp-cred-val">{username}</span>
              </div>
              <div className="mp-cred-row">
                <span className="mp-cred-label">Last Login</span>
                <span className="mp-cred-val">2026-03-21 12:24</span>
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
            <div className="mp-card-sub2">Your current username: <strong>{username}</strong></div>

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
              <button className="mp-save-btn" onClick={handleUsernameChange}>
                Change Username
              </button>
            </div>
            <div className="mp-sec-hint">
              💡 Your username is used to log in to the LEAF MPC member portal. Choose something easy to remember.
            </div>
          </div>

          {/* Change Password */}
          <div className="mp-card">
            <div className="mp-card-title">Change Password</div>
            <div className="mp-card-sub2">Keep your account secure by using a strong password.</div>

            {passSaved && <div className="mp-success-banner">✓ Password changed successfully!</div>}
            {passError && <div className="mp-sec-error-banner">⚠ {passError}</div>}

            <div className="mp-sec-form">
              <div className="mp-sec-field">
                <label className="mp-info-key">Current Password</label>
                <div className="mp-pass-wrap">
                  <input
                    className={`mp-sec-input ${passError&&passError.includes("Current")?"mp-sec-err":""}`}
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
                    className={`mp-sec-input ${passError&&passError.includes("6 char")?"mp-sec-err":""}`}
                    type={showNew?"text":"password"}
                    name="newPass"
                    placeholder="New password (min. 6 characters)"
                    value={passForm.newPass}
                    onChange={e => { handlePass(e); setPassError(""); }}
                  />
                  <button type="button" className="mp-eye" onClick={() => setShowNew(s=>!s)}>{showNew?"🙈":"👁"}</button>
                </div>
                {/* Strength indicator */}
                {passForm.newPass && (
                  <div className="mp-strength-row">
                    {["Weak","Fair","Strong"].map((s,i) => (
                      <div key={s} className={`mp-strength-bar ${passForm.newPass.length >= [1,5,8][i] ? ["weak","fair","strong"][i] : ""}`}/>
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
                    className={`mp-sec-input ${passError&&passError.includes("match")?"mp-sec-err":""}`}
                    type={showConf?"text":"password"}
                    name="confirm"
                    placeholder="Re-enter new password"
                    value={passForm.confirm}
                    onChange={e => { handlePass(e); setPassError(""); }}
                  />
                  <button type="button" className="mp-eye" onClick={() => setShowConf(s=>!s)}>{showConf?"🙈":"👁"}</button>
                </div>
              </div>
              <button className="mp-save-btn" onClick={handlePasswordChange}>
                Change Password
              </button>
            </div>
            <div className="mp-sec-hint">
              💡 If you forgot your current password, please visit the LEAF MPC office for a password reset with valid ID.
            </div>
          </div>

        </div>
      )}
    </div>
  );
}