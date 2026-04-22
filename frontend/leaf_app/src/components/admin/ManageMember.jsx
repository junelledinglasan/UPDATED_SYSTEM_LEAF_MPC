import { useState, useEffect } from "react";
import { getMembersAPI, getMemberStatsAPI, getMemberAPI, updateMemberAPI, deleteMemberAPI, getApplicationsAPI, updateApplicationStatusAPI, convertToMemberAPI } from "../../api/members";
import "./ManageMember.css";

const STATUS_OPTIONS = ["All","Active","Inactive","Suspended"];
const ROWS_PER_PAGE  = 10;

// ─── View / Edit Member Modal ─────────────────────────────────────────────────
function ViewEditModal({ member, onClose, onSave }) {
  const [mode,    setMode]    = useState("view");
  const [detail,  setDetail]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const [form, setForm] = useState({
    firstname:     member.firstname     || "",
    lastname:      member.lastname      || "",
    middlename:    member.middlename    || "",
    status:        member.status        || "Active",
    birthdate:     member.birthdate     || "",
    gender:        member.gender        || "Male",
    civil_status:  member.civil_status  || "Single",
    contact:       member.contact       || "",
    email:         member.email         || "",
    address:       member.address       || "",
    occupation:    member.occupation    || "",
    share_capital: member.share_capital || 0,
    valid_id:      member.valid_id      || "",
    beneficiary:   member.beneficiary   || "",
    relationship:  member.relationship  || "",
    plain_password:"",
  });

  // Fetch full member detail on open
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMemberAPI(member.id);
        setDetail(data);
        setForm({
          firstname:     data.firstname     || "",
          lastname:      data.lastname      || "",
          middlename:    data.middlename    || "",
          status:        data.status        || "Active",
          birthdate:     data.birthdate     || "",
          gender:        data.gender        || "Male",
          civil_status:  data.civil_status  || "Single",
          contact:       data.contact       || "",
          email:         data.email         || "",
          address:       data.address       || "",
          occupation:    data.occupation    || "",
          share_capital: data.share_capital || 0,
          valid_id:      data.valid_id      || "",
          beneficiary:   data.beneficiary   || "",
          relationship:  data.relationship  || "",
          plain_password: data.plain_password || "",
        });
      } catch(e) {
        console.error("Failed to load member details:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [member.id]);

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const maxLoanable = (parseFloat(form.share_capital) || 0) * 3;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(member.id, form);
      onClose();
    } catch(e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const username = detail?.user_username || "—";
  const memberId = detail?.member_id || member.member_id || "—";

  const Field = ({ label, name, type="text", options=null, full=false }) => (
    <div className={`modal-field${full?" full":""}`}>
      <div className="modal-field-label">{label}</div>
      {mode==="view" ? (
        <div className="modal-field-value">{form[name] || "—"}</div>
      ) : options ? (
        <select className="modal-input" name={name} value={form[name]} onChange={handle}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input className="modal-input" type={type} name={name} value={form[name]} onChange={handle} />
      )}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box mm-view-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{mode==="view" ? "Member Profile" : "Edit Member"}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{textAlign:"center",padding:"40px 0",color:"#888"}}>
              Loading member details...
            </div>
          ) : (
            <>
              {/* Header strip */}
              <div className="mm-view-header">
                <div className="mm-view-avatar">{(form.firstname||"M")[0].toUpperCase()}</div>
                <div className="mm-view-info">
                  <div className="mm-view-name">{form.firstname} {form.lastname}</div>
                  <div className="mm-view-id">{memberId}</div>
                  <div className="mm-view-username">@{username}</div>
                </div>
                <span className={`status-badge status-${(form.status||"").toLowerCase()}`}>{form.status}</span>
              </div>

              {/* Share Capital */}
              <div className="mm-view-capital">
                <div className="mm-vc-row">
                  <span className="mm-vc-label">Share Capital</span>
                  {mode==="edit"
                    ? <input className="modal-input mm-capital-input" type="number" name="share_capital" value={form.share_capital} onChange={handle}/>
                    : <span className="mm-vc-val">₱{Number(form.share_capital||0).toLocaleString()}</span>
                  }
                </div>
                <div className="mm-vc-row">
                  <span className="mm-vc-label">Max Loanable (×3)</span>
                  <span className="mm-vc-val green">₱{maxLoanable.toLocaleString()}</span>
                </div>
              </div>

              {/* Personal Information */}
              <div className="mm-view-section-title">Personal Information</div>
              <div className="modal-grid">
                <Field label="First Name"   name="firstname" />
                <Field label="Last Name"    name="lastname" />
                <Field label="Middle Name"  name="middlename" />
                <Field label="Status"       name="status"       options={["Active","Inactive","Suspended"]} />
                <Field label="Birthdate"    name="birthdate"    type="date" />
                <Field label="Gender"       name="gender"       options={["Male","Female","Other"]} />
                <Field label="Civil Status" name="civil_status" options={["Single","Married","Widowed","Separated"]} />
                <Field label="Contact No."  name="contact"      type="tel" />
                <Field label="Email"        name="email"        type="email" />
                <Field label="Occupation"   name="occupation" />
                <Field label="Address"      name="address"      full />
              </div>

              {/* Valid ID & Beneficiary */}
              <div className="mm-view-section-title">Valid ID & Beneficiary</div>
              <div className="modal-grid">
                <Field label="Valid ID Type" name="valid_id"     options={["UMID","Philippine Passport","Driver's License","SSS ID","PhilHealth ID","Voter's ID","PRC ID","Postal ID"]} />
                <Field label="Beneficiary"   name="beneficiary" />
                <Field label="Relationship"  name="relationship" options={["Spouse","Parent","Child","Sibling","Other"]} />
              </div>

              {/* Account Section */}
              <div className="mm-view-section-title">Account</div>
              <div className="modal-grid">

                {/* Member ID */}
                <div className="modal-field full">
                  <div className="modal-field-label">Member ID</div>
                  <input className="modal-input disabled" value={memberId} disabled />
                </div>

                {/* Username */}
                <div className="modal-field full">
                  <div className="modal-field-label">Username</div>
                  <div className="modal-field-value mono">{username}</div>
                </div>

                {/* Password — view mode: show/hide */}
                {mode==="view" && (
                  <div className="modal-field full">
                    <div className="modal-field-label">Password</div>
                    <div className="mm-pass-view-wrap">
                      <span className="modal-field-value mono">
                        {showPw
                          ? (form.plain_password || "No password saved")
                          : "••••••••"
                        }
                      </span>
                      <button
                        type="button"
                        className="mm-reveal-btn"
                        onClick={() => setShowPw(p => !p)}
                      >
                        {showPw ? "Hide" : "Show"}
                      </button>
                    </div>
                    {!form.plain_password && (
                      <div style={{fontSize:11,color:"#f57c00",marginTop:4}}>
                        ⚠ No saved password — member registered before this feature was added.
                        Use Edit to set a new password.
                      </div>
                    )}
                  </div>
                )}

                {/* Password — edit mode: change password */}
                {mode==="edit" && (
                  <div className="modal-field full">
                    <div className="modal-field-label">
                      New Password
                      <span style={{fontSize:11,color:"#aaa",fontWeight:400,marginLeft:6}}>
                        (leave blank to keep current)
                      </span>
                    </div>
                    <div className="mm-pass-wrap">
                      <input
                        className="modal-input mm-pass-input"
                        type={showPw ? "text" : "password"}
                        name="plain_password"
                        value={form.plain_password}
                        onChange={handle}
                        placeholder="Enter new password (min. 6 chars)"
                      />
                      <button
                        type="button"
                        className="mm-eye-btn"
                        onClick={() => setShowPw(p => !p)}
                      >
                        {showPw ? "🙈" : "👁"}
                      </button>
                    </div>
                    <div style={{fontSize:11,color:"#aaa",marginTop:4}}>
                      💡 Changing the password will update the member's login credentials.
                    </div>
                  </div>
                )}

                {/* Date Registered */}
                <div className="modal-field full">
                  <div className="modal-field-label">Date Registered</div>
                  <div className="modal-field-value">
                    {detail?.date_registered
                      ? new Date(detail.date_registered).toLocaleDateString("en-PH", {
                          year:"numeric", month:"long", day:"numeric"
                        })
                      : "—"
                    }
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {mode==="view" ? (
            <>
              <button className="btn-modal-close" onClick={onClose}>Close</button>
              <button className="btn-modal-save" onClick={() => setMode("edit")}>✏ Edit Member</button>
            </>
          ) : (
            <>
              <button className="btn-modal-close" onClick={() => setMode("view")}>← Back</button>
              <button className="btn-modal-save" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ member, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  if (!member) return null;
  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(member.id);
    setLoading(false);
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title danger-title">Delete Member</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="delete-warning-icon">⚠️</div>
          <p className="delete-confirm-text">
            Are you sure you want to delete <strong>{member.firstname} {member.lastname}</strong>?
          </p>
          <p className="delete-sub-text">Member ID: <span className="mono">{member.member_id}</span></p>
          <p className="delete-sub-text" style={{color:"#e53935",marginTop:4}}>
            This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-modal-close" onClick={onClose}>Cancel</button>
          <button className="btn-modal-delete" onClick={handleConfirm} disabled={loading}>
            {loading ? "Deleting..." : "Yes, Delete"}
          </button>
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
        <div className="modal-header">
          <div className="modal-title">Pending Application</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="mm-view-header">
            <div className="mm-view-avatar">{(app.firstname||"A")[0]}</div>
            <div className="mm-view-info">
              <div className="mm-view-name">{app.firstname} {app.lastname}</div>
              <div className="mm-view-id">{app.app_id}</div>
              <div className="mm-view-username">Submitted {(app.submitted_at||"").slice(0,10)}</div>
            </div>
            <span className="mm-pending-badge">⏳ Pending</span>
          </div>
          <div className="mm-pending-notice">
            📋 This applicant has been approved online. They need to visit the office to complete the process.
          </div>
          <div className="mm-view-section-title">Personal Information</div>
          <div className="modal-grid">
            {[
              ["Birthdate",    app.birthdate],
              ["Gender",       app.gender],
              ["Civil Status", app.civil_status],
              ["Contact",      app.contact],
              ["Email",        app.email],
              ["Occupation",   app.occupation],
            ].map(([k,v]) => (
              <div key={k} className="modal-field">
                <div className="modal-field-label">{k}</div>
                <div className="modal-field-value">{v||"—"}</div>
              </div>
            ))}
            <div className="modal-field full">
              <div className="modal-field-label">Address</div>
              <div className="modal-field-value">{app.address||"—"}</div>
            </div>
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ManageMember() {
  const [members,      setMembers]      = useState([]);
  const [pending,      setPending]      = useState([]);
  const [stats,        setStats]        = useState({ active:0, inactive:0, suspended:0, total:0 });
  const [loading,      setLoading]      = useState(true);
  const [mainTab,      setMainTab]      = useState("official");
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilter]       = useState("All");
  const [currentPage,  setPage]         = useState(1);
  const [viewMember,   setViewMember]   = useState(null);
  const [deleteMember, setDeleteMember] = useState(null);
  const [viewPending,  setViewPending]  = useState(null);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type="success") => {
    setToast({msg,type});
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mem, st, apps] = await Promise.allSettled([
        getMembersAPI(),
        getMemberStatsAPI(),
        getApplicationsAPI({ status: "Approved" }),
      ]);
      if (mem.status==="fulfilled") setMembers(mem.value);
      if (st.status==="fulfilled")  setStats(st.value);
      if (apps.status==="fulfilled") {
        // Kunin ang lahat ng application_id ng mga official members
        const convertedIds = mem.status==="fulfilled"
          ? mem.value.map(m => m.application_id).filter(Boolean)
          : [];
        // Ipakita lang ang hindi pa na-convert sa official member
        setPending(apps.value.filter(a => !convertedIds.includes(a.id)));
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = members.filter(m => {
    const matchStatus = filterStatus==="All" || m.status===filterStatus;
    const q = search.toLowerCase();
    return matchStatus && (
      (m.firstname+" "+m.lastname).toLowerCase().includes(q) ||
      (m.member_id||"").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length/ROWS_PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = filtered.slice((safePage-1)*ROWS_PER_PAGE, safePage*ROWS_PER_PAGE);

  const handleSaveEdit = async (id, form) => {
    try {
      await updateMemberAPI(id, form);
      showToast("Member updated successfully.");
      fetchData();
    } catch { showToast("Failed to update member.", "danger"); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMemberAPI(id);
      setDeleteMember(null);
      showToast("Member deleted.", "danger");
      fetchData();
    } catch { showToast("Failed to delete member.", "danger"); }
  };

  const handleConvert = async (app) => {
    try {
      const result = await convertToMemberAPI(app.id);
      // Agad alisin sa pending list para hindi na lumabas
      setPending(prev => prev.filter(p => p.id !== app.id));
      setViewPending(null);
      showToast(`✓ ${app.firstname} ${app.lastname} is now an official member! ID: ${result.member_id}`, "success");
      // I-refresh ang members list para lumabas sa Official Members tab
      fetchData();
    } catch(err) {
      const msg = err.response?.data?.error || "Failed to convert member.";
      showToast(msg, "danger");
    }
  };

  return (
    <div className="mm-wrapper">
      {toast && <div className={`mm-toast mm-toast-${toast.type}`}>{toast.msg}</div>}

      {viewMember && (
        <ViewEditModal
          member={viewMember}
          onClose={() => setViewMember(null)}
          onSave={handleSaveEdit}
        />
      )}
      {viewPending && (
        <PendingModal
          app={viewPending}
          onClose={() => setViewPending(null)}
          onConvert={handleConvert}
        />
      )}
      <DeleteModal
        member={deleteMember}
        onClose={() => setDeleteMember(null)}
        onConfirm={handleDelete}
      />

      {/* Page Header */}
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
          <div className="mm-mini-stat" style={{cursor:"pointer"}} onClick={() => setMainTab("pending")}>
            <span className="mm-mini-val" style={{color:"#e65100"}}>{pending.length}</span>
            <span className="mm-mini-label">Pending</span>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="mm-main-tabs">
        <button className={`mm-main-tab ${mainTab==="official"?"active":""}`} onClick={() => setMainTab("official")}>
          👥 Official Members <span className="mm-tab-count">{members.length}</span>
        </button>
        <button className={`mm-main-tab ${mainTab==="pending"?"active pending-tab":""}`} onClick={() => setMainTab("pending")}>
          ⏳ Pending for Approval
          {pending.length > 0 && <span className="mm-tab-count pending-count">{pending.length}</span>}
        </button>
      </div>

      {/* Official Members Table */}
      {mainTab==="official" && (
        <div className="mm-card">
          <div className="mm-toolbar">
            <div className="mm-search-wrap">
              <span className="mm-search-icon">🔍</span>
              <input
                className="mm-search-input"
                placeholder="Search by Name or Member ID..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && <button className="mm-clear-btn" onClick={() => { setSearch(""); setPage(1); }}>✕</button>}
            </div>
            <div className="mm-filter-tabs">
              {STATUS_OPTIONS.map(s => (
                <button key={s} className={`mm-filter-tab ${filterStatus===s?"active":""}`} onClick={() => { setFilter(s); setPage(1); }}>{s}</button>
              ))}
            </div>
          </div>

          <div className="mm-table-wrap">
            <table className="mm-table">
              <thead>
                <tr>
                  <th style={{width:"14%"}}>Member ID</th>
                  <th style={{width:"30%"}}>Full Name</th>
                  <th style={{width:"16%"}}>Contact</th>
                  <th style={{width:"14%"}}>Status</th>
                  <th style={{width:"18%",textAlign:"center"}}>Manage</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="mm-empty">Loading members...</td></tr>
                ) : paginated.length===0 ? (
                  <tr><td colSpan={5} className="mm-empty">No members found.</td></tr>
                ) : paginated.map((m, idx) => (
                  <tr
                    key={m.id}
                    className={idx%2===0?"row-even":"row-odd"}
                    onClick={() => setViewMember(m)}
                    style={{cursor:"pointer"}}
                  >
                    <td className="mono cell-id">{m.member_id}</td>
                    <td className="cell-name">{m.firstname} {m.lastname}</td>
                    <td>{m.contact}</td>
                    <td><span className={`status-badge status-${(m.status||"").toLowerCase()}`}>{m.status}</span></td>
                    <td>
                      <div className="action-btns" onClick={e => e.stopPropagation()}>
                        <button className="action-btn view-btn"   title="View"   onClick={() => setViewMember(m)}>👁</button>
                        <button className="action-btn edit-btn"   title="Edit"   onClick={() => setViewMember(m)}>✏️</button>
                        <button className="action-btn delete-btn" title="Delete" onClick={() => setDeleteMember(m)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mm-footer">
            <div className="mm-count">
              Showing {filtered.length===0?0:(safePage-1)*ROWS_PER_PAGE+1}–{Math.min(safePage*ROWS_PER_PAGE,filtered.length)} of {filtered.length}
            </div>
            <div className="mm-pagination">
              <button className="page-btn" disabled={safePage===1} onClick={() => setPage(p => p-1)}>← Prev</button>
              {Array.from({length:totalPages},(_,i)=>i+1)
                .filter(p => p===1||p===totalPages||Math.abs(p-safePage)<=1)
                .reduce((acc,p,i,arr) => { if(i>0&&p-arr[i-1]>1)acc.push("..."); acc.push(p); return acc; },[])
                .map((p,i) => p==="..."
                  ? <span key={`e${i}`} className="page-ellipsis">…</span>
                  : <button key={p} className={`page-btn page-num ${safePage===p?"active":""}`} onClick={() => setPage(p)}>{p}</button>
                )}
              <button className="page-btn" disabled={safePage===totalPages} onClick={() => setPage(p => p+1)}>Next →</button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Tab */}
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
                <thead>
                  <tr>
                    <th style={{width:"14%"}}>App ID</th>
                    <th style={{width:"26%"}}>Full Name</th>
                    <th style={{width:"18%"}}>Contact</th>
                    <th style={{width:"16%"}}>Occupation</th>
                    <th style={{width:"14%"}}>Submitted</th>
                    <th style={{width:"12%",textAlign:"center"}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((p, idx) => (
                    <tr
                      key={p.id}
                      className={idx%2===0?"row-even":"row-odd"}
                      onClick={() => setViewPending(p)}
                      style={{cursor:"pointer"}}
                    >
                      <td className="mono cell-id">{p.app_id}</td>
                      <td className="cell-name">{p.firstname} {p.lastname}</td>
                      <td>{p.contact}</td>
                      <td>{p.occupation}</td>
                      <td style={{fontSize:11,color:"#888"}}>{(p.submitted_at||"").slice(0,10)}</td>
                      <td>
                        <div className="action-btns" onClick={e => e.stopPropagation()}>
                          <button className="action-btn view-btn" onClick={() => setViewPending(p)}>👁</button>
                          <button className="mm-convert-btn" onClick={() => handleConvert(p)}>✓</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}