import { useState, useEffect } from "react";
import { getApplicationsAPI, getApplicationAPI, updateApplicationStatusAPI } from "../../api/members";
import { Search, ClipboardList, Clock, CheckCircle, XCircle } from "lucide-react";
import "./OnlineApplications.css";

const STATUS_TABS   = ["All", "Pending", "Approved", "Rejected"];
const ROWS_PER_PAGE = 8;
const STATUS_COLOR  = {
  Pending:  "status-pending",
  Approved: "status-approved",
  Rejected: "status-rejected",
};

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewModal({ app, loadingDetails=false, onClose, onApprove, onReject }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason,     setReason]     = useState("");

  if (!app) return null;
  const status = app.application_status || app.status || "Pending";

  const handleReject = () => {
    if (!reason.trim()) return;
    const id = app.id || app.app_id;
    onReject(id, reason);
  };

  // Backend uses snake_case — map to display
  const subAt = app.created_at?.slice(0,10) || "";
  const appId = app.app_id || app.id || "";

  const InfoRow = ({ label, value, mono=false, full=false }) => (
    <div className={`oa-info-item${full?" oa-full":""}`}>
      <span className="oa-info-key">{label}</span>
      <span className={`oa-info-val${mono?" mono":""}`}>{value || "—"}</span>
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
            <span className={`oa-badge ${STATUS_COLOR[status] || ""}`}>{status}</span>
            <button className="oa-modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="oa-modal-body">
          {loadingDetails && (
            <div style={{textAlign:"center",padding:"32px 0",color:"#aaa"}}>
              <div style={{fontSize:24,marginBottom:8}}>⏳</div>
              Loading full application details...
            </div>
          )}
          {!loadingDetails && <>
          <div className="oa-section">
            <div className="oa-section-title">Personal Information</div>
            <div className="oa-info-grid">
              <InfoRow label="Last Name"              value={app.last_name} />
              <InfoRow label="First Name"             value={app.first_name} />
              <InfoRow label="Middle Name"            value={app.middle_name} />
              <InfoRow label="Birthdate"              value={app.birth_date} />
              <InfoRow label="Civil Status"           value={app.civil_status} />
              <InfoRow label="Educational Attainment" value={app.educational_attainment} />
              <InfoRow label="Classification"         value={app.classification} />
              <InfoRow label="Occupation"             value={app.occupation} />
              <InfoRow label="Monthly Income"         value={app.income && app.income != "0.00" ? `₱${Number(app.income).toLocaleString()}` : "—"} />
              <InfoRow label="Contact No."            value={app.contact_number} mono />
              <InfoRow label="Email"                  value={app.email} mono />
              <InfoRow label="Address"                value={app.address} full />
              <InfoRow label="Birth Certificate"      value={app.birth_certificate ? "✅ Submitted" : "❌ Not submitted"} />
              <InfoRow label="Marriage Certificate"   value={app.marriage_certificate ? "✅ Submitted" : "❌ Not submitted"} />
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

          {status === "Approved" && (
            <div className="oa-notice oa-notice-approved">
              ✓ This application has been <strong>approved</strong>.
            </div>
          )}
          {status === "Rejected" && (
            <div className="oa-notice oa-notice-rejected">
              ✗ This application has been <strong>rejected</strong>.
            </div>
          )}
          </>}
        </div>

        <div className="oa-modal-footer">
          {!rejectMode ? (
            <>
              <button className="oa-btn-cancel" onClick={onClose}>Close</button>
              {status === "Pending" && (
                <>
                  <button className="oa-btn-reject-soft" onClick={() => setRejectMode(true)}>✗ Reject</button>
                  <button className="oa-btn-approve" onClick={() => onApprove(app.id || app.app_id)}>✓ Approve & Notify Member</button>
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
  const [fullAppData,  setFullAppData] = useState(null);
  const [loadingApp,   setLoadingApp]  = useState(false);
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

  // Fetch full app details when a row is clicked
  const handleViewApp = async (app) => {
    setViewApp(app);
    setFullAppData(null);
    setLoadingApp(true);
    try {
      const full = await getApplicationAPI(app.id);
      setFullAppData(full);
    } catch(e) {
      console.error("Failed to fetch app details:", e);
      setFullAppData(app); // fallback to list data
    } finally {
      setLoadingApp(false);
    }
  };

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const counts = {
    total:    apps.length,
    pending:  apps.filter(a => (a.application_status||a.status) === "Pending").length,
    approved: apps.filter(a => (a.application_status||a.status) === "Approved").length,
    rejected: apps.filter(a => (a.application_status||a.status) === "Rejected").length,
  };

  // Support both snake_case (API) and camelCase (old mock)
  const getAppId  = a => a.app_id       || a.id          || "";
  const getSubAt  = a => (a.created_at || "").slice(0,10);

  const filtered = apps.filter(a => {
    const matchStatus = filterStatus === "All" || (a.application_status||a.status) === filterStatus;
    const q = search.toLowerCase();
    const fullname = (a.fullname || `${a.first_name} ${a.last_name}`).toLowerCase();
    return matchStatus && (
      getAppId(a).toLowerCase().includes(q) ||
      fullname.includes(q) ||
      (a.contact_number || "").includes(q) ||
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
      setApps(prev => prev.map(a => (a.id === id || a.app_id === id) ? { ...a, application_status: "Approved", status: "Approved" } : a));
      setFullAppData(prev => prev ? { ...prev, application_status: "Approved" } : null);
      showToast("Application approved successfully!", "success");
    } catch(err) {
      console.error("Approve error:", err.response?.data);
      showToast("Failed to approve application.", "danger");
    }
  };

  const handleReject = async (id, reason) => {
    try {
      await updateApplicationStatusAPI(id, "Rejected", reason);
      setApps(prev => prev.map(a => (a.id === id || a.app_id === id) ? { ...a, application_status: "Rejected", status: "Rejected" } : a));
      setViewApp(null);
      setFullAppData(null);
      showToast("Application rejected.", "danger");
    } catch(err) {
      console.error("Reject error:", err.response?.data);
      showToast("Failed to reject application.", "danger");
    }
  };

  const currentViewApp = fullAppData || (viewApp
    ? apps.find(a => a.id === viewApp.id || a.app_id === viewApp.app_id)
    : null);

  return (
    <div className="oa-wrapper">

      {toast && <div className={`oa-toast oa-toast-${toast.type}`}>{toast.msg}</div>}

      <ViewModal
        app={currentViewApp}
        loadingDetails={loadingApp}
        onClose={() => { setViewApp(null); setFullAppData(null); }}
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
          <div className="oa-sum-val">{counts.total}</div><div className="oa-sum-label">Total Received</div>
        </div>
        <div className="oa-summary-card" onClick={() => { setFilter("Pending"); setPage(1); }}>
          <div className="oa-sum-val pending-val">{counts.pending}</div><div className="oa-sum-label">For Review</div>
        </div>
        <div className="oa-summary-card" onClick={() => { setFilter("Approved"); setPage(1); }}>
          <div className="oa-sum-val approved-val">{counts.approved}</div><div className="oa-sum-label">Approved</div>
        </div>
        <div className="oa-summary-card" onClick={() => { setFilter("Rejected"); setPage(1); }}>
          <div className="oa-sum-val rejected-val">{counts.rejected}</div><div className="oa-sum-label">Rejected</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="oa-card">
        <div className="oa-toolbar">
          <div className="oa-search-wrap">
            <span className="oa-search-icon"><Search size={13} color="#aaa"/></span>
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
                {s !== "All" && <span className="oa-tab-count">{apps.filter(a => (a.application_status||a.status)===s).length}</span>}
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
                  className={`oa-clickable-row row-${(app.application_status||app.status||"pending").toLowerCase()}`}
                  onClick={() => handleViewApp(app)}
                >
                  <td>
                    <div className="oa-id-cell">
                      <span className="mono cell-id">{getAppId(app)}</span>
                      <span className={`oa-badge ${STATUS_COLOR[status] || ""}`}>{status}</span>
                    </div>
                  </td>
                  <td className="cell-name">{app.fullname || `${app.last_name}, ${app.first_name}`}</td>
                  <td className="cell-date">{app.birth_date}</td>
                  <td className="mono">{app.contact_number}</td>
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