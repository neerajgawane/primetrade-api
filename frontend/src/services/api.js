import axios from 'axios'

const api = axios.create({ baseURL: '/api/v1', headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  googleLogin: (idToken) => api.post('/auth/google', { id_token: idToken }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}

export const clientService = {
  list: (page = 1, perPage = 10) => api.get(`/clients?page=${page}&per_page=${perPage}`),
  get: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
}

export const taskService = {
  list: (page = 1, perPage = 10) => api.get(`/tasks?page=${page}&per_page=${perPage}`),
  get: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  startTimer: (id) => api.post(`/tasks/${id}/start-timer`),
  stopTimer: (id) => api.post(`/tasks/${id}/stop-timer`),
  complete: (id) => api.post(`/tasks/${id}/complete`),
}

export const invoiceService = {
  list: (page = 1, perPage = 10) => api.get(`/invoices?page=${page}&per_page=${perPage}`),
  get: (id) => api.get(`/invoices/${id}`),
  getPublic: (id) => api.get(`/invoices/${id}/public`),
}

export const paymentService = {
  createOrder: (invoiceId) => api.post('/payments/create-order', { invoice_id: invoiceId }),
}

export const dashboardService = {
  getStats: () => api.get('/dashboard'),
}

export const adminService = {
  listUsers: () => api.get('/admin/users'),
  updateRole: (userId, role) => api.patch(`/admin/users/${userId}/role`, { role }),
  deactivate: (userId) => api.patch(`/admin/users/${userId}/deactivate`),
  activate: (userId) => api.patch(`/admin/users/${userId}/activate`),
}

export default api
