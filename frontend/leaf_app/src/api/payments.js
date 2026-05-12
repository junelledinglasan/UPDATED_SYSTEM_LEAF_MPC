import api from "./axiosInstance";

export const getPaymentsAPI    = async ()     => (await api.get("/payments/")).data;
export const getPaymentStatsAPI= async ()     => (await api.get("/payments/stats/")).data;
export const recordPaymentAPI  = async (data) => (await api.post("/payments/", data)).data;
export const getPaymentAPI     = async (id)   => (await api.get(`/payments/${id}/`)).data;