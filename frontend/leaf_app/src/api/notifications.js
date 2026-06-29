// frontend/src/api/notifications.js
import api from "./axiosInstance";

export const getNotificationsAPI  = async ()     => (await api.get('/notifications/')).data;
export const getUnreadCountAPI    = async ()     => (await api.get('/notifications/unread-count/')).data;
export const markReadAPI          = async (id)   => (await api.post(`/notifications/${id}/read/`)).data;
export const markAllReadAPI       = async ()     => (await api.post('/notifications/read-all/')).data;