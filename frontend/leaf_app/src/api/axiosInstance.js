import axios from "axios";

// ─── Dynamic BASE URL ─────────────────────────────────────────────────────────
// Kapag naka-mobile (hindi localhost), gamitin ang actual IP ng PC
const getBaseURL = () => {
  // Kapag may VITE_API_URL sa .env — gamitin yan (production)
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`;
  }
  // Kapag local development
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://127.0.0.1:8000/api";
  }
  // Mobile access
  return `http://${hostname}:8000/api`;
};

const BASE_URL = getBaseURL();

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Attach JWT token sa bawat request ───────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("leaf_access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Auto refresh token kapag 401 ────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem("leaf_refresh_token");
        if (!refresh) throw new Error("No refresh token");
        const res = await axios.post(`${BASE_URL}/token/refresh/`, { refresh });
        const newAccess = res.data.access;
        localStorage.setItem("leaf_access_token", newAccess);
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch {
        localStorage.removeItem("leaf_access_token");
        localStorage.removeItem("leaf_refresh_token");
        localStorage.removeItem("leaf_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;