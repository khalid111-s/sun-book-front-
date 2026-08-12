// بيكتشف تلقائي: لو شغال محلي (localhost) هيستخدم السيرفر المحلي،
// لو شغال أونلاين (بعد الرفع) هيستخدم رابط الباك اند بتاع Vercel.
const PRODUCTION_API_URL = 'https://sunbook.vercel.app/api';

const API_URL = (() => {
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
  return isLocal ? 'http://localhost:5000/api' : PRODUCTION_API_URL;
})();

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('sunbook_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Server Error');
    }

    return data;
  },

  login: (email, password) =>
    api.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  googleLogin: (credential) =>
    api.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }),

  facebookLogin: (accessToken) =>
    api.request('/auth/facebook', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    }),

  register: (name, email, password, phone) =>
    api.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone, role: 'student' }),
    }),

  getMe: () => api.request('/auth/me'),

  updateProfile: (data) =>
    api.request('/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getTeachers: () => api.request('/users/teachers/list'),

  getProducts: () => api.request('/products'),

  getProduct: (id) => api.request(`/products/${id}`),

  createProduct: (data) =>
    api.request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProduct: (id, data) =>
    api.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProduct: (id) =>
    api.request(`/products/${id}`, {
      method: 'DELETE',
    }),

  createBooking: (data) =>
    api.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyBookings: () => api.request('/bookings/my-bookings'),

  cancelBooking: (id, reason) =>
    api.request(`/bookings/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  getMySessions: () => api.request('/sessions/my-sessions'),

  getSession: (id) => api.request(`/sessions/${id}`),

  joinSession: (id) =>
    api.request(`/sessions/${id}/join`, { method: 'POST' }),

  endSession: (id, feedback) =>
    api.request(`/sessions/${id}/end`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    }),

  /** حجز session عبر الـ Backend (يستخدم من checkout و booking) */
  bookSession: async ({ dateStr, timeStr, subject, price, notes }) => {
    const startTime = (timeStr || '').split('-')[0].trim();
    const parsed = new Date(`${dateStr} ${startTime}`);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Invalid booking date. Please select date and time again.');
    }

    const { data: teachers } = await api.getTeachers();
    if (!teachers || teachers.length === 0) {
      throw new Error('No teacher found. Run: npm run seed in backend folder.');
    }

    return api.createBooking({
      teacherId: teachers[0]._id,
      subject: subject || 'Exclusive One-on-One Session',
      date: parsed.toISOString(),
      duration: 30,
      price: price || 199,
      paymentMethod: 'card',
      notes: notes || `Preferred time: ${timeStr}`,
    });
  },

  createOrder: (data) =>
    api.request('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOrders: () => api.request('/orders'),

  getOrder: (id) => api.request(`/orders/${id}`),

  getOrderStats: (granularity, date) => {
    const params = new URLSearchParams();
    if (granularity) params.set('granularity', granularity);
    if (date) params.set('date', date);
    const qs = params.toString();
    return api.request(`/orders/stats/summary${qs ? `?${qs}` : ''}`);
  },

  getSettings: () => api.request('/settings'),

  updateSettings: (data) =>
    api.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getMyCountry: () => api.request('/visits/my-country'),

  logVisit: (data) =>
    api.request('/visits', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  sendHeartbeat: (data) =>
    api.request('/visits/heartbeat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOnlineCount: () => api.request('/visits/online'),

  getVisitStats: (granularity, date) => {
    const params = new URLSearchParams();
    if (granularity) params.set('granularity', granularity);
    if (date) params.set('date', date);
    const qs = params.toString();
    return api.request(`/visits/stats${qs ? `?${qs}` : ''}`);
  },

  logEvent: (data) =>
    api.request('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getClickStats: (label = 'add_to_cart') => api.request(`/events/stats/clicks?label=${encodeURIComponent(label)}`),
};
