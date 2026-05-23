import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Home, CreditCard, Users, ClipboardCheck,
  FileText, BarChart2, Megaphone, LogOut,
} from "lucide-react";
import logo from "../assets/logo.png";
import "./StaffLayout.css";

// ─── Nav items per staff role ─────────────────────────────────────────────────
const NAV_BY_ROLE = {
  cashier: [
    { to: "/staff",              icon: <Home size={15} />,        label: "Home",              end: true  },
    { to: "/staff/loan-payment", icon: <CreditCard size={15} />,  label: "Loan Payment",      end: false },
  ],
  collector: [
    { to: "/staff",              icon: <Home size={15} />,        label: "Home",              end: true  },
    { to: "/staff/loan-payment", icon: <CreditCard size={15} />,  label: "Loan Payment",      end: false },
  ],
  bookkeeper: [
    { to: "/staff",         icon: <Home size={15} />,      label: "Home",    end: true  },
    { to: "/staff/reports", icon: <BarChart2 size={15} />, label: "Reports", end: false },
  ],
  admin_clerk: [
    { to: "/staff",               icon: <Home size={15} />,           label: "Home",               end: true  },
    { to: "/staff/members",       icon: <Users size={15} />,          label: "Manage Members",     end: false },
    { to: "/staff/loan-approval", icon: <ClipboardCheck size={15} />, label: "Loan Approval",      end: false },
    { to: "/staff/applications",  icon: <FileText size={15} />,       label: "Online Application", end: false },
    { to: "/staff/reports",       icon: <BarChart2 size={15} />,      label: "Reports",            end: false },
    { to: "/staff/announcement",  icon: <Megaphone size={15} />,      label: "Announcement",       end: false },
  ],
};

// ─── Topbar actions per page per role ────────────────────────────────────────
const PAGE_ACTIONS = {
  cashier: {
    "/staff/loan-payment": [
      { label: "+ New F2F Payment", cls: "sl-btn-blue", action: "f2f" },
    ],
  },
  collector: {
    "/staff/loan-payment": [
      { label: "+ New F2F Payment", cls: "sl-btn-blue", action: "f2f" },
    ],
  },
  bookkeeper: {},
  admin_clerk: {
    "/staff/members": [
      { label: "+ Register Member", cls: "sl-btn-green", action: "register" },
    ],
    "/staff/loan-approval": [],
    "/staff/applications":  [],
    "/staff/announcement":  [],
    "/staff/reports":       [],
  },
};

const STAFF_ROLE_LABELS = {
  cashier:     "Cashier",
  collector:   "Collector",
  bookkeeper:  "Bookkeeper",
  admin_clerk: "Administrative Clerk",
};

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const navigate         = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clock,       setClock]       = useState("");

  const navItems  = NAV_BY_ROLE[user?.staff_role] ?? [];
  const roleLabel = STAFF_ROLE_LABELS[user?.staff_role] ?? "Staff";

  // Topbar actions based on current page + role
  const roleActions  = PAGE_ACTIONS[user?.staff_role] ?? {};
  const pageActions  = roleActions[location.pathname] ?? [];

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    const tick = () => {
      const now  = new Date();
      const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
      const mons = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
      const pad  = n => String(n).padStart(2, "0");
      setClock(
        `${days[now.getDay()]} ${mons[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} — ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = async () => { await logout(); };

  // Action handler — dispatches custom event so child components can listen
  const handleAction = (action) => {
    window.dispatchEvent(new CustomEvent("staff-action", { detail: { action } }));
  };

  return (
    <div className="sl-layout">

      {/* Mobile sidebar overlay */}
      <div
        className={`sl-overlay-bg ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`sl-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sl-logo">
          <img
            src={logo}
            alt="LEAF MPC Logo"
            style={{ height: "35px", width: "300px", objectFit: "contain" }}
          />
        </div>

        <nav className="sl-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sl-nav-item ${isActive ? "active" : ""}`}
            >
              <span className="sl-nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sl-sidebar-bottom">
          <div className="sl-clock">{clock}</div>
          <button className="sl-logout-btn" onClick={handleLogout}>
            <LogOut size={13} />
            LOGOUT
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="sl-main">
        <header className="sl-topbar">
          <button
            className={`sl-hamburger ${sidebarOpen ? "open" : ""}`}
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
          <div className="sl-topbar-left">
            <div className="sl-topbar-brand">STAFF</div>
          </div>
          <div className="sl-topbar-right">
            {pageActions.map((action, i) => (
              <button
                key={i}
                className={`sl-btn ${action.cls}`}
                onClick={() => handleAction(action.action)}
              >
                {action.label}
              </button>
            ))}
            <div className="sl-user-chip">
              <div className="sl-user-avatar">
                {user?.name?.charAt(0)?.toUpperCase() ?? "S"}
              </div>
              <div>
                <span className="sl-user-name">{user?.name ?? "Staff"}</span>
                <span className="sl-user-role">{roleLabel}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="sl-content">
          <Outlet />
        </main>
      </div>

    </div>
  );
}