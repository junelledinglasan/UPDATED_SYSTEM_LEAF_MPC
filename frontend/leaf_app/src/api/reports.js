import api from "./axiosInstance";

export const getOverviewAPI            = async (year) => (await api.get(`/reports/overview/?year=${year}`)).data;
export const getMonthlyCollectionAPI   = async (year) => (await api.get(`/reports/monthly-collection/?year=${year}`)).data;
export const getLoanStatusAPI          = async (year) => (await api.get(`/reports/loan-status/?year=${year}`)).data;
export const getLoanTypeAPI            = async (year) => (await api.get(`/reports/loan-type/?year=${year}`)).data;
export const getPaymentBehaviorAPI     = async (year) => (await api.get(`/reports/payment-behavior/?year=${year}`)).data;
export const getAuditLogAPI            = async (year) => (await api.get(`/reports/audit-log/?year=${year}`)).data;
export const getClassificationAPI      = async (year) => (await api.get(`/reports/classification/?year=${year}`)).data;
export const getMemberPerformanceAPI   = async (year) => (await api.get(`/reports/member-performance/?year=${year}&limit=20`)).data;
export const getTopBorrowersAPI        = async (year) => (await api.get(`/reports/top-borrowers/?year=${year}`)).data;
export const getLoanDistributionAPI    = async (year) => (await api.get(`/reports/loan-distribution/?year=${year}`)).data;
export const getYearlyComparisonAPI    = async ()     => (await api.get("/reports/yearly-comparison/")).data;
export const getShareCapitalAPI        = async (year) => (await api.get(`/reports/share-capital-growth/?year=${year}`)).data;
export const getOverdueAnalysisAPI     = async (year) => (await api.get(`/reports/overdue-analysis/?year=${year}`)).data;
export const getMonthlyLoansAPI        = async (year) => (await api.get(`/reports/monthly-loans/?year=${year}`)).data;

export const previewReportAPI = async (type, from, to) =>
  (await api.get(`/reports/preview/?type=${encodeURIComponent(type)}&from=${from}&to=${to}`)).data;

export const exportExcel = async (type, from, to) => {
  const res = await api.get(
    `/reports/export/excel/?type=${encodeURIComponent(type)}&from=${from}&to=${to}`,
    { responseType: "blob" }
  );
  const url = URL.createObjectURL(new Blob([res.data]));
  const a   = document.createElement("a");
  a.href     = url;
  a.download = `LEAF_MPC_${type}_${from}_to_${to}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportPDF = async (type, from, to) => {
  const res = await api.get(
    `/reports/export/pdf/?type=${encodeURIComponent(type)}&from=${from}&to=${to}`,
    { responseType: "blob" }
  );
  const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const a   = document.createElement("a");
  a.href     = url;
  a.download = `LEAF_MPC_${type}_${from}_to_${to}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── New Analytics APIs ────────────────────────────────────────────────────────
export const getRepaymentProgressAPI   = async (year)   => (await api.get(`/reports/repayment-progress/?year=${year}`)).data;
export const getDelinquencyAPI         = async (months=1) => (await api.get(`/reports/delinquency/?months=${months}`)).data;
export const getCollectionEfficiencyAPI= async (year)   => (await api.get(`/reports/collection-efficiency/?year=${year}`)).data;
export const getMemberGrowthAPI        = async (year)   => (await api.get(`/reports/member-growth/?year=${year}`)).data;
export const getLoanApprovalRateAPI    = async (year)   => (await api.get(`/reports/approval-rate/?year=${year}`)).data;
export const getUpcomingMaturitiesAPI  = async (months=3) => (await api.get(`/reports/upcoming-maturities/?months=${months}`)).data;
export const getFirstTimeBorrowersAPI  = async (year)   => (await api.get(`/reports/first-time-borrowers/?year=${year}`)).data;
export const getRiskAssessmentAPI      = async ()       => (await api.get(`/reports/risk-assessment/`)).data;