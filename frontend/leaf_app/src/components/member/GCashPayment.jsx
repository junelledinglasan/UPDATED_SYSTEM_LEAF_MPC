import { useState } from "react";
import { submitGCashRequestAPI } from "../../api/loans";
import { Smartphone, Copy, CheckCircle, X, AlertCircle, Upload, Image, Trash2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── GCash details ng LEAF MPC cooperative ────────────────────────────────────
// I-update ang mga ito base sa actual GCash account ng LEAF MPC
const GCASH_NUMBER = "0967-006-3500";   // ← palitan ng actual GCash number
const GCASH_NAME   = "LEAF MPC";         // ← pangalan ng GCash account

export default function GCashPayment({ loan, onClose, onSuccess }) {
  const [step,    setStep]    = useState(1); // 1=instructions, 2=form, 3=success
  const [form,       setForm]      = useState({ amount: loan?.monthly_due || "", reference_number: "", note: "" });
  const [errors,     setErrors]    = useState({});
  const [loading,    setLoading]   = useState(false);
  const [result,     setResult]    = useState(null);
  const [copied,     setCopied]    = useState(false);
  const [screenshot, setScreenshot]= useState(null);   // File object
  const [scrPreview, setScrPreview]= useState("");     // preview URL
  const [uploading,  setUploading] = useState(false);

  const copyNumber = () => {
    navigator.clipboard.writeText(GCASH_NUMBER.replace(/-/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScreenshot = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors(p => ({...p, screenshot:"File too large. Max 5MB."}));
      return;
    }
    setScreenshot(file);
    setScrPreview(URL.createObjectURL(file));
    setErrors(p => ({...p, screenshot:""}));
  };

  const uploadScreenshot = async () => {
    if (!screenshot) return "";
    setUploading(true);
    try {
      const ext      = screenshot.name.split(".").pop();
      const filename = `gcash-proofs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from("member-documents")
        .upload(filename, screenshot, { upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("member-documents")
        .getPublicUrl(filename);
      return urlData.publicUrl || "";
    } catch(e) {
      console.error("Upload error:", e);
      return "";
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.amount || parseFloat(form.amount) <= 0)
      e.amount = "Enter the amount you paid.";
    if (parseFloat(form.amount) > parseFloat(loan?.balance || 0))
      e.amount = `Amount exceeds remaining balance of ₱${Number(loan?.balance).toLocaleString()}.`;
    if (!form.reference_number.trim())
      e.reference_number = "GCash reference number is required.";
    if (form.reference_number.trim().length < 10)
      e.reference_number = "Invalid reference number. Must be at least 10 characters.";
    if (!screenshot)
      e.screenshot = "Please upload a screenshot of your GCash payment as proof.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      // Upload screenshot first if provided
      let screenshotUrl = "";
      if (screenshot) {
        screenshotUrl = await uploadScreenshot();
      }

      const res = await submitGCashRequestAPI({
        loan_id:          loan.id,
        amount:           parseFloat(form.amount),
        reference_number: form.reference_number.trim(),
        note:             form.note.trim(),
        screenshot_url:   screenshotUrl,
      });
      setResult(res);
      setStep(3);
      if (onSuccess) onSuccess(res);
    } catch(err) {
      const msg = err.response?.data?.error || "Failed to submit. Please try again.";
      setErrors({ reference_number: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:420,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 8px 32px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#007bff,#0056b3)",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{background:"rgba(255,255,255,0.2)",borderRadius:10,padding:8,display:"flex"}}>
              <Smartphone size={20} color="#fff"/>
            </div>
            <div>
              <div style={{color:"#fff",fontWeight:800,fontSize:15}}>Pay via GCash</div>
              <div style={{color:"rgba(255,255,255,0.8)",fontSize:11}}>Loan: {loan?.loan_id}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:8,padding:6,cursor:"pointer",display:"flex",alignItems:"center"}}>
            <X size={16} color="#fff"/>
          </button>
        </div>

        {/* Step indicator */}
        <div style={{display:"flex",borderBottom:"1px solid #f0f0f0"}}>
          {["Payment Info","Submit Reference","Done"].map((s,i) => (
            <div key={i} style={{flex:1,padding:"10px 8px",textAlign:"center",fontSize:11,fontWeight:600,
              color:step===i+1?"#007bff":step>i+1?"#2e7d32":"#bbb",
              borderBottom:step===i+1?"2px solid #007bff":step>i+1?"2px solid #2e7d32":"2px solid transparent",
            }}>
              {step > i+1 ? <CheckCircle size={12} style={{marginRight:4}}/> : null}
              {s}
            </div>
          ))}
        </div>

        <div style={{padding:"20px",overflowY:"auto",flex:1}}>

          {/* Step 1: Instructions */}
          {step === 1 && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {/* Loan info */}
              <div style={{background:"#f0f7ff",borderRadius:12,padding:"14px 16px",border:"1px solid #cce5ff"}}>
                <div style={{fontSize:12,color:"#555",marginBottom:8,fontWeight:700}}>Loan Details</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[
                    ["Loan ID",     loan?.loan_id],
                    ["Loan Type",   loan?.loan_type],
                    ["Balance",     `₱${Number(loan?.balance||0).toLocaleString()}`],
                    ["Monthly Due", `₱${Number(loan?.monthly_due||0).toLocaleString()}`],
                  ].map(([k,v]) => (
                    <div key={k}>
                      <div style={{fontSize:10,color:"#888",fontWeight:600}}>{k}</div>
                      <div style={{fontSize:13,fontWeight:700,color:"#1565c0"}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GCash number */}
              <div style={{background:"#e8f5e9",borderRadius:12,padding:"16px",border:"1px solid #a5d6a7",textAlign:"center"}}>
                <div style={{fontSize:11,color:"#2e7d32",fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Send GCash Payment To</div>
                <div style={{fontSize:24,fontWeight:800,color:"#1b5e20",letterSpacing:2,marginBottom:4}}>{GCASH_NUMBER}</div>
                <div style={{fontSize:13,color:"#555",marginBottom:12}}>{GCASH_NAME}</div>
                <button onClick={copyNumber} style={{
                  display:"inline-flex",alignItems:"center",gap:6,
                  padding:"8px 16px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:700,
                  background:copied?"#2e7d32":"#fff",color:copied?"#fff":"#2e7d32",
                  border:"2px solid #2e7d32",transition:"all 0.2s",
                }}>
                  {copied ? <><CheckCircle size={13}/> Copied!</> : <><Copy size={13}/> Copy Number</>}
                </button>
              </div>

              {/* Instructions */}
              <div style={{background:"#fffde7",borderRadius:10,padding:"12px 14px",border:"1px solid #ffe082"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#f57f17",marginBottom:8}}>How to Pay:</div>
                {[
                  "Open your GCash app",
                  `Send payment to ${GCASH_NUMBER} (${GCASH_NAME})`,
                  "Enter the amount you want to pay",
                  "Complete the transaction",
                  "Note your 13-digit reference number",
                  "Come back here and click Next to submit your reference number",
                ].map((step, i) => (
                  <div key={i} style={{display:"flex",gap:10,marginBottom:6,fontSize:12,color:"#555"}}>
                    <span style={{width:20,height:20,borderRadius:"50%",background:"#f57f17",color:"#fff",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Submit Reference */}
          {step === 2 && (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{background:"#e8f5e9",borderRadius:10,padding:"10px 14px",border:"1px solid #a5d6a7",fontSize:12,color:"#2e7d32",fontWeight:600}}>
                After sending payment via GCash, enter your reference number below.
              </div>

              {/* Amount */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.5}}>
                  Amount Paid (₱) <span style={{color:"#e53935"}}>*</span>
                </label>
                <div style={{display:"flex",border:`1.5px solid ${errors.amount?"#e53935":"#e0e0e0"}`,borderRadius:10,overflow:"hidden",marginTop:6}}>
                  <span style={{padding:"0 12px",background:"#f5f5f5",color:"#888",display:"flex",alignItems:"center",fontSize:14,fontWeight:700}}>₱</span>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={e => { setForm(p=>({...p,amount:e.target.value})); setErrors(p=>({...p,amount:""})); }}
                    placeholder={`e.g. ${Number(loan?.monthly_due||0).toLocaleString()}`}
                    style={{flex:1,border:"none",outline:"none",padding:"11px 12px",fontSize:14,fontFamily:"inherit"}}
                  />
                </div>
                {errors.amount && <div style={{fontSize:11,color:"#e53935",marginTop:4,display:"flex",alignItems:"center",gap:4}}><AlertCircle size={11}/>{errors.amount}</div>}
              </div>

              {/* Reference Number */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.5}}>
                  GCash Reference Number <span style={{color:"#e53935"}}>*</span>
                </label>
                <input
                  type="text"
                  value={form.reference_number}
                  onChange={e => { setForm(p=>({...p,reference_number:e.target.value})); setErrors(p=>({...p,reference_number:""})); }}
                  placeholder="e.g. 1234567890123"
                  maxLength={20}
                  style={{
                    width:"100%",boxSizing:"border-box",marginTop:6,
                    padding:"11px 14px",fontSize:15,fontFamily:"monospace",fontWeight:700,
                    border:`1.5px solid ${errors.reference_number?"#e53935":"#e0e0e0"}`,
                    borderRadius:10,outline:"none",letterSpacing:2,
                  }}
                />
                {errors.reference_number && <div style={{fontSize:11,color:"#e53935",marginTop:4,display:"flex",alignItems:"center",gap:4}}><AlertCircle size={11}/>{errors.reference_number}</div>}
                <div style={{fontSize:10,color:"#aaa",marginTop:4}}>Found in GCash app → Transaction History → Reference Number</div>
              </div>

              {/* Note (optional) */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.5}}>Note (optional)</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={e => setForm(p=>({...p,note:e.target.value}))}
                  placeholder="e.g. Monthly payment for June"
                  style={{width:"100%",boxSizing:"border-box",marginTop:6,padding:"11px 14px",fontSize:13,border:"1.5px solid #e0e0e0",borderRadius:10,outline:"none",fontFamily:"inherit"}}
                />
              </div>

                            {/* Screenshot upload */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.5}}>
                  Proof of Payment <span style={{color:"#e53935"}}>*</span>
                </label>
                <div style={{marginTop:6}}>
                  {scrPreview ? (
                    <div style={{position:"relative"}}>
                      <img src={scrPreview} alt="GCash screenshot" style={{width:"100%",maxHeight:220,objectFit:"contain",borderRadius:10,border:"2px solid #90caf9",display:"block"}}/>
                      <button onClick={()=>{setScreenshot(null);setScrPreview("");}} style={{position:"absolute",top:6,right:6,background:"#c62828",border:"none",borderRadius:"50%",width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Trash2 size={13} color="#fff"/>
                      </button>
                    </div>
                  ) : (
                    <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,padding:"20px 16px",border:"2px dashed #90caf9",borderRadius:10,background:"#f0f7ff",cursor:"pointer"}}>
                      <Image size={28} color="#1565c0"/>
                      <span style={{fontSize:12,color:"#1565c0",fontWeight:700}}>Click to upload GCash screenshot</span>
                      <span style={{fontSize:10,color:"#aaa"}}>JPG, PNG — max 5MB</span>
                      <input type="file" accept="image/*" onChange={handleScreenshot} style={{display:"none"}}/>
                    </label>
                  )}
                  {errors.screenshot && <div style={{fontSize:11,color:"#e53935",marginTop:4}}>{errors.screenshot}</div>}
                </div>
              </div>

              <div style={{background:"#fff8e1",borderRadius:8,padding:"10px 12px",border:"1px solid #ffe082",fontSize:11,color:"#f57f17"}}>
                ⚠ Make sure your reference number is correct. Admin will verify it against the actual GCash transaction before recording your payment.
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div style={{textAlign:"center",padding:"20px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
              <div style={{width:64,height:64,borderRadius:"50%",background:"#e8f5e9",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <CheckCircle size={32} color="#2e7d32"/>
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:"#1b5e20",marginBottom:6}}>Request Submitted!</div>
                <div style={{fontSize:13,color:"#555",lineHeight:1.6}}>
                  Your GCash payment request has been sent to the admin for verification.
                </div>
              </div>
              <div style={{background:"#f1f8e9",borderRadius:12,padding:"14px 16px",border:"1px solid #c8e6c9",width:"100%",textAlign:"left"}}>
                {[
                  ["Reference No.", result?.reference_number],
                  ["Amount",        `₱${Number(result?.amount||0).toLocaleString()}`],
                  ["Status",        "Pending Verification"],
                ].map(([k,v]) => (
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:12,borderBottom:"1px solid #e8f5e9"}}>
                    <span style={{color:"#888"}}>{k}</span>
                    <span style={{fontWeight:700,color:"#1b5e20",fontFamily:k==="Reference No."?"monospace":"inherit"}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{fontSize:12,color:"#888",lineHeight:1.6}}>
                Admin will verify your payment and record it once confirmed. You will see it in your payment history.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:"14px 20px",borderTop:"1px solid #f0f0f0",display:"flex",gap:10,justifyContent:"flex-end"}}>
          {step === 1 && (<>
            <button onClick={onClose} style={{padding:"9px 18px",border:"1px solid #e0e0e0",borderRadius:9,background:"#fff",color:"#666",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            <button onClick={() => setStep(2)} style={{padding:"9px 20px",background:"#007bff",color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              I've Sent Payment →
            </button>
          </>)}
          {step === 2 && (<>
            <button onClick={() => setStep(1)} style={{padding:"9px 18px",border:"1px solid #e0e0e0",borderRadius:9,background:"#fff",color:"#666",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
            <button onClick={handleSubmit} disabled={loading||uploading} style={{padding:"9px 20px",background:"#2e7d32",color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:loading?0.7:1}}>
              {uploading ? "Uploading..." : loading ? "Submitting..." : "Submit Reference Number"}
            </button>
          </>)}
          {step === 3 && (
            <button onClick={onClose} style={{padding:"9px 20px",background:"#2e7d32",color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}