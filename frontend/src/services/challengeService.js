import api from './api';

export const challengeService = {
  getAll: (params) => api.get('/challenges', { params }),
  getById: (id) => api.get(`/challenges/${id}`),
  create: (data) => api.post('/challenges', data),
  update: (id, data) => api.patch(`/challenges/${id}`, data),
  delete: (id) => api.delete(`/challenges/${id}`),
  activate: (id) => api.post(`/challenges/${id}/activate`),
  deactivate: (id) => api.post(`/challenges/${id}/deactivate`),
  getQuestions: (id) => api.get(`/challenges/${id}/questions`),
};
