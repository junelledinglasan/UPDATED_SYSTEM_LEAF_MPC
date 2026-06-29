import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { submitApplicationAPI, getMyOnlineAppAPI } from "../../api/members";
import { GraduationCap, UserRound, BriefcaseBusiness, Upload, X, CheckCircle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import "./ApplyMembership.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://vmicqkrguocawwntvizm.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ─── Form Field ───────────────────────────────────────────────────────────────
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
        <input className={`am-input ${error ? "am-input-err" : ""}`} type={type} name={name} value={value} onChange={onChange}/>
      )}
      {error && <div className="am-field-err">{error}</div>}
    </div>
  );
}

// ─── ID Upload Field ──────────────────────────────────────────────────────────
function IDUploadField({ label, required, file, preview, onSelect, onClear, error }) {
  return (
    <div className="am-field am-full">
      <label className="am-label">{label}{required && <span className="am-req"> *</span>}</label>
      {preview ? (
        <div style={{position:"relative",display:"inline-block",marginTop:6,width:"100%"}}>
          <img
            src={preview} alt={label}
            style={{width:"100%",maxWidth:320,borderRadius:10,border:"2px solid #a5d6a7",objectFit:"cover",maxHeight:180}}
          />
          <button type="button" onClick={onClear} style={{
            position:"absolute",top:6,right:6,background:"#c62828",color:"#fff",
            border:"none",borderRadius:"50%",width:26,height:26,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",
          }}><X size={13}/></button>
          <div style={{marginTop:6,fontSize:11,color:"#2e7d32",display:"flex",alignItems:"center",gap:4}}>
            <CheckCircle size={12}/> {file?.name}
          </div>
        </div>
      ) : (
        <label style={{
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          border:`2px dashed ${error?"#e53935":"#c8e6c9"}`,borderRadius:10,padding:"28px 16px",
          cursor:"pointer",background:error?"#fff5f5":"#f9fef9",marginTop:6,gap:8,transition:"all 0.2s",
        }}>
          <Upload size={30} color={error?"#e53935":"#2e7d32"}/>
          <div style={{fontSize:13,fontWeight:600,color:error?"#e53935":"#2e7d32"}}>Click to upload</div>
          <div style={{fontSize:11,color:"#aaa"}}>JPG, PNG, WEBP · Max 5MB</div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{display:"none"}}
            onChange={e => { if(e.target.files[0]) onSelect(e.target.files[0]); }}
          />
        </label>
      )}
      {error && <div className="am-field-err">{error}</div>}
    </div>
  );
}

const CLASS_OPTIONS = [
  { key: "Student",  icon: <GraduationCap     size={40} strokeWidth={1.5} color="#2e7d32"/>, label: "Student"  },
  { key: "Senior",   icon: <UserRound         size={40} strokeWidth={1.5} color="#2e7d32"/>, label: "Senior"   },
  { key: "Employed", icon: <BriefcaseBusiness size={40} strokeWidth={1.5} color="#2e7d32"/>, label: "Employed" },
];

const TABS = [
  { key: "personal",       label: "👤 Personal Info"  },
  { key: "classification", label: "📋 Classification" },
  { key: "verification",   label: "📎 Verification"   },
];

