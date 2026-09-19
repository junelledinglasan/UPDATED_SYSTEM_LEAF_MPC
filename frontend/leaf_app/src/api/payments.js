import api from "./axiosInstance";

export const getPaymentsAPI    = async ()     => (await api.get("/payments/")).data;
export const getPaymentStatsAPI= async ()     => (await api.get("/payments/stats/")).data;
export const recordPaymentAPI  = async (data) => (await api.post("/payments/", data)).data;
export const getPaymentAPI     = async (id)   => (await api.get(`/payments/${id}/`)).data;
// ── BAGO: kunin ang Loan Release blockchain record ng isang loan (My Loans →
// Loan Details, at LoanApproval sa admin side). "api" ang ginagamit dito
// (hindi "axiosInstance") — tugma sa import statement sa itaas ng file. ──────
export const getLoanReleaseAPI  = async (loanPk) => (await api.get(`/payments/loan-release/${loanPk}/`)).data;