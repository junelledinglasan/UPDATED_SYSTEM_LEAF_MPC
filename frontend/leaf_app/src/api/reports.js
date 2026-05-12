import api from "./axiosInstance";

export const getOverviewAPI          = async () => (await api.get("/reports/overview/")).data;
export const getMonthlyCollectionAPI = async () => (await api.get("/reports/monthly-collection/")).data;
export const getLoanStatusAPI        = async () => (await api.get("/reports/loan-status/")).data;
export const getLoanTypeAPI          = async () => (await api.get("/reports/loan-type/")).data;
export const getPaymentBehaviorAPI   = async () => (await api.get("/reports/payment-behavior/")).data;
export const getAuditLogAPI          = async () => (await api.get("/reports/audit-log/")).data;
export const previewReportAPI        = async (type, from, to) =>
  (await api.get(`/reports/preview/?type=${encodeURIComponent(type)}&from=${from}&to=${to}`)).data;

export const exportExcel = async (type, from, to) => {
  const res = await api.get(
    `/reports/export/excel/?type=${encodeURIComponent(type)}&from=${from}&to=${to}`,
    { responseType: "blob" }
  );
  const url  = URL.createObjectURL(new Blob([res.data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  }));
  const link = document.createElement("a");
  link.href  = url;
  link.download = `LEAF_MPC_${type.replace(/ /g,"_")}_${from}_to_${to}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportPDF = async (type, from, to) => {
  const res = await api.get(
    `/reports/export/pdf/?type=${encodeURIComponent(type)}&from=${from}&to=${to}`,
    { responseType: "blob" }
  );
  const url  = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href  = url;
  link.download = `LEAF_MPC_${type.replace(/ /g,"_")}_${from}_to_${to}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};