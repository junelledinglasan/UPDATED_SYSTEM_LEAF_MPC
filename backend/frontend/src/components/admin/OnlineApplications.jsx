import { useState } from "react";
import "./OnlineApplications.css";

// ─── Mock Data ───────────────────────────────────────────────────────────────
const INITIAL_APPLICATIONS = [
  {
    id: "OA-2026-001", submittedAt: "2026-03-18 09:14", status: "Pending",
    firstname: "Juan", lastname: "Dela Cruz", middlename: "Santos",
    birthdate: "1992-05-14", gender: "Male", civilStatus: "Married",
    address: "123 Rizal St., Lucena City, Quezon", contact: "09171234567",
    email: "juan.delacruz@email.com", occupation: "Teacher",
    validId: "Philippine Passport", idNumber: "P1234567A",
    beneficiary: "Maria Dela Cruz", relationship: "Spouse",
  },
  {
    id: "OA-2026-002", submittedAt: "2026-03-18 10:32", status: "Pending",
    firstname: "Maria", lastname: "Reyes", middlename: "Lopez",
    birthdate: "1988-11-03", gender: "Female", civilStatus: "Single",
    address: "45 Mabini Ave., Pagbilao, Quezon", contact: "09281234567",
    email: "maria.reyes@email.com", occupation: "Nurse",
    validId: "SSS ID", idNumber: "SS-1234-5678",
    beneficiary: "Roberto Reyes", relationship: "Father",
  },
  {
    id: "OA-2026-003", submittedAt: "2026-03-17 14:05", status: "Approved",
    firstname: "Carlos", lastname: "Bautista", middlename: "Cruz",
    birthdate: "1975-08-22", gender: "Male", civilStatus: "Married",
    address: "78 Bonifacio Rd., Tayabas City, Quezon", contact: "09391234567",
    email: "carlos.bautista@email.com", occupation: "Farmer",
    validId: "UMID", idNumber: "UM-9876543",
    beneficiary: "Linda Bautista", relationship: "Spouse",
  },
  {
    id: "OA-2026-004", submittedAt: "2026-03-17 08:50", status: "Rejected",
    firstname: "Ana", lastname: "Gonzales", middlename: "Torres",
    birthdate: "2005-01-10", gender: "Female", civilStatus: "Single",
    address: "12 Luna St., Candelaria, Quezon", contact: "09451234567",
    email: "ana.gonzales@email.com", occupation: "Student",
    validId: "School ID", idNumber: "SID-2023-001",
    beneficiary: "Rosa Gonzales", relationship: "Mother",
  },
  {
    id: "OA-2026-005", submittedAt: "2026-03-16 11:20", status: "Pending",
    firstname: "Pedro", lastname: "Villanueva", middlename: "Ramos",
    birthdate: "1983-06-30", gender: "Male", civilStatus: "Widowed",
    address: "56 Aguinaldo Blvd., Sariaya, Quezon", contact: "09561234567",
    email: "pedro.villanueva@email.com", occupation: "Carpenter",
    validId: "Driver's License", idNumber: "DL-N01-23-456789",
    beneficiary: "Luis Villanueva", relationship: "Son",
  },
  {
    id: "OA-2026-006", submittedAt: "2026-03-15 15:45", status: "Approved",
    firstname: "Ligaya", lastname: "Soriano", middlename: "Mendoza",
    birthdate: "1990-03-18", gender: "Female", civilStatus: "Married",
    address: "89 Quezon Ave., Lucena City, Quezon", contact: "09671234567",
    email: "ligaya.soriano@email.com", occupation: "Market Vendor",
    validId: "Voter's ID", idNumber: "VI-1234567",
    beneficiary: "Ramon Soriano", relationship: "Spouse",
  },
  {
    id: "OA-2026-007", submittedAt: "2026-03-14 09:00", status: "Pending",
    firstname: "Nena", lastname: "Pascual", middlename: "Aquino",
    birthdate: "1979-12-05", gender: "Female", civilStatus: "Married",
    address: "34 Magsaysay St., Lucban, Quezon", contact: "09781234567",
    email: "nena.pascual@email.com", occupation: "Seamstress",
    validId: "PhilHealth ID", idNumber: "PH-0987654",
    beneficiary: "Edgar Pascual", relationship: "Spouse",
  },
];

const STATUS_TABS   = ["All", "Pending", "Approved", "Rejected"];
const ROWS_PER_PAGE = 8;

