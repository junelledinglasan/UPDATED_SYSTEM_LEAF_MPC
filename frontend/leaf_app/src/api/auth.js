import api from "./axiosInstance";

export const loginAPI = async (username, password) => {
  const res = await api.post("/auth/login/", { username, password });
  const { access, refresh, user } = res.data;
  localStorage.setItem("leaf_access_token",  access);
  localStorage.setItem("leaf_refresh_token", refresh);
  localStorage.setItem("leaf_user",          JSON.stringify(user));
  return user;
};

export const logoutAPI = async () => {
  try {
    const refresh = localStorage.getItem("leaf_refresh_token");
    await api.post("/auth/logout/", { refresh });
  } catch { /* ignore */ } finally {
    localStorage.removeItem("leaf_access_token");
    localStorage.removeItem("leaf_refresh_token");
    localStorage.removeItem("leaf_user");
  }
};

export const getMeAPI              = async () => (await api.get("/auth/me/")).data;
export const getStaffListAPI       = async () => (await api.get("/auth/staff/")).data;
export const addStaffAPI           = async (data) => (await api.post("/auth/staff/", data)).data;
export const editStaffAPI          = async (id, data) => (await api.put(`/auth/staff/${id}/`, data)).data;
export const resetStaffPasswordAPI = async (id, newPassword) => (await api.post(`/auth/staff/${id}/reset-password/`, { new_password: newPassword })).data;
export const changePasswordAPI     = async (oldPassword, newPassword) => (await api.post("/auth/change-password/", { old_password: oldPassword, new_password: newPassword })).data;