export default function ApplyMembership() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [tab,         setTab]        = useState("personal");
  const [errors,      setErrors]     = useState({});
  const [done,        setDone]       = useState(false);
  const [loading,     setLoading]    = useState(false);
  const [existingApp, setExistingApp]= useState(null);
  const [checkingApp, setCheckingApp]= useState(true);
  const [resubmit,    setResubmit]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  // ── ID upload states ──
  const [idFrontFile,    setIdFrontFile]    = useState(null);
  const [idBackFile,     setIdBackFile]     = useState(null);
  const [idFrontPreview, setIdFrontPreview] = useState(null);
  const [idBackPreview,  setIdBackPreview]  = useState(null);

  const [form, setForm] = useState({
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
    classification:         "Employed",
    school_name:            "",
    year_level:             "",
    allowance:              "",
    pension_income:         "",
    job_type:               "Employed",
    monthly_income:         "",
  });

  // ── Check existing application ──
  useEffect(() => {
    getMyOnlineAppAPI()
      .then(app => setExistingApp(app))
      .catch(() => setExistingApp(null))
      .finally(() => setCheckingApp(false));
  }, []);

  const handle = e => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [e.target.name]: val }));
    setErrors(p => ({ ...p, [e.target.name]: "" }));
  };

  const handleIdSelect = (side, file) => {
    if (file.size > 5 * 1024 * 1024) {
      setErrors(p => ({ ...p, [`id_${side}`]: "File too large. Maximum is 5MB." }));
      return;
    }
    const preview = URL.createObjectURL(file);
    if (side === "front") { setIdFrontFile(file); setIdFrontPreview(preview); }
    else                  { setIdBackFile(file);  setIdBackPreview(preview);  }
    setErrors(p => ({ ...p, [`id_${side}`]: "" }));
  };

  const handleIdClear = side => {
    if (side === "front") { setIdFrontFile(null); setIdFrontPreview(null); }
    else                  { setIdBackFile(null);  setIdBackPreview(null);  }
  };

  // ── Upload file to Supabase Storage ──
  const uploadToSupabase = async (file, path) => {
    if (!supabase) throw new Error("Supabase is not configured. Please add VITE_SUPABASE_ANON_KEY to your .env file.");
    const { error } = await supabase.storage
      .from("member-documents")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data: urlData } = supabase.storage.from("member-documents").getPublicUrl(path);
    return urlData.publicUrl;
  };

  // ── Validate all fields ──
  const validate = () => {
    const e = {};
    // Personal Info
    if (!form.first_name.trim())     e.first_name     = "Required";
    if (!form.last_name.trim())      e.last_name      = "Required";
    if (!form.birth_date)            e.birth_date     = "Required";
    if (!form.contact_number.trim()) e.contact_number = "Required";
    if (!form.address.trim())        e.address        = "Required";
    if (!form.occupation.trim())     e.occupation     = "Required";
    // Classification
    if (form.classification === "Student") {
      if (!form.school_name.trim()) e.school_name = "Required";
      if (!form.year_level.trim())  e.year_level  = "Required";
    }
    // Verification — ID is required
    if (!idFrontFile) e.id_front = "Please upload the front side of your Valid ID.";
    if (!idBackFile)  e.id_back  = "Please upload the back side of your Valid ID.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      const personalFields = ["first_name","last_name","birth_date","contact_number","address","occupation"];
      const classFields    = ["school_name","year_level"];
      const idFields       = ["id_front","id_back"];
      if (personalFields.some(f => e[f])) { setTab("personal");       return; }
      if (classFields.some(f => e[f]))    { setTab("classification");  return; }
      if (idFields.some(f => e[f]))       { setTab("verification");    return; }
      return;
    }

    // ── Check if Supabase is configured before proceeding ──
    if (!supabase) {
      setErrors({ id_front: "Supabase is not configured. Please add VITE_SUPABASE_ANON_KEY to your .env file and restart the dev server." });
      setTab("verification");
      return;
    }

    setLoading(true);
    try {
      const ts       = Date.now();
      const userId   = user?.id || "unknown";

      // ── Upload front ID ──
      setUploadProgress("Uploading Valid ID (front)...");
      const idFrontUrl = await uploadToSupabase(
        idFrontFile,
        `valid-ids/${userId}_${ts}_front.${idFrontFile.name.split(".").pop()}`
      );

      // ── Upload back ID ──
      setUploadProgress("Uploading Valid ID (back)...");
      const idBackUrl = await uploadToSupabase(
        idBackFile,
        `valid-ids/${userId}_${ts}_back.${idBackFile.name.split(".").pop()}`
      );

      // ── Submit application ──
      setUploadProgress("Submitting application...");
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
        id_front_url:           idFrontUrl,
        id_back_url:            idBackUrl,
      });

      setDone(true);

    } catch(err) {
      const msg = err.response?.data?.error
        || err.response?.data?.detail
        || err.message
        || "Failed to submit. Please try again.";

      // ── Show error on correct tab ──
      if (msg.toLowerCase().includes("supabase") || msg.toLowerCase().includes("upload")) {
        setErrors({ id_front: msg });
        setTab("verification");
      } else {
        setErrors({ first_name: msg });
        setTab("personal");
      }
    } finally {
      setLoading(false);
      setUploadProgress("");
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (checkingApp) return (
    <div className="am-wrap">
      <div className="am-card" style={{textAlign:"center",padding:"60px 20px",color:"#aaa"}}>
        Checking application status...
      </div>
    </div>
  );

  // ── Success screen ─────────────────────────────────────────────────────────
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
          <button className="am-btn-primary" onClick={() => navigate("/member/notifications")}>Go to Notifications</button>
          <button className="am-btn-secondary" onClick={() => navigate("/member/profile")}>View My Profile</button>
        </div>
      </div>
    </div>
  );

  // ── Existing application guard ─────────────────────────────────────────────
  if (existingApp && !resubmit) {
    const status     = existingApp.application_status;
    const isPending  = status === "Pending";
    const isApproved = status === "Approved";
    const isRejected = status === "Rejected";
    return (
      <div className="am-wrap">
        <div className="am-card">
          <div className="am-card-header">
            <div className="am-title">Membership Application</div>
          </div>
          <div style={{padding:"24px 28px",display:"flex",flexDirection:"column",gap:20}}>
            <div style={{
              display:"flex",alignItems:"center",gap:16,padding:"20px",
              borderRadius:12,border:"1.5px solid",
              background:  isPending?"#fff8e1":isApproved?"#e8f5e9":"#ffebee",
              borderColor: isPending?"#ffe082":isApproved?"#a5d6a7":"#ef9a9a",
            }}>
              <div style={{fontSize:40}}>{isPending?"⏳":isApproved?"✅":"❌"}</div>
              <div>
                <div style={{fontWeight:700,fontSize:16,color:isPending?"#f57c00":isApproved?"#1b5e20":"#c62828"}}>
                  {isPending?"Application Under Review":isApproved?"Application Approved!":"Application Rejected"}
                </div>
                <div style={{fontSize:12,color:"#888",marginTop:4}}>
                  Application ID: <strong>{existingApp.app_id}</strong> · Submitted {existingApp.created_at?.slice(0,10)}
                </div>
                {isRejected && existingApp.reject_reason && (
                  <div style={{marginTop:8,fontSize:12,color:"#c62828",fontStyle:"italic"}}>
                    Reason: {existingApp.reject_reason}
                  </div>
                )}
                {isPending && (
                  <div style={{marginTop:8,fontSize:12,color:"#555"}}>
                    Please wait for the admin to review your application.
                  </div>
                )}
                {isApproved && (
                  <div style={{marginTop:8,fontSize:12,color:"#555"}}>
                    Please visit the LEAF MPC office to complete the process.
                  </div>
                )}
              </div>
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <button className="am-btn-secondary" onClick={() => navigate("/member/profile")}>View My Profile</button>
              {isRejected && (
                <button className="am-btn-primary" onClick={() => setResubmit(true)}>Re-apply for Membership</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Application Form ───────────────────────────────────────────────────────
  return (
    <div className="am-wrap">
      <div className="am-card">

        <div className="am-card-header">
          <div className="am-title">
            {resubmit ? "Re-apply for Membership" : "Apply for Official Membership"}
          </div>
          <div className="am-sub">
            Fill out the form below. Your application will be reviewed by the admin.
          </div>
        </div>

        {resubmit && (
          <div style={{margin:"0 28px",padding:"10px 14px",background:"#fff8e1",border:"1px solid #ffe082",borderRadius:8,fontSize:12,color:"#f57c00",fontWeight:600}}>
            ⚠ You are re-applying after a previous rejection. Make sure to correct the issues before submitting.
          </div>
        )}

        <div className="am-info-notice">
          <div className="am-notice-icon">ℹ️</div>
          <div>
            Make sure all information is accurate and complete. A valid ID is required for verification.
            After submitting, the admin or staff will review and contact you.
          </div>
        </div>

        {/* ── Tab nav ── */}
        <div className="am-tabs">
          {TABS.map((t, i) => (
            <button key={t.key} className={`am-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
              <span className="am-tab-num">{i + 1}</span> {t.label}
            </button>
          ))}
        </div>

        <div className="am-form-body">

          {/* ── Tab 1: Personal Info ── */}
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
              <FormField name="income"                 label="Monthly Income (₱)"    type="number" value={form.income}             onChange={handle}/>
              <FormField name="email"                  label="Email"                  type="email"  value={form.email}             onChange={handle}/>
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

          {/* ── Tab 2: Classification ── */}
          {tab === "classification" && (
            <div className="am-form-grid">
              <div className="am-field am-full">
                <label className="am-label">Member Classification <span className="am-req">*</span></label>
                <div className="am-class-options">
                  {CLASS_OPTIONS.map(c => (
                    <div
                      key={c.key}
                      className={`am-class-card ${form.classification === c.key ? "selected" : ""}`}
                      onClick={() => setForm(p => ({ ...p, classification: c.key }))}
                    >
                      <div className="am-class-icon">{c.icon}</div>
                      <div className="am-class-name">{c.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {form.classification === "Student" && (<>
                <FormField name="school_name" label="School Name" required value={form.school_name} onChange={handle} error={errors.school_name}/>
                <FormField name="year_level"  label="Year Level"  required value={form.year_level}  onChange={handle} error={errors.year_level}
                  options={["Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12","1st Year","2nd Year","3rd Year","4th Year","5th Year","Graduate"]}/>
                <FormField name="allowance" label="Monthly Allowance (₱)" type="number" value={form.allowance} onChange={handle}/>
              </>)}
              {form.classification === "Senior" && (<>
                <FormField name="educational_attainment" label="Educational Attainment"
                  options={["Elementary","High School","Vocational","College","Post Graduate"]}
                  value={form.educational_attainment} onChange={handle}/>
                <FormField name="pension_income" label="Monthly Pension Income (₱)" type="number" value={form.pension_income} onChange={handle}/>
              </>)}
              {form.classification === "Employed" && (<>
                <FormField name="occupation"     label="Occupation/Job Title" value={form.occupation}     onChange={handle}/>
                <FormField name="job_type"       label="Employment Type"
                  options={["Employed","Self-Employed","Business","Freelance","Other"]}
                  value={form.job_type} onChange={handle}/>
                <FormField name="monthly_income" label="Monthly Income (₱)" type="number" value={form.monthly_income} onChange={handle}/>
              </>)}
            </div>
          )}

          {/* ── Tab 3: Verification ── */}
          {tab === "verification" && (
            <div className="am-form-grid">

              {/* Info box */}
              <div className="am-field am-full" style={{background:"#e8f5e9",borderRadius:10,padding:"14px 16px",border:"1px solid #c8e6c9"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#1b5e20",marginBottom:6}}>📎 Valid ID Verification (Required)</div>
                <div style={{fontSize:12,color:"#555",lineHeight:1.7}}>
                  Upload a clear photo of your <strong>Valid ID — both front and back sides</strong>.<br/>
                  Accepted: PhilSys · Driver's License · Passport · SSS · GSIS · PRC · Voter's ID · Postal ID · Senior Citizen's ID · School ID
                </div>
              </div>

              {/* Supabase not configured warning */}
              {!supabase && (
                <div className="am-field am-full" style={{background:"#ffebee",borderRadius:8,padding:"12px 14px",border:"1px solid #ef9a9a",fontSize:12,color:"#c62828",fontWeight:600}}>
                  ⚠ ID upload is not yet configured. Please add <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> file and restart the dev server.
                </div>
              )}

              <IDUploadField
                label="Valid ID — Front Side"
                required
                file={idFrontFile}
                preview={idFrontPreview}
                onSelect={f => handleIdSelect("front", f)}
                onClear={() => handleIdClear("front")}
                error={errors.id_front}
              />

              <IDUploadField
                label="Valid ID — Back Side"
                required
                file={idBackFile}
                preview={idBackPreview}
                onSelect={f => handleIdSelect("back", f)}
                onClear={() => handleIdClear("back")}
                error={errors.id_back}
              />

              <div className="am-field am-full" style={{background:"#fff8e1",borderRadius:8,padding:"10px 14px",border:"1px solid #ffe082",fontSize:11,color:"#f57c00"}}>
                ⚠ Make sure the ID photo is clear and fully readable. Blurry or incomplete images may cause your application to be rejected.
              </div>
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="am-form-footer">
          {uploadProgress && (
            <div style={{fontSize:12,color:"#2e7d32",fontWeight:600,marginBottom:8,textAlign:"center",padding:"8px",background:"#e8f5e9",borderRadius:8}}>
              ⏳ {uploadProgress}
            </div>
          )}
          <div className="am-tab-nav">
            {tab !== "personal" && (
              <button className="am-btn-back" onClick={() => {
                const keys = TABS.map(t => t.key);
                setTab(keys[keys.indexOf(tab) - 1]);
              }}>← Previous</button>
            )}
            {tab !== "verification" ? (
              <button className="am-btn-next" onClick={() => {
                const keys = TABS.map(t => t.key);
                setTab(keys[keys.indexOf(tab) + 1]);
              }}>Next →</button>
            ) : (
              <button
                className={`am-btn-submit ${loading ? "loading" : ""}`}
                onClick={handleSubmit}
                disabled={loading || !supabase}
                title={!supabase ? "Supabase not configured" : ""}
              >
                {loading ? <span className="am-spinner"/> : resubmit ? "Re-submit Application" : "Submit Application"}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}