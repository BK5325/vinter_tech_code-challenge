import api from './api';

export const getAll = (params) => api.get('/questions', { params });
export const getById = (id) => api.get(`/questions/${id}`);
export const create = (data) => api.post('/questions', data);
export const update = (id, data) => api.patch(`/questions/${id}`, data);
export const deleteQuestion = (id) => api.delete(`/questions/${id}`);
export const duplicate = (id) => api.post(`/questions/${id}/duplicate`);
export const bulkDelete = (questionIds) => api.post('/questions/bulk-delete', { questionIds });
export const deleteAll = (challengeId, confirmation) => api.post('/questions/delete-all', { challengeId, confirmation });
export const bulkImport = (data) => api.post('/questions/bulk-import', data);
export const getCategories = (params) => api.get('/questions/categories', { params });

export const questionService = {
  getAll,
  getById,
  create,
  update,
  delete: deleteQuestion,
  duplicate,
  bulkDelete,
  deleteAll,
  bulkImport,
  getCategories,
};

export default questionService;
