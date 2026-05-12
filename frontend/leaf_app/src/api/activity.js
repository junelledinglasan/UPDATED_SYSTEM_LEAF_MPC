import api from "./axiosInstance";

export const getActivityLogAPI = async (limit = 50) =>
  (await api.get(`/activity-log/?limit=${limit}`)).data;