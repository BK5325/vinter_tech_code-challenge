import api from './api';

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getRoleChangeLogs: (params) => api.get('/admin/role-change-logs', { params }),
  resetAttempt: (id) => api.post(`/admin/attempts/${id}/reset`),
};

export const userService = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.patch(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  changeStatus: (id, status) => api.patch(`/users/${id}/status`, { status }),
  changeRole: (id, role, reason) => api.patch(`/users/${id}/role`, { role, reason }),
};

export const resultService = {
  getAll: (params) => api.get('/results', { params }),
  getById: (attemptId) => api.get(`/results/${attemptId}`),
};

export const rankingService = {
  getAll: (params) => api.get('/rankings', { params }),
  getByChallenge: (challengeId, params) => api.get(`/rankings/challenges/${challengeId}`, { params }),
};

export const securityService = {
  getAll: (params) => api.get('/security', { params }),
  getStats: () => api.get('/security/stats'),
};

export const reportService = {
  getResults: (params) => api.get('/reports/results', { params }),
  getParticipants: () => api.get('/reports/participants'),
  getSecurity: (params) => api.get('/reports/security', { params }),
  exportCSV: async (params) => {
    try {
      const data = await api.get('/reports/export/csv', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reports.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting CSV:', err);
    }
  },
  exportXLSX: async (params) => {
    try {
      const data = await api.get('/reports/export/xlsx', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reports.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting XLSX:', err);
    }
  },
};