const STATUS_COLOR = {
  Pending:  "status-pending",
  Approved: "status-approved",
  Rejected: "status-rejected",
};

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewModal({ app, onClose, onApprove, onReject }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason]         = useState("");

  if (!app) return null;

  const handleReject = () => {
    if (!reason.trim()) return;
    onReject(app.id, reason);
  };

  const InfoRow = ({ label, value, mono = false, full = false }) => (
    <div className={`oa-info-item${full ? " oa-full" : ""}`}>
      <span className="oa-info-key">{label}</span>
      <span className={`oa-info-val${mono ? " mono" : ""}`}>{value}</span>
    </div>
  );

  return (
    <div className="oa-modal-overlay" onClick={onClose}>
      <div className="oa-modal-box oa-modal-lg" onClick={e => e.stopPropagation()}>

        <div className="oa-modal-header">
          <div>
            <div className="oa-modal-title">Membership Application</div>
            <div className="oa-modal-sub">{app.id} · Submitted {app.submittedAt}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={`oa-badge ${STATUS_COLOR[app.status]}`}>{app.status}</span>
            <button className="oa-modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="oa-modal-body">

          {/* Personal Info */}
          <div className="oa-section">
            <div className="oa-section-title">👤 Personal Information</div>
            <div className="oa-info-grid">
              <InfoRow label="Last Name"    value={app.lastname} />
              <InfoRow label="First Name"   value={app.firstname} />
              <InfoRow label="Middle Name"  value={app.middlename} />
              <InfoRow label="Birthdate"    value={app.birthdate} />
              <InfoRow label="Gender"       value={app.gender} />
              <InfoRow label="Civil Status" value={app.civilStatus} />
              <InfoRow label="Occupation"   value={app.occupation} />
              <InfoRow label="Contact No."  value={app.contact} mono />
              <InfoRow label="Email"        value={app.email} mono />
              <InfoRow label="Address"      value={app.address} full />
            </div>
          </div>

          {/* Valid ID */}
          <div className="oa-section">
            <div className="oa-section-title">🪪 Valid Identification</div>
            <div className="oa-info-grid">
              <InfoRow label="Type of ID" value={app.validId} />
              <InfoRow label="ID Number"  value={app.idNumber} mono />
            </div>
          </div>

          {/* Beneficiary */}
          <div className="oa-section">
            <div className="oa-section-title">👥 Beneficiary / Emergency Contact</div>
            <div className="oa-info-grid">
              <InfoRow label="Beneficiary Name" value={app.beneficiary} />
              <InfoRow label="Relationship"      value={app.relationship} />
            </div>
          </div>

          {/* Reject reason */}
          {rejectMode && (
            <div className="oa-section">
              <div className="oa-section-title reject-title-text">✗ Reason for Rejection</div>
              <textarea
                className="oa-textarea"
                placeholder="e.g. Incomplete requirements, applicant is underage, invalid ID provided..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>
          )}

          {/* Status notices */}
          {app.status === "Approved" && (
            <div className="oa-notice oa-notice-approved">
              ✓ This application has been <strong>approved</strong>. A notification has been sent to the member to visit the office for official processing and document signing.
            </div>
          )}
          {app.status === "Rejected" && (
            <div className="oa-notice oa-notice-rejected">
              ✗ This application has been <strong>rejected</strong>. The applicant has been notified via the system.
            </div>
          )}
        </div>

        <div className="oa-modal-footer">
          {!rejectMode ? (
            <>
              <button className="oa-btn-cancel" onClick={onClose}>Close</button>
              {app.status === "Pending" && (
                <>
                  <button className="oa-btn-reject-soft" onClick={() => setRejectMode(true)}>
                    ✗ Reject
                  </button>
                  <button className="oa-btn-approve" onClick={() => onApprove(app.id)}>
                    ✓ Approve & Notify Member
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button className="oa-btn-cancel" onClick={() => { setRejectMode(false); setReason(""); }}>
                ← Back
              </button>
              <button
                className="oa-btn-reject-confirm"
                onClick={handleReject}
                disabled={!reason.trim()}
              >
                Confirm Rejection
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OnlineApplications() {
  const [apps, setApps]           = useState(INITIAL_APPLICATIONS);
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilter] = useState("All");
  const [currentPage, setPage]    = useState(1);
  const [viewApp, setViewApp]     = useState(null);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const counts = {
    total:    apps.length,
    pending:  apps.filter(a => a.status === "Pending").length,
    approved: apps.filter(a => a.status === "Approved").length,
    rejected: apps.filter(a => a.status === "Rejected").length,
  };

  const filtered = apps.filter(a => {
    const matchStatus = filterStatus === "All" || a.status === filterStatus;
    const q = search.toLowerCase();
    const fullname = `${a.firstname} ${a.lastname}`.toLowerCase();
    return matchStatus && (
      a.id.toLowerCase().includes(q) ||
      fullname.includes(q) ||
      a.contact.includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.occupation.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleApprove = (id) => {
    const app = apps.find(a => a.id === id);
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: "Approved" } : a));
    // Push to global pending store so ManageMember can pick it up
    if (app && typeof window !== "undefined") {
      if (!window.__leafPending) window.__leafPending = [];
      const already = window.__leafPending.find(p => p.appId === app.id);
      if (!already) {
        window.__leafPending.push({
          appId:        app.id,
          fullname:     `${app.firstname} ${app.lastname}`,
          contact:      app.contact,
          email:        app.email,
          occupation:   app.occupation,
          address:      app.address,
          approvedAt:   new Date().toISOString().slice(0,16).replace("T"," "),
          validId:      app.validId,
          birthdate:    app.birthdate,
          gender:       app.gender,
          civilStatus:  app.civilStatus,
          beneficiary:  app.beneficiary,
          relationship: app.relationship,
        });
      }
    }
    showToast("Application approved! Member is now in Pending for Approval list.", "success");
  };

  const handleReject = (id, reason) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: "Rejected" } : a));
    setViewApp(null);
    showToast(`Application rejected. Applicant has been notified.`, "danger");
  };

  // Always sync modal with latest app state
  const currentViewApp = viewApp ? apps.find(a => a.id === viewApp.id) : null;

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
          <div className="oa-page-sub">
            Review membership registration forms submitted online by applicants.
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="oa-summary-grid">
        <div className="oa-summary-card" onClick={() => { setFilter("All"); setPage(1); }}>
          <div className="oa-sum-icon" style={{ background: "#e8f5e9" }}>📋</div>
          <div>
            <div className="oa-sum-val">{counts.total}</div>
            <div className="oa-sum-label">Total Received</div>
          </div>
        </div>
        <div className="oa-summary-card" onClick={() => { setFilter("Pending"); setPage(1); }}>
          <div className="oa-sum-icon" style={{ background: "#fff8e1" }}>⏳</div>
          <div>
            <div className="oa-sum-val pending-val">{counts.pending}</div>
            <div className="oa-sum-label">For Review</div>
          </div>
        </div>
        <div className="oa-summary-card" onClick={() => { setFilter("Approved"); setPage(1); }}>
          <div className="oa-sum-icon" style={{ background: "#e8f5e9" }}>✓</div>
          <div>
            <div className="oa-sum-val approved-val">{counts.approved}</div>
            <div className="oa-sum-label">Approved</div>
          </div>
        </div>
        <div className="oa-summary-card" onClick={() => { setFilter("Rejected"); setPage(1); }}>
          <div className="oa-sum-icon" style={{ background: "#fce4ec" }}>✗</div>
          <div>
            <div className="oa-sum-val rejected-val">{counts.rejected}</div>
            <div className="oa-sum-label">Rejected</div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="oa-card">
        {/* Toolbar */}
        <div className="oa-toolbar">
          <div className="oa-search-wrap">
            <span className="oa-search-icon">🔍</span>
            <input
              className="oa-search-input"
              placeholder="Search by App ID, Name, Contact, or Email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button className="oa-clear-btn" onClick={() => { setSearch(""); setPage(1); }}>✕</button>
            )}
          </div>

          <div className="oa-status-tabs">
            {STATUS_TABS.map(s => (
              <button
                key={s}
                className={`oa-status-tab ${filterStatus === s ? "active" : ""} tab-${s.toLowerCase()}`}
                onClick={() => { setFilter(s); setPage(1); }}
              >
                {s}
                {s !== "All" && (
                  <span className="oa-tab-count">
                    {apps.filter(a => a.status === s).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="oa-table-wrap">
          <table className="oa-table">
            <thead>
              <tr>
                <th style={{ width: "12%" }}>App ID</th>
                <th style={{ width: "22%" }}>Full Name</th>
                <th style={{ width: "10%" }}>Birthdate</th>
                <th style={{ width: "13%" }}>Contact No.</th>
                <th style={{ width: "18%" }}>Email</th>
                <th style={{ width: "12%" }}>Occupation</th>
                <th style={{ width: "13%" }}>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="oa-empty">No applications found.</td>
                </tr>
              ) : paginated.map((app, idx) => (
                <tr
                  key={app.id}
                  className={`${idx % 2 === 0 ? "row-even" : "row-odd"} oa-clickable-row`}
                  onClick={() => setViewApp(app)}
                >
                  <td>
                    <div className="oa-id-cell">
                      <span className="mono cell-id">{app.id}</span>
                      <span className={`oa-badge ${STATUS_COLOR[app.status]}`}>{app.status}</span>
                    </div>
                  </td>
                  <td className="cell-name">{app.lastname}, {app.firstname} {app.middlename.charAt(0)}.</td>
                  <td className="cell-date">{app.birthdate}</td>
                  <td className="mono">{app.contact}</td>
                  <td className="cell-email">{app.email}</td>
                  <td>{app.occupation}</td>
                  <td className="cell-date">{app.submittedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="oa-footer">
          <div className="oa-count">
            Showing {filtered.length === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1}–
            {Math.min(safePage * ROWS_PER_PAGE, filtered.length)} of {filtered.length} application{filtered.length !== 1 ? "s" : ""}
            <span className="oa-click-hint"> — click any row to view & process</span>
          </div>
          <div className="oa-pagination">
            <button className="oa-page-btn" disabled={safePage === 1} onClick={e => { e.stopPropagation(); setPage(p => p - 1); }}>← Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`e${i}`} className="oa-ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    className={`oa-page-btn oa-page-num ${safePage === p ? "active" : ""}`}
                    onClick={e => { e.stopPropagation(); setPage(p); }}
                  >
                    {p}
                  </button>
                )
              )}
            <button className="oa-page-btn" disabled={safePage === totalPages} onClick={e => { e.stopPropagation(); setPage(p => p + 1); }}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}