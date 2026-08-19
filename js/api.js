// بيكتشف تلقائي: لو شغال محلي (localhost) هيستخدم السيرفر المحلي،
// لو شغال أونلاين (بعد الرفع) هيستخدم رابط الباك اند بتاع Vercel.
const PRODUCTION_API_URL = 'https://sunbook.vercel.app/api';

const API_URL = (() => {
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
  return isLocal ? 'http://localhost:5000/api' : PRODUCTION_API_URL;
})();

// نفس دومين الباك إند بس من غير "/api" في الآخر - مستخدم عشان نبني رابط كامل لصورة مرفوعة (اللي بترجع كمسار نسبي زي /uploads/xxx.png)
const BACKEND_ORIGIN = API_URL.replace(/\/api\/?$/, '');

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

  // طريقة أسهل لتحويل حساب مسجّل لـ admin - عن طريق صفحة admin-setup.html بدل سكريبت في الـ terminal
  promoteAdmin: (email, setupKey) =>
    api.request('/users/promote-admin', {
      method: 'POST',
      body: JSON.stringify({ email, setupKey }),
    }),

  // عكسها: يرجّع حساب admin لـ "student" عشان تفضى مكان من الـ 3 المسموحين
  demoteAdmin: (email, setupKey) =>
    api.request('/users/demote-admin', {
      method: 'POST',
      body: JSON.stringify({ email, setupKey }),
    }),

  // بيرجع الأدمنز الحاليين، عشان تعرف تختار مين تشيل لو وصلت للحد الأقصى (3)
  listAdmins: (setupKey) =>
    api.request(`/users/admins-list?setupKey=${encodeURIComponent(setupKey)}`),

  // تاب الأرشيف الشهري: قايمة الشهور اللي فيها بيانات + أرقام شهر معين لبناء الـ PDF
  getAvailableMonths: () => api.request('/reports/months'),
  getMonthlyReportData: (year, month) => api.request(`/reports/monthly/${year}/${month}`),

  // Danger Zone: مسح أنواع بيانات معينة (تيست) - محمي بمفتاح الإعداد
  wipeData: (types, setupKey) =>
    api.request('/maintenance/wipe-data', {
      method: 'POST',
      body: JSON.stringify({ types, setupKey }),
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

  forgotPassword: (email) =>
    api.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token, password) =>
    api.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
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

  // بترفع صورة (base64 data URL) وترجع رابط كامل جاهز يتحط في fieldImage
  uploadImage: async (base64DataUrl) => {
    const res = await api.request('/upload', {
      method: 'POST',
      body: JSON.stringify({ image: base64DataUrl }),
    });
    return `${BACKEND_ORIGIN}${res.data.path}`;
  },

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

  /** isoDateStr بصيغة "YYYY-MM-DD" (زي ما بيرجعها input type=date)، timeStr زي "4:00 PM" */
  rescheduleBooking: (id, isoDateStr, timeStr) => {
    const [year, month, day] = isoDateStr.split('-').map(Number);
    const timeMatch = (timeStr || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
    let hours = timeMatch ? parseInt(timeMatch[1], 10) : 0;
    const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 0;
    const isPM = timeMatch && /PM/i.test(timeMatch[3]);
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    const combined = new Date(year, month - 1, day, hours, minutes);
    return api.request(`/bookings/${id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ date: combined.toISOString() }),
    });
  },

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

  /** بيرجع المواعيد المحجوزة فعليًا (من السيرفر) ليوم معين، عشان نعرف نقفل الأيام المكتملة */
  getBookingAvailability: (dateStr) => api.request(`/bookings/availability?date=${encodeURIComponent(dateStr)}`),

  /** بيرجع كل الأيام المكتملة (كل المواعيد محجوزة) في شهر معين دفعة واحدة، عشان نلوّن التقويم بسرعة */
  getMonthAvailability: (year, month) => api.request(`/bookings/availability-month?year=${year}&month=${month}`),

  cancelBooking: (id, reason) =>
    api.request(`/bookings/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  createOrder: (data) =>
    api.request('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancelOrder: (id) =>
    api.request(`/orders/${id}/cancel`, { method: 'PATCH' }),

  getOrders: () => api.request('/orders'),

  getMyOrders: () => api.request('/orders/my-orders'),

  updateOrderFulfillment: (id, fulfillmentStatus) =>
    api.request(`/orders/${id}/fulfillment`, {
      method: 'PATCH',
      body: JSON.stringify({ fulfillmentStatus }),
    }),

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

  // ---- Admin: Sessions (bookings) tab ----
  getAllBookings: () => api.request('/bookings'),

  // ---- Admin: Users tab ----
  getUsers: () => api.request('/users'),

  // ---- Promo codes ----
  getPromoCodes: () => api.request('/promocodes'),

  createPromoCode: (data) =>
    api.request('/promocodes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deactivatePromoCode: (id) =>
    api.request(`/promocodes/${id}/deactivate`, { method: 'PATCH' }),

  deletePromoCode: (id) =>
    api.request(`/promocodes/${id}`, { method: 'DELETE' }),

  validatePromoCode: (code) =>
    api.request('/promocodes/validate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
};
