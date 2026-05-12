import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/api";

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