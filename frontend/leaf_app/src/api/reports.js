import api from "./axiosInstance";

export const getOverviewAPI          = async () => (await api.get("/reports/overview/")).data;
export const getMonthlyCollectionAPI = async () => (await api.get("/reports/monthly-collection/")).data;
export const getLoanStatusAPI        = async () => (await api.get("/reports/loan-status/")).data;
export const getLoanTypeAPI          = async () => (await api.get("/reports/loan-type/")).data;
export const getPaymentBehaviorAPI   = async () => (await api.get("/reports/payment-behavior/")).data;
export const getAuditLogAPI          = async () => (await api.get("/reports/audit-log/")).data;