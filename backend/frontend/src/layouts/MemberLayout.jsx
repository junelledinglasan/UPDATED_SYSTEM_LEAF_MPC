import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import "./MemberLayout.css";

const MEMBER = {
  name:     "Maria Santos",
  memberId: "LEAF-100-05",
  initials: "MS",
  status:   "Active",
};

const NAV_ITEMS = [
  { to: "/member/dashboard",     icon: "🏠", label: "Dashboard"      },
  { to: "/member/my-loans",      icon: "💳", label: "My Loans"       },
  { to: "/member/notifications", icon: "🔔", label: "Notifications"  },
  { to: "/member/announcements", icon: "📢", label: "Announcements"  },
  { to: "/member/apply",         icon: "📝", label: "Apply for Loan" },
  { to: "/member/profile",       icon: "👤", label: "My Profile"     },
];

export default function MemberLayout() {
  const [sidebarOpen, setSidebar] = useState(false);
  const [notifCount,  setNotif]   = useState(3);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { setSidebar(false); }, [location.pathname]);

  return (
    <div className="ml-layout">
      <div
        className={`ml-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebar(false)}
      />

      <aside className={`ml-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="ml-logo">
          <div className="ml-logo-icon">🌿</div>
          <div>
            <div className="ml-logo-name">Leaf MPC</div>
            <div className="ml-logo-sub">MEMBER PORTAL</div>
          </div>
        </div>

        <div className="ml-profile-strip">
          <div className="ml-avatar">{MEMBER.initials}</div>
          <div className="ml-profile-info">
            <div className="ml-profile-name">{MEMBER.name}</div>
            <div className="ml-profile-id">{MEMBER.memberId}</div>
          </div>
          <span className="ml-status-dot active" title="Active" />
        </div>

        <nav className="ml-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => "ml-nav-item" + (isActive ? " active" : "")}
            >
              <span className="ml-nav-icon">{item.icon}</span>
              <span className="ml-nav-label">{item.label}</span>
              {item.to === "/member/notifications" && notifCount > 0 && (
                <span className="ml-notif-badge">{notifCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-sidebar-bottom">
          <button className="ml-logout-btn" onClick={() => navigate("/")}>
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
          <div className="ml-topbar-logo"><span>🌿</span> Leaf MPC</div>
          <div className="ml-topbar-right">
            <button className="ml-notif-btn" onClick={() => navigate("/member/notifications")}>
              🔔
              {notifCount > 0 && <span className="ml-notif-dot">{notifCount}</span>}
            </button>
            <div className="ml-topbar-avatar">{MEMBER.initials}</div>
          </div>
        </header>

        <main className="ml-content">
          <Outlet context={{ member: MEMBER, notifCount, setNotif }} />
        </main>
      </div>
    </div>
  );
}