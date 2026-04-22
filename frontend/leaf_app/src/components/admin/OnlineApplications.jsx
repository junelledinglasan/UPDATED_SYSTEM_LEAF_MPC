import { useState, useEffect } from "react";
import { getApplicationsAPI, updateApplicationStatusAPI } from "../../api/members";
import "./OnlineApplications.css";

const STATUS_TABS   = ["All", "Pending", "Approved", "Rejected"];
const ROWS_PER_PAGE = 8;
const STATUS_COLOR  = {
  Pending:  "status-pending",
  Approved: "status-approved",
  Rejected: "status-rejected",
};

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewModal({ app, onClose, onApprove, onReject }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason,     setReason]     = useState("");

  if (!app) return null;

  const handleReject = () => {
    if (!reason.trim()) return;
    onReject(app.id, reason);
  };

  // Backend uses snake_case — map to display
  const civil    = app.civil_status || app.civilStatus || "";
  const validId  = app.valid_id     || app.validId     || "";
  const idNumber = app.id_number    || app.idNumber    || "";
  const subAt    = app.submitted_at || app.submittedAt || "";
  const appId    = app.app_id       || app.id          || "";

  const InfoRow = ({ label, value, mono=false, full=false }) => (
    <div className={`oa-info-item${full?" oa-full":""}`}>
      <span className="oa-info-key">{label}</span>
      <span className={`oa-info-val${mono?" mono":""}`}>{value}</span>
    </div>
  );

  return (
    <div className="oa-modal-overlay" onClick={onClose}>
      <div className="oa-modal-box oa-modal-lg" onClick={e => e.stopPropagation()}>

        <div className="oa-modal-header">
          <div>
            <div className="oa-modal-title">Membership Application</div>
            <div className="oa-modal-sub">{appId} · Submitted {subAt}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span className={`oa-badge ${STATUS_COLOR[app.status]}`}>{app.status}</span>
            <button className="oa-modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="oa-modal-body">
          <div className="oa-section">
            <div className="oa-section-title">👤 Personal Information</div>
            <div className="oa-info-grid">
              <InfoRow label="Last Name"    value={app.lastname} />
              <InfoRow label="First Name"   value={app.firstname} />
              <InfoRow label="Middle Name"  value={app.middlename} />
              <InfoRow label="Birthdate"    value={app.birthdate} />
              <InfoRow label="Gender"       value={app.gender} />
              <InfoRow label="Civil Status" value={civil} />
              <InfoRow label="Occupation"   value={app.occupation} />
              <InfoRow label="Contact No."  value={app.contact} mono />
              <InfoRow label="Email"        value={app.email} mono />
              <InfoRow label="Address"      value={app.address} full />
            </div>
          </div>

          <div className="oa-section">
            <div className="oa-section-title">🪪 Valid Identification</div>
            <div className="oa-info-grid">
              <InfoRow label="Type of ID" value={validId} />
              <InfoRow label="ID Number"  value={idNumber} mono />
            </div>
          </div>

          <div className="oa-section">
            <div className="oa-section-title">👥 Beneficiary / Emergency Contact</div>
            <div className="oa-info-grid">
              <InfoRow label="Beneficiary Name" value={app.beneficiary} />
              <InfoRow label="Relationship"     value={app.relationship} />
            </div>
          </div>

          {rejectMode && (
            <div className="oa-section">
              <div className="oa-section-title reject-title-text">✗ Reason for Rejection</div>
              <textarea
                className="oa-textarea"
                placeholder="e.g. Incomplete requirements, applicant is underage..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>
          )}

          {app.status === "Approved" && (
            <div className="oa-notice oa-notice-approved">
              ✓ This application has been <strong>approved</strong>.
            </div>
          )}
          {app.status === "Rejected" && (
            <div className="oa-notice oa-notice-rejected">
              ✗ This application has been <strong>rejected</strong>.
            </div>
          )}
        </div>

        <div className="oa-modal-footer">
          {!rejectMode ? (
            <>
              <button className="oa-btn-cancel" onClick={onClose}>Close</button>
              {app.status === "Pending" && (
                <>
                  <button className="oa-btn-reject-soft" onClick={() => setRejectMode(true)}>✗ Reject</button>
                  <button className="oa-btn-approve" onClick={() => onApprove(app.id)}>✓ Approve & Notify Member</button>
                </>
              )}
            </>
          ) : (
            <>
              <button className="oa-btn-cancel" onClick={() => { setRejectMode(false); setReason(""); }}>← Back</button>
              <button className="oa-btn-reject-confirm" onClick={handleReject} disabled={!reason.trim()}>Confirm Rejection</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OnlineApplications() {
  const [apps,         setApps]        = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [search,       setSearch]      = useState("");
  const [filterStatus, setFilter]      = useState("All");
  const [currentPage,  setPage]        = useState(1);
  const [viewApp,      setViewApp]     = useState(null);
  const [toast,        setToast]       = useState(null);

  // ─── Fetch from real API ──────────────────────────────────────────────────
  const fetchApps = async () => {
    setLoading(true);
    try {
      const data = await getApplicationsAPI();
      setApps(data);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApps(); }, []);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const counts = {
    total:    apps.length,
    pending:  apps.filter(a => a.status === "Pending").length,
    approved: apps.filter(a => a.status === "Approved").length,
    rejected: apps.filter(a => a.status === "Rejected").length,
  };

  // Support both snake_case (API) and camelCase (old mock)
  const getAppId  = a => a.app_id       || a.id          || "";
  const getSubAt  = a => a.submitted_at || a.submittedAt || "";

  const filtered = apps.filter(a => {
    const matchStatus = filterStatus === "All" || a.status === filterStatus;
    const q = search.toLowerCase();
    const fullname = `${a.firstname} ${a.lastname}`.toLowerCase();
    return matchStatus && (
      getAppId(a).toLowerCase().includes(q) ||
      fullname.includes(q) ||
      (a.contact || "").includes(q) ||
      (a.email || "").toLowerCase().includes(q) ||
      (a.occupation || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleApprove = async (id) => {
    try {
      await updateApplicationStatusAPI(id, "Approved");
      setApps(prev => prev.map(a => (a.id === id || a.app_id === id) ? { ...a, status: "Approved" } : a));
      setViewApp(prev => prev ? { ...prev, status: "Approved" } : null);
      showToast("Application approved successfully!", "success");
    } catch {
      showToast("Failed to approve application.", "danger");
    }
  };

  const handleReject = async (id, reason) => {
    try {
      await updateApplicationStatusAPI(id, "Rejected", reason);
      setApps(prev => prev.map(a => (a.id === id || a.app_id === id) ? { ...a, status: "Rejected" } : a));
      setViewApp(null);
      showToast("Application rejected.", "danger");
    } catch {
      showToast("Failed to reject application.", "danger");
    }
  };

  const currentViewApp = viewApp
    ? apps.find(a => a.id === viewApp.id || a.app_id === viewApp.app_id)
    : null;

  return (
    <div className="oa-wrapper">

      {toast && <div className={`oa-toast oa-toast-${toast.type}`}>{toast.msg}</div>}

      <ViewModal
        app={currentViewApp}
        onClose={() => setViewApp(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Header */}
      <div className="oa-page-header">
        <div>
          <div className="oa-page-title">Online Applications</div>
          <div className="oa-page-sub">Review membership registration forms submitted online by applicants.</div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="oa-summary-grid">
        <div className="oa-summary-card" onClick={() => { setFilter("All"); setPage(1); }}>
          <div className="oa-sum-icon" style={{ background:"#e8f5e9" }}>📋</div>
          <div><div className="oa-sum-val">{counts.total}</div><div className="oa-sum-label">Total Received</div></div>
        </div>
        <div className="oa-summary-card" onClick={() => { setFilter("Pending"); setPage(1); }}>
          <div className="oa-sum-icon" style={{ background:"#fff8e1" }}>⏳</div>
          <div><div className="oa-sum-val pending-val">{counts.pending}</div><div className="oa-sum-label">For Review</div></div>
        </div>
        <div className="oa-summary-card" onClick={() => { setFilter("Approved"); setPage(1); }}>
          <div className="oa-sum-icon" style={{ background:"#e8f5e9" }}>✓</div>
          <div><div className="oa-sum-val approved-val">{counts.approved}</div><div className="oa-sum-label">Approved</div></div>
        </div>
        <div className="oa-summary-card" onClick={() => { setFilter("Rejected"); setPage(1); }}>
          <div className="oa-sum-icon" style={{ background:"#fce4ec" }}>✗</div>
          <div><div className="oa-sum-val rejected-val">{counts.rejected}</div><div className="oa-sum-label">Rejected</div></div>
        </div>
      </div>

      {/* Table Card */}
      <div className="oa-card">
        <div className="oa-toolbar">
          <div className="oa-search-wrap">
            <span className="oa-search-icon">🔍</span>
            <input
              className="oa-search-input"
              placeholder="Search by App ID, Name, Contact, or Email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            {search && <button className="oa-clear-btn" onClick={() => { setSearch(""); setPage(1); }}>✕</button>}
          </div>
          <div className="oa-status-tabs">
            {STATUS_TABS.map(s => (
              <button
                key={s}
                className={`oa-status-tab ${filterStatus===s?"active":""} tab-${s.toLowerCase()}`}
                onClick={() => { setFilter(s); setPage(1); }}
              >
                {s}
                {s !== "All" && <span className="oa-tab-count">{apps.filter(a => a.status===s).length}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="oa-table-wrap">
          <table className="oa-table">
            <thead>
              <tr>
                <th style={{ width:"12%" }}>App ID</th>
                <th style={{ width:"22%" }}>Full Name</th>
                <th style={{ width:"10%" }}>Birthdate</th>
                <th style={{ width:"13%" }}>Contact No.</th>
                <th style={{ width:"18%" }}>Email</th>
                <th style={{ width:"12%" }}>Occupation</th>
                <th style={{ width:"13%" }}>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="oa-empty">Loading applications...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="oa-empty">No applications found.</td></tr>
              ) : paginated.map((app, idx) => (
                <tr
                  key={app.id || app.app_id}
                  className={`${idx%2===0?"row-even":"row-odd"} oa-clickable-row`}
                  onClick={() => setViewApp(app)}
                >
                  <td>
                    <div className="oa-id-cell">
                      <span className="mono cell-id">{getAppId(app)}</span>
                      <span className={`oa-badge ${STATUS_COLOR[app.status]}`}>{app.status}</span>
                    </div>
                  </td>
                  <td className="cell-name">{app.lastname}, {app.firstname} {(app.middlename||"").charAt(0)}{app.middlename?"." : ""}</td>
                  <td className="cell-date">{app.birthdate}</td>
                  <td className="mono">{app.contact}</td>
                  <td className="cell-email">{app.email}</td>
                  <td>{app.occupation}</td>
                  <td className="cell-date">{getSubAt(app)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="oa-footer">
          <div className="oa-count">
            Showing {filtered.length===0 ? 0 : (safePage-1)*ROWS_PER_PAGE+1}–{Math.min(safePage*ROWS_PER_PAGE, filtered.length)} of {filtered.length} application{filtered.length!==1?"s":""}
            <span className="oa-click-hint"> — click any row to view & process</span>
          </div>
          <div className="oa-pagination">
            <button className="oa-page-btn" disabled={safePage===1} onClick={e=>{e.stopPropagation();setPage(p=>p-1);}}>← Prev</button>
            {Array.from({length:totalPages},(_,i)=>i+1)
              .filter(p=>p===1||p===totalPages||Math.abs(p-safePage)<=1)
              .reduce((acc,p,i,arr)=>{if(i>0&&p-arr[i-1]>1)acc.push("...");acc.push(p);return acc;},[])
              .map((p,i)=>p==="..."?<span key={`e${i}`} className="oa-ellipsis">…</span>:
                <button key={p} className={`oa-page-btn oa-page-num ${safePage===p?"active":""}`} onClick={e=>{e.stopPropagation();setPage(p);}}>{p}</button>
              )}
            <button className="oa-page-btn" disabled={safePage===totalPages} onClick={e=>{e.stopPropagation();setPage(p=>p+1);}}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}