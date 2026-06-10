import { useState, useEffect, useMemo } from "react";
import { getMembersAPI, getMemberStatsAPI, getMemberAPI, updateMemberAPI, deleteMemberAPI, getApplicationsAPI, updateApplicationStatusAPI, convertToMemberAPI, registerMemberAPI, getMemberSavingsAPI } from "../../api/members";
import { Users, Clock, Eye, Pencil, Trash2, Search, ArrowUpDown } from "lucide-react";
import api from "../../api/axiosInstance";
import "./ManageMember.css";

const STATUS_OPTIONS = ["All","Active","Inactive","Suspended"];
const ROWS_PER_PAGE  = 10;

const SORT_OPTIONS = [
  { value: "newest",    label: "⬇ Newest First"   },
  { value: "oldest",    label: "⬆ Oldest First"    },
  { value: "az",        label: "🔤 Name A → Z"     },
  { value: "za",        label: "🔤 Name Z → A"     },
];

async function getMemberFinancialSummary(memberId) {
  const res = await api.get(`/members/${memberId}/financial-summary/`);
  return res.data;
}

// ─── Helper: compute age from birth_date string ───────────────────────────────
function computeAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const bd    = new Date(birthDate);
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age;
}

// ─── Age Group Chart ──────────────────────────────────────────────────────────
function AgeGroupChart({ members }) {
  const groups = useMemo(() => {
    const buckets = {
      "18–25": 0, "26–35": 0, "36–45": 0,
      "46–55": 0, "56–65": 0, "65+": 0, "Unknown": 0,
    };
    members.forEach(m => {
      const age = computeAge(m.birth_date);
      if (age === null || age < 18) { buckets["Unknown"]++; return; }
      if      (age <= 25) buckets["18–25"]++;
      else if (age <= 35) buckets["26–35"]++;
      else if (age <= 45) buckets["36–45"]++;
      else if (age <= 55) buckets["46–55"]++;
      else if (age <= 65) buckets["56–65"]++;
      else                buckets["65+"]++;
    });
    return buckets;
  }, [members]);

  const max    = Math.max(...Object.values(groups), 1);
  const colors = {
    "18–25":"#42a5f5","26–35":"#66bb6a","36–45":"#ffa726",
    "46–55":"#ab47bc","56–65":"#ef5350","65+":"#26c6da","Unknown":"#bdbdbd",
  };
  const total = members.length;

  return (
    <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8f5e9", padding:"16px 18px", marginBottom:16 }}>
      <div style={{fontSize:13,fontWeight:700,color:"#1b5e20",marginBottom:14}}>👥 Members by Age Group</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {Object.entries(groups).map(([label, count]) => (
          <div key={label} style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:52,fontSize:11,fontWeight:600,color:"#555",textAlign:"right",flexShrink:0}}>{label}</div>
            <div style={{flex:1,background:"#f5f5f5",borderRadius:20,overflow:"hidden",height:18}}>
              <div style={{ width: count === 0 ? "0%" : `${Math.max((count/max)*100, 4)}%`, background: colors[label], height:"100%", borderRadius:20, transition:"width 0.6s ease" }}/>
            </div>
            <div style={{width:40,fontSize:11,fontWeight:700,color:"#333",flexShrink:0}}>
              {count}
              {count > 0 && <span style={{fontSize:9,color:"#aaa",fontWeight:400,marginLeft:2}}>({Math.round((count/total)*100)}%)</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Standalone Field components ──────────────────────────────────────────────
function ModalField({ label, name, type="text", options=null, full=false, mode, form, handle }) {
  return (
    <div className={`modal-field${full?" full":""}`}>
      <div className="modal-field-label">{label}</div>
      {mode==="view" ? (
        <div className="modal-field-value">{form[name] || "—"}</div>
      ) : options ? (
        <select className="modal-input" name={name} value={form[name]||""} onChange={handle}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input className="modal-input" type={type} name={name} value={form[name]||""} onChange={handle} />
      )}
    </div>
  );
}

function RegisterField({ label, name, type="text", options=null, full=false, form, handle, errors }) {
  const required = ["first_name","last_name","birth_date","contact_number","address"].includes(name);
  return (
    <div className={`modal-field${full?" full":""}`}>
      <div className="modal-field-label">
        {label}{required && <span style={{color:"#e53935"}}> *</span>}
      </div>
      {options ? (
        <select className="modal-input" name={name} value={form[name]||""} onChange={handle}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : type === "checkbox" ? (
        <label style={{display:"flex",alignItems:"center",gap:8,marginTop:4,fontSize:13}}>
          <input type="checkbox" name={name} checked={!!form[name]} onChange={handle}/>
          <span>Yes</span>
        </label>
      ) : (
        <input className={`modal-input${errors?.[name]?" err":""}`} type={type} name={name} value={form[name]||""} onChange={handle}/>
      )}
      {errors?.[name] && <div style={{fontSize:11,color:"#e53935",marginTop:2}}>{errors[name]}</div>}
    </div>
  );
}

// ─── Financial Summary ────────────────────────────────────────────────────────
function FinancialSummary({ memberId }) {
  const [summary,      setSummary]      = useState(null);
  const [savings,      setSavings]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [historyTab,   setHistoryTab]   = useState("savings");
  const [activeLoanId, setActiveLoanId] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      getMemberFinancialSummary(memberId),
      getMemberSavingsAPI(memberId),
    ]).then(([finResult, savResult]) => {
      if (finResult.status === "fulfilled") setSummary(finResult.value);
      if (savResult.status === "fulfilled") setSavings(savResult.value);
    }).finally(() => setLoading(false));
  }, [memberId]);

  if (loading) return <div style={{textAlign:"center",padding:"20px",color:"#888",fontSize:13}}>Loading financial data...</div>;
  if (!summary) return null;

  const statusColor = { Active:"#2e7d32", Overdue:"#c62828", Completed:"#1565c0", "For Review":"#e65100", Approved:"#558b2f", Declined:"#757575" };
  const statusBg    = { Active:"#e8f5e9", Overdue:"#ffebee", Completed:"#e3f2fd", "For Review":"#fff8e1", Approved:"#f1f8e9", Declined:"#f5f5f5" };

  const savingsBalance = savings?.balance        || 0;
  const totalDeposit   = savings?.total_deposit  || 0;
  const totalWithdraw  = savings?.total_withdraw || 0;
  const savingsTxList  = savings?.transactions   || [];

  return (
    <div style={{marginTop:16}}>
      <div className="mm-view-section-title">Financial Overview</div>

      {/* KPI Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:16}}>
        <div style={{background:"#e8f5e9",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
          <div style={{fontSize:11,color:"#558b2f",fontWeight:600,marginBottom:4}}>💰 Share Capital</div>
          <div style={{fontSize:18,fontWeight:800,color:"#1b5e20"}}>₱{Number(summary.share_capital).toLocaleString()}</div>
          <div style={{fontSize:10,color:"#888",marginTop:2}}>Paid: ₱{Number(summary.amount_paid||summary.share_capital/2).toLocaleString()} · Max Loanable: ₱{Number(summary.share_capital).toLocaleString()}</div>
        </div>
        <div style={{background:"#e3f2fd",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
          <div style={{fontSize:11,color:"#1565c0",fontWeight:600,marginBottom:4}}>📋 Active Loans</div>
          <div style={{fontSize:18,fontWeight:800,color:"#0d47a1"}}>{summary.active_loans}</div>
          <div style={{fontSize:10,color:"#888",marginTop:2}}>Total: {summary.total_loans} loan{summary.total_loans!==1?"s":""}</div>
        </div>
        <div style={{background:"#f3e5f5",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
          <div style={{fontSize:11,color:"#6a1b9a",fontWeight:600,marginBottom:4}}>💳 Total Paid</div>
          <div style={{fontSize:18,fontWeight:800,color:"#4a148c"}}>₱{Number(summary.total_paid).toLocaleString()}</div>
          <div style={{fontSize:10,color:"#888",marginTop:2}}>Remaining: ₱{Number(summary.total_balance).toLocaleString()}</div>
        </div>
        <div style={{background:"#fff8e1",borderRadius:10,padding:"12px 14px",textAlign:"center",border:"1px solid #ffe082"}}>
          <div style={{fontSize:11,color:"#f57f17",fontWeight:600,marginBottom:4}}>🏦 Savings Balance</div>
          <div style={{fontSize:18,fontWeight:800,color:"#e65100"}}>₱{Number(savingsBalance).toLocaleString()}</div>
          <div style={{fontSize:10,color:"#888",marginTop:2}}>↑ ₱{Number(totalDeposit).toLocaleString()} · ↓ ₱{Number(totalWithdraw).toLocaleString()}</div>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{display:"flex",borderBottom:"2px solid #f0f0f0",marginBottom:12}}>
        {[
          {key:"savings", label:"🏦 Savings History", count:savingsTxList.length},
          {key:"loans",   label:"📋 Loan History",    count:summary.loans.length},
        ].map(t => (
          <button key={t.key} onClick={() => setHistoryTab(t.key)} style={{
            flex:1, padding:"8px 6px", fontSize:12, fontWeight:600, cursor:"pointer",
            border:"none", background:"none",
            color:historyTab===t.key?"#2e7d32":"#aaa",
            borderBottom:historyTab===t.key?"2px solid #2e7d32":"2px solid transparent",
            marginBottom:-2, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          }}>
            {t.label}
            <span style={{background:historyTab===t.key?"#e8f5e9":"#f0f0f0",color:historyTab===t.key?"#2e7d32":"#aaa",borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Savings History ─────────────────────────────────────────────────── */}
      {historyTab==="savings" && (savingsTxList.length > 0 ? (
        <div style={{borderRadius:8,overflow:"hidden",border:"1px solid #ffe082"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#fffde7"}}>
              <th style={{padding:"7px 10px",textAlign:"left",fontWeight:600,color:"#777",fontSize:10}}>Date</th>
              <th style={{padding:"7px 10px",textAlign:"left",fontWeight:600,color:"#777",fontSize:10}}>Type</th>
              <th style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:"#777",fontSize:10}}>Amount</th>
              <th style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:"#777",fontSize:10}}>Balance After</th>
              <th style={{padding:"7px 10px",textAlign:"left",fontWeight:600,color:"#777",fontSize:10}}>Note</th>
            </tr></thead>
            <tbody>{savingsTxList.map((tx,idx) => (
              <tr key={tx.id} style={{background:idx%2===0?"#fff":"#fffde7",borderTop:"1px solid #f5f5f5"}}>
                <td style={{padding:"7px 10px",color:"#888",fontSize:10}}>{tx.created_at?.split("T")[0]}</td>
                <td style={{padding:"7px 10px"}}>
                  <span style={{background:tx.transaction_type==="Deposit"?"#e8f5e9":"#fce4ec",color:tx.transaction_type==="Deposit"?"#2e7d32":"#c62828",padding:"2px 7px",borderRadius:20,fontSize:10,fontWeight:700}}>
                    {tx.transaction_type==="Deposit"?"💰":"💸"} {tx.transaction_type}
                  </span>
                </td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:tx.transaction_type==="Deposit"?"#2e7d32":"#c62828"}}>
                  {tx.transaction_type==="Deposit"?"+":"−"}₱{Number(tx.amount).toLocaleString()}
                </td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:"#333"}}>₱{Number(tx.balance_after).toLocaleString()}</td>
                <td style={{padding:"7px 10px",color:"#888",fontSize:10}}>{tx.note||"—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <div style={{textAlign:"center",padding:"20px",color:"#bbb",fontSize:12,background:"#fffde7",borderRadius:8,border:"1px solid #ffe082"}}>No savings transactions yet.</div>
      ))}

      {/* ── Loan History — clickable rows with expandable payment history ───── */}
      {historyTab==="loans" && (summary.loans.length > 0 ? (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {summary.loans.map((loan, idx) => {
            const isExpanded    = activeLoanId === loan.loan_id;
            const isPaid        = loan.balance === 0 || loan.status === "Completed";
            const displayStatus = isPaid ? "Paid" : loan.status;
            const sColor        = isPaid ? "#1565c0" : (statusColor[loan.status] || "#757575");
            const sBg           = isPaid ? "#e3f2fd"  : (statusBg[loan.status]   || "#f5f5f5");

            return (
              <div key={loan.loan_id} style={{ borderRadius:10, border:`1px solid ${isExpanded?"#a5d6a7":"#e0e0e0"}`, overflow:"hidden", transition:"border 0.2s" }}>

                {/* Loan row — click to expand/collapse */}
                <div
                  onClick={() => setActiveLoanId(isExpanded ? null : loan.loan_id)}
                  style={{
                    display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr auto",
                    padding:"10px 14px", cursor:"pointer", gap:8,
                    background: isExpanded ? "#f1f8e9" : idx%2===0 ? "#fff" : "#fafafa",
                    alignItems:"center",
                  }}
                >
                  <div>
                    <div style={{fontFamily:"monospace",color:"#1b5e20",fontWeight:700,fontSize:12}}>{loan.loan_id}</div>
                    <div style={{fontSize:10,color:"#888",marginTop:1}}>{loan.loan_type}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#999"}}>Amount</div>
                    <div style={{fontWeight:700,fontSize:13}}>₱{Number(loan.amount).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#999"}}>Balance</div>
                    <div style={{fontWeight:700,fontSize:13,color:isPaid?"#2e7d32":"#c62828"}}>
                      {isPaid ? "₱0 ✓" : `₱${Number(loan.balance).toLocaleString()}`}
                    </div>
                  </div>
                  <div>
                    <span style={{background:sBg,color:sColor,border:`1px solid ${sColor}33`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>
                      {displayStatus}
                    </span>
                  </div>
                  <div style={{fontSize:13,color:"#bbb",userSelect:"none",paddingRight:4}}>
                    {isExpanded ? "▲" : "▼"}
                  </div>
                </div>

                {/* Expanded payment history */}
                {isExpanded && (
                  <div style={{borderTop:"1px solid #e8f5e9",background:"#f9fef9"}}>
                    <div style={{padding:"8px 14px 4px",fontSize:11,fontWeight:700,color:"#2e7d32",display:"flex",alignItems:"center",gap:8}}>
                      💳 Payment History — {loan.loan_id}
                      <span style={{fontWeight:400,color:"#aaa",fontSize:10}}>
                        ({loan.payments?.length || 0} payment{loan.payments?.length !== 1 ? "s" : ""})
                      </span>
                    </div>

                    {!loan.payments || loan.payments.length === 0 ? (
                      <div style={{padding:"12px 14px",color:"#bbb",fontSize:12,textAlign:"center"}}>No payments recorded yet.</div>
                    ) : (
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                        <thead>
                          <tr style={{background:"#e8f5e9"}}>
                            <th style={{padding:"6px 14px",textAlign:"left",color:"#558b2f",fontWeight:600}}>Date</th>
                            <th style={{padding:"6px 14px",textAlign:"left",color:"#558b2f",fontWeight:600}}>TX ID</th>
                            <th style={{padding:"6px 14px",textAlign:"right",color:"#558b2f",fontWeight:600}}>Amount Paid</th>
                            <th style={{padding:"6px 14px",textAlign:"right",color:"#558b2f",fontWeight:600}}>Balance After</th>
                            <th style={{padding:"6px 14px",textAlign:"left",color:"#558b2f",fontWeight:600}}>Recorded By</th>
                            <th style={{padding:"6px 14px",textAlign:"left",color:"#558b2f",fontWeight:600}}>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loan.payments.map((p, pi) => (
                            <tr key={p.tx_id} style={{background:pi%2===0?"#fff":"#f1f8e9",borderTop:"1px solid #e8f5e9"}}>
                              <td style={{padding:"6px 14px",color:"#666"}}>{p.paid_at}</td>
                              <td style={{padding:"6px 14px",fontFamily:"monospace",color:"#1b5e20",fontSize:10}}>{p.tx_id}</td>
                              <td style={{padding:"6px 14px",textAlign:"right",fontWeight:700,color:"#2e7d32"}}>₱{Number(p.amount).toLocaleString()}</td>
                              <td style={{padding:"6px 14px",textAlign:"right",fontWeight:600,color:p.balance===0?"#1565c0":"#c62828"}}>
                                {p.balance === 0 ? "₱0 ✓ Fully Paid" : `₱${Number(p.balance).toLocaleString()}`}
                              </td>
                              <td style={{padding:"6px 14px",color:"#888"}}>{p.recorded_by}</td>
                              <td style={{padding:"6px 14px",color:"#aaa"}}>{p.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Summary footer */}
                    <div style={{padding:"8px 14px",display:"flex",gap:16,fontSize:11,color:"#888",borderTop:"1px solid #e8f5e9",flexWrap:"wrap"}}>
                      <span>Monthly Due: <strong style={{color:"#555"}}>₱{Number(loan.monthly_due).toLocaleString()}</strong></span>
                      <span>Total Paid: <strong style={{color:"#2e7d32"}}>₱{Number(loan.payments?.reduce((s,p) => s + p.amount, 0) || 0).toLocaleString()}</strong></span>
                      <span>Remaining: <strong style={{color:isPaid?"#1565c0":"#c62828"}}>{isPaid ? "₱0 — Fully Paid ✓" : `₱${Number(loan.balance).toLocaleString()}`}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{textAlign:"center",padding:"20px",color:"#aaa",fontSize:13,background:"#fafafa",borderRadius:8}}>No loans found for this member.</div>
      ))}
    </div>
  );
}

// ─── View / Edit Member Modal ─────────────────────────────────────────────────
function ViewEditModal({ member, onClose, onSave }) {
  const [mode,       setMode]      = useState("view");
  const [detail,     setDetail]    = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [saving,     setSaving]    = useState(false);
  const [showPw,     setShowPw]    = useState(false);
  const [profileTab, setProfileTab]= useState("info");

  const [form, setForm] = useState({
    first_name:"",last_name:"",middle_name:"",status:"Active",
    birth_date:"",civil_status:"",contact_number:"",email:"",
    address:"",occupation:"",share_capital:0,classification:"",
    educational_attainment:"",income:"",birth_certificate:false,
    marriage_certificate:false,school_name:"",year_level:"",allowance:"",
    pension_income:"",job_type:"",monthly_income:"",plain_password:"",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMemberAPI(member.id);
        setDetail(data);
        const pm=data.pre_member_info||{},sp=data.student_profile||{},sr=data.senior_profile||{},jp=data.job_profile||{};
        setForm({
          first_name: data.first_name||pm.first_name||"",
          last_name:  data.last_name ||pm.last_name ||"",
          middle_name: pm.middle_name||"",
          status:      data.status||"Active",
          birth_date:  pm.birth_date||"",
          civil_status: pm.civil_status||"Single",
          contact_number: pm.contact_number||data.contact||"",
          email:       pm.email||data.email||"",
          address:     pm.address||"",
          occupation:  pm.occupation||"",
          share_capital: data.share_capital||0,
          classification: pm.classification||data.classification||"",
          educational_attainment: pm.educational_attainment||"",
          income:      pm.income||"",
          birth_certificate:    pm.birth_certificate||false,
          marriage_certificate: pm.marriage_certificate||false,
          school_name:  sp.school_name||"",
          year_level:   sp.year_level||"",
          allowance:    sp.allowance||"",
          pension_income: sr.pension_income||"",
          job_type:     jp.job_type||"",
          monthly_income: jp.monthly_income||"",
          plain_password: data.plain_password||"",
        });
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [member.id]);

  const handle = e => {
    const val = e.target.type==="checkbox" ? e.target.checked : e.target.value;
    setForm(p => ({...p,[e.target.name]:val}));
  };

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(member.id, form); onClose(); }
    catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const username = detail?.user_username||"—";
  const memberId = detail?.member_id||member.member_id||"—";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box mm-view-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{mode==="view"?"Member Profile":"Edit Member"}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {loading ? <div style={{textAlign:"center",padding:"40px 0",color:"#888"}}>Loading member details...</div> : (<>
            <div className="mm-view-header">
              <div className="mm-view-avatar">{(form.first_name||"M")[0].toUpperCase()}</div>
              <div className="mm-view-info">
                <div className="mm-view-name">{form.first_name} {form.last_name}</div>
                <div className="mm-view-id">{memberId}</div>
                <div className="mm-view-username">@{username}</div>
              </div>
              <span className={`status-badge status-${(form.status||"").toLowerCase()}`}>{form.status}</span>
            </div>

            {mode==="view" && (
              <div style={{display:"flex",borderBottom:"2px solid #e8f5e9",marginBottom:16}}>
                {[{key:"info",label:"👤 Profile Info"},{key:"finance",label:"💰 Financial Summary"}].map(t => (
                  <button key={t.key} onClick={() => setProfileTab(t.key)} style={{
                    flex:1,padding:"9px 8px",fontSize:12,fontWeight:600,
                    color:profileTab===t.key?"#2e7d32":"#888",
                    background:profileTab===t.key?"#f9fef9":"none",
                    border:"none",borderBottom:profileTab===t.key?"2px solid #2e7d32":"none",
                    marginBottom:profileTab===t.key?-2:0,cursor:"pointer",
                  }}>{t.label}</button>
                ))}
              </div>
            )}

            {mode==="view" && profileTab==="finance" && <FinancialSummary memberId={member.id}/>}

            {(mode==="edit"||profileTab==="info") && (<>
              <div className="mm-view-capital">
                <div className="mm-vc-row">
                  <span className="mm-vc-label">Share Capital</span>
                  {mode==="edit"
                    ? <input className="modal-input mm-capital-input" type="number" name="share_capital" value={form.share_capital} onChange={handle}/>
                    : <span className="mm-vc-val">₱{Number(form.share_capital||0).toLocaleString()}</span>
                  }
                </div>
                <div className="mm-vc-row">
                  <span className="mm-vc-label">Max Loanable</span>
                  <span className="mm-vc-val green">₱{Number(form.share_capital||0).toLocaleString()}</span>
                </div>
              </div>

              <div className="mm-view-section-title">Personal Information</div>
              <div className="modal-grid">
                <ModalField label="First Name"    name="first_name"    mode={mode} form={form} handle={handle}/>
                <ModalField label="Last Name"     name="last_name"     mode={mode} form={form} handle={handle}/>
                <ModalField label="Middle Name"   name="middle_name"   mode={mode} form={form} handle={handle}/>
                <ModalField label="Status"        name="status"        options={["Active","Inactive","Suspended"]} mode={mode} form={form} handle={handle}/>
                <ModalField label="Birthdate"     name="birth_date"    type="date" mode={mode} form={form} handle={handle}/>
                <ModalField label="Civil Status"  name="civil_status"  options={["Single","Married","Widowed","Separated"]} mode={mode} form={form} handle={handle}/>
                <ModalField label="Contact No."   name="contact_number" type="tel" mode={mode} form={form} handle={handle}/>
                <ModalField label="Email"         name="email"         type="email" mode={mode} form={form} handle={handle}/>
                <ModalField label="Occupation"    name="occupation"    mode={mode} form={form} handle={handle}/>
                <ModalField label="Address"       name="address"       full mode={mode} form={form} handle={handle}/>
              </div>

              <div className="mm-view-section-title">Classification & Profile</div>
              <div className="modal-grid">
                <ModalField label="Classification"         name="classification" options={["Student","Senior","Employed"]} mode={mode} form={form} handle={handle}/>
                <ModalField label="Educational Attainment" name="educational_attainment" options={["Elementary","High School","Vocational","College","Post Graduate"]} mode={mode} form={form} handle={handle}/>
                <ModalField label="Monthly Income (₱)"    name="income" type="number" mode={mode} form={form} handle={handle}/>
                <div className="modal-field">
                  <div className="modal-field-label">Birth Certificate</div>
                  {mode==="view"
                    ? <div className="modal-field-value">{form.birth_certificate?"✅ Submitted":"❌ Not submitted"}</div>
                    : <label style={{display:"flex",alignItems:"center",gap:8,marginTop:4,fontSize:13,cursor:"pointer"}}><input type="checkbox" name="birth_certificate" checked={!!form.birth_certificate} onChange={handle}/> Yes</label>
                  }
                </div>
                <div className="modal-field">
                  <div className="modal-field-label">Marriage Certificate</div>
                  {mode==="view"
                    ? <div className="modal-field-value">{form.marriage_certificate?"✅ Submitted":"❌ Not submitted"}</div>
                    : <label style={{display:"flex",alignItems:"center",gap:8,marginTop:4,fontSize:13,cursor:"pointer"}}><input type="checkbox" name="marriage_certificate" checked={!!form.marriage_certificate} onChange={handle}/> Yes</label>
                  }
                </div>
              </div>

              {form.classification==="Student" && <div className="modal-grid">
                <ModalField label="School Name"           name="school_name"  mode={mode} form={form} handle={handle}/>
                <ModalField label="Year Level"            name="year_level"   options={["Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12","1st Year","2nd Year","3rd Year","4th Year","5th Year","Graduate"]} mode={mode} form={form} handle={handle}/>
                <ModalField label="Monthly Allowance (₱)" name="allowance"   type="number" mode={mode} form={form} handle={handle}/>
              </div>}
              {form.classification==="Senior" && <div className="modal-grid">
                <ModalField label="Monthly Pension Income (₱)" name="pension_income" type="number" mode={mode} form={form} handle={handle}/>
              </div>}
              {form.classification==="Employed" && <div className="modal-grid">
                <ModalField label="Employment Type"   name="job_type" options={["Employed","Self-Employed","Business","Freelance","Other"]} mode={mode} form={form} handle={handle}/>
                <ModalField label="Monthly Income (₱)" name="monthly_income" type="number" mode={mode} form={form} handle={handle}/>
              </div>}

              <div className="mm-view-section-title">Account</div>
              <div className="modal-grid">
                <div className="modal-field full"><div className="modal-field-label">Member ID</div><input className="modal-input disabled" value={memberId} disabled /></div>
                <div className="modal-field full"><div className="modal-field-label">Username</div><div className="modal-field-value mono">{username}</div></div>
                {mode==="view" && (
                  <div className="modal-field full">
                    <div className="modal-field-label">Password</div>
                    <div className="mm-pass-view-wrap">
                      <span className="modal-field-value mono">{showPw?(form.plain_password||"No password saved"):"••••••••"}</span>
                      <button type="button" className="mm-reveal-btn" onClick={() => setShowPw(p=>!p)}>{showPw?"Hide":"Show"}</button>
                    </div>
                  </div>
                )}
                {mode==="edit" && (
                  <div className="modal-field full">
                    <div className="modal-field-label">New Password <span style={{fontSize:11,color:"#aaa",fontWeight:400,marginLeft:6}}>(leave blank to keep current)</span></div>
                    <div className="mm-pass-wrap">
                      <input className="modal-input mm-pass-input" type={showPw?"text":"password"} name="plain_password" value={form.plain_password} onChange={handle} placeholder="Enter new password"/>
                      <button type="button" className="mm-eye-btn" onClick={() => setShowPw(p=>!p)}>{showPw?"🙈":"👁"}</button>
                    </div>
                  </div>
                )}
                <div className="modal-field full">
                  <div className="modal-field-label">Date Registered</div>
                  <div className="modal-field-value">{detail?.date_registered?new Date(detail.date_registered).toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"}):"—"}</div>
                </div>
              </div>
            </>)}
          </>)}
        </div>
        <div className="modal-footer">
          {mode==="view" ? (<>
            <button className="btn-modal-close" onClick={onClose}>Close</button>
            <button className="btn-modal-save" onClick={() => setMode("edit")}>✏ Edit Member</button>
          </>) : (<>
            <button className="btn-modal-close" onClick={() => setMode("view")}>← Back</button>
            <button className="btn-modal-save" onClick={handleSave} disabled={saving}>{saving?"Saving...":"Save Changes"}</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ member, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  if (!member) return null;
  const handleConfirm = async () => { setLoading(true); await onConfirm(member.id); setLoading(false); };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><div className="modal-title danger-title">Delete Member</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="delete-warning-icon">⚠️</div>
          <p className="delete-confirm-text">Are you sure you want to delete <strong>{member.fullname||`${member.first_name} ${member.last_name}`}</strong>?</p>
          <p className="delete-sub-text">Member ID: <span className="mono">{member.member_id}</span></p>
          <p className="delete-sub-text" style={{color:"#e53935",marginTop:4}}>This action cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button className="btn-modal-close" onClick={onClose}>Cancel</button>
          <button className="btn-modal-delete" onClick={handleConfirm} disabled={loading}>{loading?"Deleting...":"Yes, Delete"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Pending Modal ────────────────────────────────────────────────────────────
function PendingModal({ app, onClose, onConvert }) {
  if (!app) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box mm-view-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><div className="modal-title">Pending Application</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="mm-view-header">
            <div className="mm-view-avatar">{(app.first_name||"A")[0]}</div>
            <div className="mm-view-info">
              <div className="mm-view-name">{app.first_name} {app.last_name}</div>
              <div className="mm-view-id">{app.app_id}</div>
              <div className="mm-view-username">Submitted {(app.created_at||"").slice(0,10)}</div>
            </div>
            <span className="mm-pending-badge">⏳ Pending</span>
          </div>
          <div className="mm-pending-notice">📋 This applicant has been approved online. They need to visit the office to complete the process.</div>
          <div className="mm-view-section-title">Personal Information</div>
          <div className="modal-grid">
            {[["Birthdate",app.birth_date],["Civil Status",app.civil_status],["Contact",app.contact_number],["Email",app.email],["Occupation",app.occupation],["Classification",app.classification]].map(([k,v]) => (
              <div key={k} className="modal-field"><div className="modal-field-label">{k}</div><div className="modal-field-value">{v||"—"}</div></div>
            ))}
            <div className="modal-field full"><div className="modal-field-label">Address</div><div className="modal-field-value">{app.address||"—"}</div></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-modal-close" onClick={onClose}>Close</button>
          <button className="btn-modal-save" onClick={() => onConvert(app)}>✓ Convert to Official Member</button>
        </div>
      </div>
    </div>
  );
}

// ─── Register Member Modal ────────────────────────────────────────────────────
function RegisterMemberModal({ onClose, onSuccess }) {
  const [tab,setTab]=useState("personal");
  const [loading,setLoading]=useState(false);
  const [errors,setErrors]=useState({});
  const [result,setResult]=useState(null);
  const TABS=[{key:"personal",label:"👤 Personal Info"},{key:"classification",label:"📋 Classification"},{key:"account",label:"🔐 Account Info"}];
  const [form,setForm]=useState({
    first_name:"",last_name:"",middle_name:"",birth_date:"",civil_status:"Single",
    educational_attainment:"",occupation:"",income:"",contact_number:"",address:"",
    birth_certificate:false,marriage_certificate:false,share_capital:"",
    classification:"Employed",school_name:"",year_level:"",allowance:"",
    pension_income:"",job_type:"Employed",monthly_income:"",
  });
  const handle=e=>{const val=e.target.type==="checkbox"?e.target.checked:e.target.value;setForm(p=>({...p,[e.target.name]:val}));setErrors(p=>({...p,[e.target.name]:""}));};
  const validate=()=>{const e={};if(!form.first_name.trim())e.first_name="Required";if(!form.last_name.trim())e.last_name="Required";if(!form.birth_date)e.birth_date="Required";if(!form.contact_number.trim())e.contact_number="Required";if(!form.address.trim())e.address="Required";if(form.classification==="Student"&&!form.school_name.trim())e.school_name="Required";if(form.classification==="Student"&&!form.year_level.trim())e.year_level="Required";return e;};
  const handleSubmit=async()=>{const e=validate();if(Object.keys(e).length){setErrors(e);const pf=["first_name","last_name","birth_date","contact_number","address"];const cf=["school_name","year_level"];if(pf.some(f=>e[f])){setTab("personal");return;}if(cf.some(f=>e[f])){setTab("classification");return;}return;}
    setLoading(true);try{const res=await registerMemberAPI({first_name:form.first_name,last_name:form.last_name,middle_name:form.middle_name,birth_date:form.birth_date,civil_status:form.civil_status,educational_attainment:form.educational_attainment,occupation:form.occupation,income:form.income||0,contact_number:form.contact_number,address:form.address,birth_certificate:form.birth_certificate,marriage_certificate:form.marriage_certificate,classification:form.classification,share_capital:form.share_capital||0,school_name:form.school_name,year_level:form.year_level,allowance:form.allowance||0,pension_income:form.pension_income||0,job_type:form.job_type,monthly_income:form.monthly_income||0});
      // Pass the new member data and close modal — list updates instantly
      await onSuccess(res.member || res);
      setResult(res);
      setTab("account");
    }catch(err){const msg=err.response?.data?.error||"Failed to register member.";setErrors({first_name:msg});setTab("personal");}finally{setLoading(false);}};
  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box mm-view-modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><div className="modal-title">Register New Member</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div style={{fontSize:12,color:"#888",padding:"6px 20px",background:"#f9fbe7",borderBottom:"1px solid #eee"}}>Walk-in / F2F member registration at the office</div>
        <div style={{display:"flex",borderBottom:"2px solid #e8f5e9"}}>
          {TABS.map((t,i)=>(<button key={t.key} onClick={()=>!result&&setTab(t.key)} style={{flex:1,padding:"10px 8px",fontSize:12,fontWeight:600,color:tab===t.key?"#2e7d32":"#888",background:tab===t.key?"#f9fef9":"none",border:"none",borderBottom:tab===t.key?"2px solid #2e7d32":"none",marginBottom:tab===t.key?-2:0,cursor:result?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><span style={{width:20,height:20,borderRadius:"50%",fontSize:11,background:tab===t.key?"#2e7d32":"#e0e0e0",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>{i+1}</span>{t.label}</button>))}
        </div>
        <div className="modal-body">
          {tab==="personal"&&<div className="modal-grid">
            <RegisterField label="Last Name" name="last_name" form={form} handle={handle} errors={errors}/>
            <RegisterField label="First Name" name="first_name" form={form} handle={handle} errors={errors}/>
            <RegisterField label="Middle Name" name="middle_name" form={form} handle={handle} errors={errors}/>
            <RegisterField label="Birthdate" name="birth_date" type="date" form={form} handle={handle} errors={errors}/>
            <RegisterField label="Civil Status" name="civil_status" options={["Single","Married","Widowed","Separated"]} form={form} handle={handle} errors={errors}/>
            <RegisterField label="Educational Attainment" name="educational_attainment" options={["Elementary","High School","Vocational","College","Post Graduate"]} form={form} handle={handle} errors={errors}/>
            <RegisterField label="Contact No." name="contact_number" form={form} handle={handle} errors={errors}/>
            <RegisterField label="Occupation" name="occupation" form={form} handle={handle} errors={errors}/>
            <RegisterField label="Monthly Income (₱)" name="income" type="number" form={form} handle={handle} errors={errors}/>
            <div className="modal-field">
              <div className="modal-field-label">Amount Paid for Membership (₱)</div>
              <div className="al-amount-wrap" style={{border:"1px solid #ddd",borderRadius:8,overflow:"hidden"}}>
                <span style={{padding:"0 10px",color:"#aaa",fontSize:14}}>₱</span>
                <input style={{border:"none",outline:"none",padding:"9px 8px",fontSize:14,width:"100%"}} type="number" name="share_capital" value={form.share_capital||""} onChange={handle} placeholder="e.g. 4000"/>
              </div>
              {form.share_capital>0&&<div style={{marginTop:6,padding:"6px 10px",background:"#e8f5e9",borderRadius:8,fontSize:11,color:"#2e7d32",fontWeight:600}}>
                💡 Share Capital = ₱{(parseFloat(form.share_capital||0)*2).toLocaleString()} (paid × 2) · Max Loanable = ₱{(parseFloat(form.share_capital||0)*2).toLocaleString()}
              </div>}
            </div>
            <RegisterField label="Complete Address" name="address" full form={form} handle={handle} errors={errors}/>
            <RegisterField label="Birth Certificate Submitted" name="birth_certificate" type="checkbox" form={form} handle={handle} errors={errors}/>
            <RegisterField label="Marriage Certificate Submitted" name="marriage_certificate" type="checkbox" form={form} handle={handle} errors={errors}/>
          </div>}
          {tab==="classification"&&<div className="modal-grid">
            <div className="modal-field full">
              <div className="modal-field-label">Member Classification <span style={{color:"#e53935"}}>*</span></div>
              <div style={{display:"flex",gap:12,marginTop:8}}>
                {["Student","Senior","Employed"].map(c=>(<div key={c} onClick={()=>setForm(p=>({...p,classification:c}))} style={{flex:1,border:`2px solid ${form.classification===c?"#2e7d32":"#e0e0e0"}`,borderRadius:10,padding:"16px 10px",textAlign:"center",cursor:"pointer",background:form.classification===c?"#e8f5e9":"#fafafa",transition:"all 0.2s"}}>
                  <div style={{fontSize:26,marginBottom:6}}>{c==="Student"?"🎓":c==="Senior"?"👴":"💼"}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#2e7d32"}}>{c}</div>
                </div>))}
              </div>
            </div>
            {form.classification==="Student"&&<><RegisterField label="School Name" name="school_name" form={form} handle={handle} errors={errors}/><RegisterField label="Year Level" name="year_level" options={["Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12","1st Year","2nd Year","3rd Year","4th Year","5th Year","Graduate"]} form={form} handle={handle} errors={errors}/><RegisterField label="Monthly Allowance (₱)" name="allowance" type="number" form={form} handle={handle} errors={errors}/></>}
            {form.classification==="Senior"&&<><RegisterField label="Educational Attainment" name="educational_attainment" options={["Elementary","High School","Vocational","College","Post Graduate"]} form={form} handle={handle} errors={errors}/><RegisterField label="Monthly Pension Income (₱)" name="pension_income" type="number" form={form} handle={handle} errors={errors}/></>}
            {form.classification==="Employed"&&<><RegisterField label="Occupation/Job Title" name="occupation" form={form} handle={handle} errors={errors}/><RegisterField label="Employment Type" name="job_type" options={["Employed","Self-Employed","Business","Freelance","Other"]} form={form} handle={handle} errors={errors}/><RegisterField label="Monthly Income (₱)" name="monthly_income" type="number" form={form} handle={handle} errors={errors}/></>}
          </div>}
          {tab==="account"&&<div className="modal-grid">
            {result?(<>
              <div className="modal-field full" style={{textAlign:"center",padding:"12px 0"}}><div style={{fontSize:36,marginBottom:8}}>🎉</div><div style={{fontSize:15,fontWeight:800,color:"#1b5e20",marginBottom:4}}>{result.member?.fullname||`${form.first_name} ${form.last_name}`} is now an official member!</div><div style={{fontSize:12,color:"#888"}}>Share the credentials below with the member.</div></div>
              <div className="modal-field full" style={{background:"#f1f8e9",borderRadius:10,padding:16}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{[["Member ID",result.member_id],["Username",result.username],["Password",result.plain_password],["Status","Active"]].map(([k,v])=>(<div key={k}><div style={{fontSize:11,color:"#888",fontWeight:600}}>{k}</div><div style={{fontSize:13,fontWeight:700,color:"#1b5e20",fontFamily:"monospace"}}>{v}</div></div>))}</div></div>
              <div className="modal-field full" style={{fontSize:11,color:"#f57c00",background:"#fff8e1",padding:"10px 14px",borderRadius:8,borderLeft:"3px solid #ff9800"}}>⚠ Please save or print these credentials.</div>
            </>):<div className="modal-field full" style={{textAlign:"center",padding:"24px 0",color:"#888"}}>Complete Personal Info and Classification tabs first, then submit.</div>}
          </div>}
        </div>
        <div className="modal-footer">
          {!result?(<>
            {tab!=="personal"&&<button className="btn-modal-close" onClick={()=>{const keys=TABS.map(t=>t.key);setTab(keys[keys.indexOf(tab)-1]);}}>← Previous</button>}
            {tab==="personal"&&<button className="btn-modal-close" onClick={onClose}>Cancel</button>}
            {tab!=="classification"?<button className="btn-modal-save" onClick={()=>{const keys=TABS.map(t=>t.key);setTab(keys[keys.indexOf(tab)+1]);}}>Next →</button>:<button className="btn-modal-save" onClick={handleSubmit} disabled={loading}>{loading?"Registering...":"✓ Register Member"}</button>}
          </>):<button className="btn-modal-save" onClick={onClose}>Done</button>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ManageMember() {
  const [members,      setMembers]      = useState([]);
  const [pending,      setPending]      = useState([]);
  const [stats,        setStats]        = useState({active:0,inactive:0,suspended:0,total:0});
  const [loading,      setLoading]      = useState(true);
  const [mainTab,      setMainTab]      = useState("official");
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilter]       = useState("All");
  const [sortBy,       setSortBy]       = useState("newest");
  const [showAgeChart, setShowAgeChart] = useState(false);
  const [currentPage,  setPage]         = useState(1);
  const [viewMember,   setViewMember]   = useState(null);
  const [deleteMember, setDeleteMember] = useState(null);
  const [viewPending,  setViewPending]  = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [mem,st,apps] = await Promise.allSettled([getMembersAPI(),getMemberStatsAPI(),getApplicationsAPI({status:"Approved"})]);
      if (mem.status==="fulfilled")  setMembers(mem.value);
      if (st.status==="fulfilled")   setStats(st.value);
      if (apps.status==="fulfilled") {
        const convertedIds = mem.status==="fulfilled" ? mem.value.map(m=>m.application_id).filter(Boolean) : [];
        setPending(apps.value.filter(a=>!convertedIds.includes(a.id)));
      }
    } catch(e) { console.error(e); }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(()=>{ const h=e=>{if(e.detail?.action==="register")setShowRegister(true);}; window.addEventListener("staff-action",h); return ()=>window.removeEventListener("staff-action",h); },[]);

  const filtered = useMemo(() => {
    let list = members.filter(m => {
      const matchStatus = filterStatus==="All" || m.status===filterStatus;
      const q = search.toLowerCase();
      return matchStatus && (
        (m.fullname||`${m.first_name} ${m.last_name}`).toLowerCase().includes(q) ||
        (m.member_id||"").toLowerCase().includes(q)
      );
    });
    if (sortBy==="az")     list = [...list].sort((a,b)=>(a.fullname||"").localeCompare(b.fullname||""));
    if (sortBy==="za")     list = [...list].sort((a,b)=>(b.fullname||"").localeCompare(a.fullname||""));
    if (sortBy==="oldest") list = [...list].sort((a,b)=>a.id-b.id);
    if (sortBy==="newest") list = [...list].sort((a,b)=>b.id-a.id);
    return list;
  }, [members, filterStatus, search, sortBy]);

  const totalPages = Math.max(1,Math.ceil(filtered.length/ROWS_PER_PAGE));
  const safePage   = Math.min(currentPage,totalPages);
  const paginated  = filtered.slice((safePage-1)*ROWS_PER_PAGE,safePage*ROWS_PER_PAGE);

  const handleSaveEdit = async (id,form) => { try{await updateMemberAPI(id,form);showToast("Member updated successfully.");fetchData(true);}catch{showToast("Failed to update member.","danger");} };
  const handleDelete   = async (id)      => { try{await deleteMemberAPI(id);setDeleteMember(null);showToast("Member deleted.","danger");fetchData(true);}catch{showToast("Failed to delete member.","danger");} };
  const handleConvert  = async (app)     => { try{const r=await convertToMemberAPI(app.id);setPending(prev=>prev.filter(p=>p.id!==app.id));setViewPending(null);showToast(`✓ ${app.first_name} ${app.last_name} is now an official member! ID: ${r.member_id}`,"success");fetchData(true);}catch(err){showToast(err.response?.data?.error||"Failed to convert member.","danger");} };

  return (
    <div className="mm-wrapper">
      {toast && <div className={`mm-toast mm-toast-${toast.type}`}>{toast.msg}</div>}
      {showRegister && <RegisterMemberModal
        onClose={()=>setShowRegister(false)}
        onSuccess={async (newMember)=>{
          // Directly add the new member to state — instant, no refetch needed
          setMembers(prev => [newMember, ...prev]);
          setStats(prev => ({...prev, total:(prev.total||0)+1, active:(prev.active||0)+1}));
          showToast("Member registered successfully!","success");
        }}
      />}
      {viewMember   && <ViewEditModal member={viewMember}   onClose={()=>setViewMember(null)}   onSave={handleSaveEdit}/>}
      {viewPending  && <PendingModal  app={viewPending}     onClose={()=>setViewPending(null)}  onConvert={handleConvert}/>}
      <DeleteModal member={deleteMember} onClose={()=>setDeleteMember(null)} onConfirm={handleDelete}/>

      <div className="mm-page-header">
        <div>
          <div className="mm-page-title">Member Management</div>
          <div className="mm-page-sub">View, edit, and manage all registered LEAF MPC members.</div>
        </div>
        <div className="mm-header-stats">
          <div className="mm-mini-stat"><span className="mm-mini-val">{stats.active||0}</span><span className="mm-mini-label">Active</span></div>
          <div className="mm-mini-stat"><span className="mm-mini-val inactive">{stats.inactive||0}</span><span className="mm-mini-label">Inactive</span></div>
          <div className="mm-mini-stat"><span className="mm-mini-val suspended">{stats.suspended||0}</span><span className="mm-mini-label">Suspended</span></div>
          <div className="mm-mini-stat"><span className="mm-mini-val total">{stats.total||0}</span><span className="mm-mini-label">Total</span></div>
          <div className="mm-mini-stat" style={{cursor:"pointer"}} onClick={()=>setMainTab("pending")}>
            <span className="mm-mini-val" style={{color:"#e65100"}}>{pending.length}</span>
            <span className="mm-mini-label">Pending</span>
          </div>
        </div>
      </div>

      <div className="mm-main-tabs">
        <button className={`mm-main-tab ${mainTab==="official"?"active":""}`} onClick={()=>setMainTab("official")}>
          <Users size={14}/> Official Members <span className="mm-tab-count">{members.length}</span>
        </button>
        <button className={`mm-main-tab ${mainTab==="pending"?"active pending-tab":""}`} onClick={()=>setMainTab("pending")}>
          <Clock size={14}/> Pending for Approval
          {pending.length>0&&<span className="mm-tab-count pending-count">{pending.length}</span>}
        </button>
      </div>

      {mainTab==="official" && (
        <div className="mm-card">
          <div style={{padding:"10px 16px 0",display:"flex",justifyContent:"flex-end"}}>
            <button onClick={()=>setShowAgeChart(p=>!p)} style={{
              fontSize:12, fontWeight:600, padding:"5px 14px",
              background: showAgeChart?"#e8f5e9":"#f5f5f5",
              color: showAgeChart?"#2e7d32":"#888",
              border:`1px solid ${showAgeChart?"#a5d6a7":"#e0e0e0"}`,
              borderRadius:20, cursor:"pointer", transition:"all 0.2s",
            }}>
              {showAgeChart?"▲ Hide Age Chart":"📊 Show Age Group Chart"}
            </button>
          </div>

          {showAgeChart && <div style={{padding:"12px 16px 0"}}><AgeGroupChart members={members}/></div>}

          <div className="mm-toolbar">
            <div className="mm-search-wrap">
              <span className="mm-search-icon"><Search size={13} color="#aaa"/></span>
              <input className="mm-search-input" placeholder="Search by Name or Member ID..."
                value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
              {search&&<button className="mm-clear-btn" onClick={()=>{setSearch("");setPage(1);}}>✕</button>}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <ArrowUpDown size={13} color="#888"/>
                <select value={sortBy} onChange={e=>{setSortBy(e.target.value);setPage(1);}} style={{
                  fontSize:12,fontWeight:600,padding:"6px 10px",
                  border:"1px solid #e0e0e0",borderRadius:8,
                  background:"#fff",color:"#555",cursor:"pointer",outline:"none",
                }}>
                  {SORT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="mm-filter-tabs">
                {STATUS_OPTIONS.map(s=>(
                  <button key={s} className={`mm-filter-tab ${filterStatus===s?"active":""}`}
                    onClick={()=>{setFilter(s);setPage(1);}}>{s}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="mm-table-wrap">
            <table className="mm-table">
              <thead>
                <tr>
                  <th style={{width:"14%"}}>Member ID</th>
                  <th style={{width:"26%"}}>Full Name</th>
                  <th style={{width:"8%",textAlign:"center"}}>Age</th>
                  <th style={{width:"14%"}}>Contact</th>
                  <th style={{width:"12%"}}>Status</th>
                  <th style={{width:"18%",textAlign:"center"}}>Manage</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="mm-empty">Loading members...</td></tr>
                : paginated.length===0 ? <tr><td colSpan={6} className="mm-empty">No members found.</td></tr>
                : paginated.map((m,idx)=>(
                  <tr key={m.id} className={idx%2===0?"row-even":"row-odd"} onClick={()=>setViewMember(m)} style={{cursor:"pointer"}}>
                    <td className="mono cell-id">{m.member_id}</td>
                    <td className="cell-name">{m.fullname||`${m.first_name} ${m.last_name}`}</td>
                    <td style={{textAlign:"center",fontSize:12,fontWeight:600}}>
                      {(() => {
                        const age = computeAge(m.birth_date);
                        return age && age > 0
                          ? <span style={{color:"#555"}}>{age}</span>
                          : <span style={{color:"#ccc"}}>—</span>;
                      })()}
                    </td>
                    <td>{m.contact}</td>
                    <td><span className={`status-badge status-${(m.status||"").toLowerCase()}`}>{m.status}</span></td>
                    <td>
                      <div className="action-btns" onClick={e=>e.stopPropagation()}>
                        <button className="action-btn view-btn"   title="View"   onClick={()=>setViewMember(m)}><Eye size={13}/></button>
                        <button className="action-btn edit-btn"   title="Edit"   onClick={()=>setViewMember(m)}><Pencil size={12}/></button>
                        <button className="action-btn delete-btn" title="Delete" onClick={()=>setDeleteMember(m)}><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mm-footer">
            <div className="mm-count">Showing {filtered.length===0?0:(safePage-1)*ROWS_PER_PAGE+1}–{Math.min(safePage*ROWS_PER_PAGE,filtered.length)} of {filtered.length}</div>
            <div className="mm-pagination">
              <button className="page-btn" disabled={safePage===1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
              {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-safePage)<=1).reduce((acc,p,i,arr)=>{if(i>0&&p-arr[i-1]>1)acc.push("...");acc.push(p);return acc;},[]).map((p,i)=>p==="..."?<span key={`e${i}`} className="page-ellipsis">…</span>:<button key={p} className={`page-btn page-num ${safePage===p?"active":""}`} onClick={()=>setPage(p)}>{p}</button>)}
              <button className="page-btn" disabled={safePage===totalPages} onClick={()=>setPage(p=>p+1)}>Next →</button>
            </div>
          </div>
        </div>
      )}

      {mainTab==="pending" && (
        <div className="mm-card">
          {pending.length===0 ? (
            <div className="mm-empty-pending">
              <div style={{fontSize:36}}>✅</div>
              <div style={{fontSize:14,fontWeight:700,color:"#1b5e20",marginTop:8}}>No pending applications</div>
              <div style={{fontSize:12,color:"#aaa",marginTop:4}}>All approved applicants have been processed.</div>
            </div>
          ) : (
            <div className="mm-table-wrap">
              <table className="mm-table">
                <thead><tr>
                  <th style={{width:"14%"}}>App ID</th><th style={{width:"26%"}}>Full Name</th>
                  <th style={{width:"18%"}}>Contact</th><th style={{width:"16%"}}>Occupation</th>
                  <th style={{width:"14%"}}>Submitted</th><th style={{width:"12%",textAlign:"center"}}>Action</th>
                </tr></thead>
                <tbody>{pending.map((p,idx)=>(
                  <tr key={p.id} className={idx%2===0?"row-even":"row-odd"} onClick={()=>setViewPending(p)} style={{cursor:"pointer"}}>
                    <td className="mono cell-id">{p.app_id}</td>
                    <td className="cell-name">{p.fullname||`${p.first_name} ${p.last_name}`}</td>
                    <td>{p.contact_number}</td><td>{p.occupation}</td>
                    <td style={{fontSize:11,color:"#888"}}>{(p.created_at||"").slice(0,10)}</td>
                    <td><div className="action-btns" onClick={e=>e.stopPropagation()}>
                      <button className="action-btn view-btn" onClick={()=>setViewPending(p)}><Eye size={13}/></button>
                      <button className="mm-convert-btn" onClick={()=>handleConvert(p)}>✓</button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}