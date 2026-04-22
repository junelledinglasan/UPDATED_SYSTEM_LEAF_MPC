import api from "./axiosInstance";

// ─── Loans ─────────────────────────────────────────────────────────────────────
export const getLoansAPI         = async (params={})                    => (await api.get("/loans/", { params })).data;
export const getLoanAPI          = async (id)                           => (await api.get(`/loans/${id}/`)).data;
export const createLoanAPI       = async (data)                         => (await api.post("/loans/", data)).data;
export const updateLoanStatusAPI = async (id, status, declineReason="") => (await api.patch(`/loans/${id}/`, { status, decline_reason: declineReason })).data;