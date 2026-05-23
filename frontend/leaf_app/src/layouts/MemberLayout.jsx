import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyProfileAPI, getMyApplicationAPI } from "../api/members";
import "./MemberLayout.css";
import logo from "../assets/logo.png";

const LOCKED_ROUTES = [
  "/member/dashboard",
  "/member/my-loans",
  "/member/apply",
];

const NAV_ITEMS = [
  { to: "/member/dashboard",     icon: "🏠", label: "Dashboard",      locked: true  },
  { to: "/member/my-loans",      icon: "💳", label: "My Loans",       locked: true  },
  { to: "/member/notifications", icon: "🔔", label: "Notifications",  locked: false },
  { to: "/member/announcements", icon: "📢", label: "Announcements",  locked: false },
  { to: "/member/apply",         icon: "📝", label: "Apply for Loan", locked: true  },
  { to: "/member/profile",       icon: "👤", label: "My Profile",     locked: false },
];

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
          <button className="ml-gate-btn-apply" onClick={onApply}>Apply for Official Membership</button>
          <button className="ml-gate-btn-cancel" onClick={onClose}>Maybe Later</button>
        </div>
      </div>
    </div>
  );
}

export default function MemberLayout() {
  const [sidebarOpen,   setSidebar]    = useState(false);
  const [notifCount,    setNotif]      = useState(0);
  const [showGate,      setShowGate]   = useState(false);
  const [memberData,    setMemberData] = useState(null);
  const [loadingMember, setLoading]    = useState(true);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { logout, user } = useAuth();

  useEffect(() => { setSidebar(false); }, [location.pathname]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const profile = await getMyProfileAPI();
        setMemberData({ ...profile, isOfficial: true });
      } catch {
        try {
          const app = await getMyApplicationAPI();
          setMemberData({ isOfficial: false, appStatus: app.status });
        } catch {
          setMemberData({ isOfficial: false, appStatus: null });
        }
      } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const isOfficial = memberData?.isOfficial || false;

  useEffect(() => {
    if (!loadingMember && !isOfficial && LOCKED_ROUTES.includes(location.pathname)) {
      navigate("/member/notifications", { replace: true });
    }
  }, [location.pathname, isOfficial, loadingMember]);

  const handleLogout = () => { logout(); navigate("/login"); };

  const handleNavClick = (item, e) => {
    if (item.locked && !isOfficial) { e.preventDefault(); setShowGate(true); }
  };

  const member = {
    name:       memberData?.fullname || user?.name || "Member",
    memberId:   memberData?.member_id || "—",
    initials:   (memberData?.first_name?.[0] || user?.name?.[0] || "M").toUpperCase(),
    isOfficial: isOfficial,
  };

  return (
    <div className="ml-layout">

      {showGate && (
        <OfficialMemberGate
          onClose={() => setShowGate(false)}
          onApply={() => { setShowGate(false); navigate("/member/apply-membership"); }}
        />
      )}

      <div className={`ml-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebar(false)} />

      {/* ── Sidebar ── */}
      <aside className={`ml-sidebar ${sidebarOpen ? "open" : ""}`}>

        {/* Logo */}
        <div className="ml-logo">
          <img
            src={logo}
            alt="LEAF MPC Logo"
            style={{ height: "35px", width: "160px", objectFit: "contain" }}
          />
        </div>

        {/* Profile strip */}
        <div className="ml-profile-strip">
          <div className="ml-avatar">{member.initials}</div>
          <div className="ml-profile-info">
            <div className="ml-profile-name">{member.name}</div>
            <div className="ml-profile-id">
              {member.memberId !== "—" ? member.memberId : "No Member ID yet"}
            </div>
          </div>
          <span
            className={`ml-status-dot ${isOfficial ? "active" : "pending"}`}
            title={isOfficial ? "Official Member" : "Not yet official"}
          />
        </div>

        {/* Non-official warning */}
        {!isOfficial && (
          <div className="ml-unofficial-notice">
            <span>⚠️</span>
            <div className="ml-unofficial-text">
              You are not yet an official member. Some features are locked.
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="ml-nav">
          {NAV_ITEMS.map(item => {
            const isLocked = item.locked && !isOfficial;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  "ml-nav-item" +
                  (isActive && !isLocked ? " active" : "") +
                  (isLocked ? " locked" : "")
                }
                onClick={e => handleNavClick(item, e)}
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

        {/* Bottom */}
        <div className="ml-sidebar-bottom">
          <button className="ml-logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="ml-main">

        {/* Topbar */}
        <header className="ml-topbar">
          <button
            className={`ml-hamburger ${sidebarOpen ? "open" : ""}`}
            onClick={() => setSidebar(s => !s)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
          <div className="ml-topbar-title">MEMBER</div>
          <div className="ml-topbar-right">
            <button className="ml-notif-btn" onClick={() => navigate("/member/notifications")}>
              🔔
              {notifCount > 0 && <span className="ml-notif-dot">{notifCount}</span>}
            </button>
            <div className="ml-topbar-avatar">{member.initials}</div>
          </div>
        </header>

        {/* Content */}
        <main className="ml-content">
          <Outlet context={{ member, notifCount, setNotif }} />
        </main>
      </div>
    </div>
  );
}