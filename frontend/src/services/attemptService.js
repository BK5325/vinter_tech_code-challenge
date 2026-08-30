import api from './api';

export const attemptService = {
  start: (challengeId) => api.post('/attempts/start', { challengeId }),
  get: (id) => api.get(`/attempts/${id}`),
  getAll: (params) => api.get('/attempts', { params }),
  saveAnswer: (id, questionId, answerData) => api.post(`/attempts/${id}/answer`, { questionId, answerData }),
  toggleReview: (id, questionId, markedForReview) => api.post(`/attempts/${id}/review`, { questionId, markedForReview }),
  submit: (id) => api.post(`/attempts/${id}/submit`, { reason: 'MANUAL' }),
  logSecurityEvent: (id, eventType, metadata = {}) => api.post(`/attempts/${id}/security-event`, { eventType, metadata }),
};
