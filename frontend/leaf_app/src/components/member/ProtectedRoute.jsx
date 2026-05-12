import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// allowedRoles = ["admin"] or ["staff"] or ["member"] or ["admin","staff"]
// loginPath    = "/admin-login" or "/login"
export default function ProtectedRoute({ children, allowedRoles, loginPath = "/login" }) {
  const { user } = useAuth();

  // Hindi naka-login — puntahan ang tamang login page
  if (!user) {
    return <Navigate to={loginPath} replace />;
  }

  // Naka-login pero mali ang role — i-redirect sa tamang portal
  if (!allowedRoles.includes(user.role)) {
    if (user.role === "admin")  return <Navigate to="/admin/dashboard" replace />;
    if (user.role === "staff")  return <Navigate to="/staff/home"      replace />;
    if (user.role === "member") return <Navigate to="/member/dashboard" replace />;
  }

  return children;
}