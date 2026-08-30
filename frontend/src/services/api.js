import axios from 'axios';

const API_URL = 'https://vinter-tech-code-challenge.onrender.com' || 'https://vinter-tech-code-challenge.onrender.com';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true, // send HTTP-only cookies
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor — normalize errors
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.message || 'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);

export default api;
