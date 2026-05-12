import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyProfileAPI, getMyApplicationAPI } from "../api/members";
import { LayoutDashboard, CreditCard, Bell, Megaphone, FileText, User, Leaf } from "lucide-react";
import "./MemberLayout.css";

// ─── Which routes require official member status ───────────────────────────
const LOCKED_ROUTES = [
  "/member/dashboard",
  "/member/my-loans",
  "/member/apply",
];

// ─── All nav items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: "/member/dashboard",     icon: <LayoutDashboard size={15}/>, label: "Dashboard",      locked: true  },
  { to: "/member/my-loans",      icon: <CreditCard      size={15}/>, label: "My Loans",       locked: true  },
  { to: "/member/notifications", icon: <Bell            size={15}/>, label: "Notifications",  locked: false },
  { to: "/member/announcements", icon: <Megaphone       size={15}/>, label: "Announcements",  locked: false },
  { to: "/member/apply",         icon: <FileText        size={15}/>, label: "Apply for Loan", locked: true  },
  { to: "/member/profile",       icon: <User            size={15}/>, label: "My Profile",     locked: false },
];

// ─── Official Member Gate Popup ────────────────────────────────────────────
function OfficialMemberGate({ onClose, onApply }) {
  return (
    <div className="ml-gate-overlay" onClick={onClose}>
      <div className="ml-gate-box" onClick={e => e.stopPropagation()}>
        <div className="ml-gate-icon">🔒</div>
        <div className="ml-gate-title">Official Members Only</div>
        <div className="ml-gate-text">
          This feature is only available to official LEAF MPC members.
          Complete your membership to unlock full access.
        </div>
        <div className="ml-gate-features">
          <div className="ml-gate-feature-title">Unlock these features:</div>
          <div className="ml-gate-feature-item">🏠 Dashboard & loan overview</div>
          <div className="ml-gate-feature-item">💳 My Loans & payment history</div>
          <div className="ml-gate-feature-item">📝 Apply for loans online</div>
        </div>
        <div className="ml-gate-actions">
          <button className="ml-gate-btn-apply" onClick={onApply}>
            Apply for Official Membership
          </button>
          <button className="ml-gate-btn-cancel" onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Layout ───────────────────────────────────────────────────────────
export default function MemberLayout() {
  const [sidebarOpen, setSidebar]  = useState(false);
  const [notifCount,  setNotif]    = useState(0);
  const [showGate,    setShowGate] = useState(false);
  const [memberData,  setMemberData]= useState(null);
  const [loadingMember, setLoadingMember] = useState(true);
  const navigate                   = useNavigate();
  const location                   = useLocation();
  const { logout, user }           = useAuth();

  useEffect(() => { setSidebar(false); }, [location.pathname]);

  // Fetch real member status from API
  useEffect(() => {
    const fetchStatus = async () => {
      setLoadingMember(true);
      try {
        const profile = await getMyProfileAPI();
        setMemberData({ ...profile, isOfficial: true });
      } catch {
        // Not an official member — check if has application
        try {
          const app = await getMyApplicationAPI();
          setMemberData({ isOfficial: false, appStatus: app.status });
        } catch {
          setMemberData({ isOfficial: false, appStatus: null });
        }
      } finally { setLoadingMember(false); }
    };
    fetchStatus();
  }, []);

  const isOfficial = memberData?.isOfficial || false;

  // Redirect locked routes for non-official members
  useEffect(() => {
    if (!loadingMember && !isOfficial && LOCKED_ROUTES.includes(location.pathname)) {
      navigate("/member/notifications", { replace: true });
    }
  }, [location.pathname, isOfficial, loadingMember]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNavClick = (item, e) => {
    // If locked and non-official — block navigation, show gate
    if (item.locked && !isOfficial) {
      e.preventDefault();
      setShowGate(true);
    }
  };

  const handleApplyMembership = () => {
    setShowGate(false);
    navigate("/member/apply-membership");
  };

  const member = {
    name:       memberData?.fullname || user?.name || "Member",
    memberId:   memberData?.member_id || "—",
    initials:   (memberData?.firstname?.[0] || user?.name?.[0] || "M").toUpperCase(),
    status:     memberData?.status || memberData?.appStatus || "Pending",
    isOfficial: isOfficial,
  };

  return (
    <div className="ml-layout">

      {/* Official Member Gate Popup */}
      {showGate && (
        <OfficialMemberGate
          onClose={() => setShowGate(false)}
          onApply={handleApplyMembership}
        />
      )}

      <div
        className={`ml-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebar(false)}
      />

      <aside className={`ml-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="ml-logo">
          <div className="ml-logo-icon"><Leaf size={18} color="#fff"/></div>
          <div>
            <div className="ml-logo-name">Leaf MPC</div>
            <div className="ml-logo-sub">MEMBER PORTAL</div>
          </div>
        </div>

        {/* Profile strip with status badge */}
        <div className="ml-profile-strip">
          <div className="ml-avatar">{member.initials}</div>
          <div className="ml-profile-info">
            <div className="ml-profile-name">{member.name}</div>
            <div className="ml-profile-id">
              {member.memberId !== "—" ? member.memberId : "No Member ID yet"}
            </div>
          </div>
          <span
            className={`ml-status-dot ${member.isOfficial ? "active" : "pending"}`}
            title={member.isOfficial ? "Official Member" : "Pending — Not yet official"}
          />
        </div>

        {/* Non-official notice inside sidebar */}
        {!member.isOfficial && (
          <div className="ml-unofficial-notice">
            <div className="ml-unofficial-icon">⚠️</div>
            <div className="ml-unofficial-text">
              You are not yet an official member. Some features are locked.
            </div>
          </div>
        )}

        <nav className="ml-nav">
          {NAV_ITEMS.map(item => {
            const isLocked = item.locked && !member.isOfficial;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  "ml-nav-item" +
                  (isActive && !isLocked ? " active" : "") +
                  (isLocked ? " locked" : "")
                }
                onClick={(e) => handleNavClick(item, e)}
              >
                <span className="ml-nav-icon">{item.icon}</span>
                <span className="ml-nav-label">{item.label}</span>
                {item.to === "/member/notifications" && notifCount > 0 && (
                  <span className="ml-notif-badge">{notifCount}</span>
                )}
                {isLocked && <span className="ml-lock-icon">🔒</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="ml-sidebar-bottom">
          <button className="ml-logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="ml-main">
        <header className="ml-topbar">
          <button
            className={`ml-hamburger ${sidebarOpen ? "open" : ""}`}
            onClick={() => setSidebar(s => !s)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
          <div className="ml-topbar-logo">MEMBER</div>
          <div className="ml-topbar-right">
            <button
              className="ml-notif-btn"
              onClick={() => navigate("/member/notifications")}
            >
              <Bell size={18} color="#2e7d32"/>
              {notifCount > 0 && <span className="ml-notif-dot">{notifCount}</span>}
            </button>
            <div className="ml-topbar-avatar">{member.initials}</div>
          </div>
        </header>

        <main className="ml-content">
          <Outlet context={{ member, notifCount, setNotif }} />
        </main>
      </div>
    </div>
  );
}