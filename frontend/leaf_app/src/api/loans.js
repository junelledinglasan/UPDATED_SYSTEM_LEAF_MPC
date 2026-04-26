import api from "./axiosInstance";

export const getLoansAPI         = async (params={})                     => (await api.get("/loans/", { params })).data;
export const getLoanAPI          = async (id)                            => (await api.get(`/loans/${id}/`)).data;
export const createLoanAPI       = async (data)                          => (await api.post("/loans/", data)).data;
export const updateLoanStatusAPI = async (id, status, declineReason="") => (await api.patch(`/loans/${id}/`, { status, decline_reason: declineReason })).data;

// ─── Collection Calendar ──────────────────────────────────────────────────────
// Returns { "2026-04-15": [...members due], "2026-04-22": [...] }
export const getDueDatesAPI = async (month="") => (await api.get(`/loans/due-dates/${month ? `?month=${month}` : ""}`)).data;