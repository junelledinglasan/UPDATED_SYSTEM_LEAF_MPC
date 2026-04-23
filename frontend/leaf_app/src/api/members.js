import api from "./axiosInstance";

// ─── Official Members ──────────────────────────────────────────────────────────
export const getMembersAPI         = async (params={})  => (await api.get("/members/", { params })).data;
export const getMemberStatsAPI     = async ()            => (await api.get("/members/stats/")).data;
export const getMemberAPI          = async (id)          => (await api.get(`/members/${id}/`)).data;
export const registerMemberAPI     = async (data)        => (await api.post("/members/", data)).data;
export const updateMemberAPI       = async (id, data)    => (await api.put(`/members/${id}/`, data)).data;
export const updateMemberStatusAPI = async (id, status)  => (await api.patch(`/members/${id}/status/`, { status })).data;
export const deleteMemberAPI       = async (id)          => (await api.delete(`/members/${id}/`)).data;
export const getMyProfileAPI       = async ()            => (await api.get("/members/my-profile/")).data;

// ─── Membership Applications ───────────────────────────────────────────────────
export const getApplicationsAPI         = async (params={})                    => (await api.get("/members/applications/", { params })).data;
export const getApplicationAPI          = async (id)                           => (await api.get(`/members/applications/${id}/`)).data;
export const submitApplicationAPI       = async (data)                         => (await api.post("/members/applications/", data)).data;
export const updateApplicationStatusAPI = async (id, status, rejectReason="") => (await api.patch(`/members/applications/${id}/`, { status, reject_reason: rejectReason })).data;
export const getMyApplicationAPI        = async ()                             => (await api.get("/members/my-application/")).data;

// ─── Convert Application → Official Member ────────────────────────────────────
export const convertToMemberAPI = async (appId) => (await api.post(`/members/applications/${appId}/convert/`)).data;