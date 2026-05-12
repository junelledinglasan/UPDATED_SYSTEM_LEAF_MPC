import { createContext, useContext, useState } from "react";
import { loginAPI, logoutAPI } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("leaf_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // ─── Login ──────────────────────────────────────────────────────────────────
  const login = async (username, password) => {
    setLoading(true);
    setError("");
    try {
      const userData = await loginAPI(username, password);
      setUser(userData);
      return { success: true, role: userData.role };
    } catch (err) {
      const msg = err.response?.data?.detail || "Invalid username or password.";
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await logoutAPI();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}