// بيكتشف تلقائي: لو شغال محلي (localhost) هيستخدم السيرفر المحلي،
// لو شغال أونلاين (بعد الرفع) هيستخدم رابط الباك اند بتاع Vercel.
const PRODUCTION_API_URL = 'https://sunbook.vercel.app/api';

const API_URL = (() => {
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
  return isLocal ? 'http://localhost:5000/api' : PRODUCTION_API_URL;
})();

// حماية XSS: أي نص جاي من المستخدم أو من السيرفر لازم يعدّي من esc() قبل ما يتحط جوه innerHTML
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// روابط الصور: بنسمح بس بـ https/http أو مسار داخلي، وأي حاجة تانية (زي javascript:) بتتحول لصورة افتراضية
function safeImg(value) {
  const s = String(value ?? '').trim();
  return /^(https?:\/\/|\/(?!\/)|assets\/|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(s) ? esc(s) : 'assets/sun-icon.png';
}

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('sunbook_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const res = await fetch(`${API_URL}${endpoint}`, { cache: 'no-store', ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      const error = new Error(data.message || 'Server Error');
      error.status = res.status;
      throw error;
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

  // بيمسح الحساب وكل بياناته المرتبطة (طلبات، حجوزات، حصص، مراجعات) نهائيًا من الباك اند
  deleteAccount: () =>
    api.request('/auth/delete-account', {
      method: 'DELETE',
    }),

  updateProfile: (data) =>
    api.request('/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getTeachers: () => api.request('/users/teachers/list'),

  getProducts: () => api.request('/products'),

  getProductsAdmin: () => api.request('/products/admin'),

  getLibrary: () => api.request('/library'),

  startReadSession: (productId, deviceId) =>
    api.request(`/reader/${encodeURIComponent(productId)}/session`, {
      method: 'POST',
      body: JSON.stringify({ deviceId }),
    }),

  fetchPage: async (productId, page, readToken) => {
    const authToken = localStorage.getItem('sunbook_token');
    const response = await fetch(
      `${API_URL}/reader/${encodeURIComponent(productId)}/page/${encodeURIComponent(page)}`,
      {
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
          'X-Read-Token': readToken,
        },
        cache: 'no-store',
      }
    );
    if (!response.ok) {
      let message = 'Could not load this page.';
      try {
        const data = await response.json();
        message = data.message || message;
      } catch (error) {
        if (!navigator.onLine) message = 'Reading requires an internet connection.';
      }
      const requestError = new Error(message);
      requestError.status = response.status;
      throw requestError;
    }
    return response.blob();
  },

  saveProgress: (productId, page) =>
    api.request(`/reader/${encodeURIComponent(productId)}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ page }),
    }),

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

  // field: 'order' (All Products) or 'featuredOrder' (Best Offers) - items: [{ id, value }]
  reorderProducts: (field, items) =>
    api.request('/products/reorder', {
      method: 'PUT',
      body: JSON.stringify({ field, items }),
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
      price: price || 1300,
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

  /** ─── الدفع عبر Geidea ─── */
  createPaymentSession: (data) =>
    api.request('/payments/session', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  confirmPayment: (id) => api.request(`/payments/${id}/confirm`, { method: 'POST' }),

  loadScript: (src) =>
    new Promise((resolve, reject) => {
      if (window.GeideaCheckout) return resolve();
      const el = document.createElement('script');
      el.src = src;
      el.onload = resolve;
      el.onerror = () => reject(new Error('Could not load the payment page. Please check your connection and try again.'));
      document.head.appendChild(el);
    }),

  /**
   * بيفتح نافذة الدفع بتاعة Geidea (العميل بيدخل بيانات الكارت/المحفظة هناك).
   * onPaid بتتنفذ بس بعد ما السيرفر يتأكد من Geidea إن الدفع نجح فعلًا.
   * onAbort بتتنفذ لو الدفع اتلغى أو فشل أو مقدرناش نبدأه.
   */
  payWithGeidea: async ({ orderId, bookingIds }, { onPaid, onAbort } = {}) => {
    const tr = (key, fallback) => (window.SunBookI18n ? window.SunBookI18n.t(key) : fallback);
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const abort = (msg) => {
      if (msg) {
        if (typeof showToast === 'function') showToast(msg, 'error');
        else alert(msg);
      }
      if (onAbort) onAbort();
    };

    let session;
    try {
      const lang = window.SunBookI18n && window.SunBookI18n.getLang ? window.SunBookI18n.getLang() : 'en';
      session = (await api.createPaymentSession({ orderId, bookingIds, language: lang })).data;
    } catch (err) {
      return abort(err.message);
    }

    // طلب مجاني بالكامل (كود خصم 100%) - السيرفر أكده بالفعل
    if (session.free) {
      if (onPaid) await onPaid();
      return;
    }

    try {
      await api.loadScript(session.hppScriptUrl);
    } catch (err) {
      return abort(err.message);
    }

    // ─── نافذة الدفع (Drop-in جوه مستطيل بشكل الموقع بدل ما تاخد الصفحة كلها) ───
    const isAr = (window.SunBookI18n && window.SunBookI18n.getLang ? window.SunBookI18n.getLang() : 'en') === 'ar';
    const overlay = document.createElement('div');
    overlay.className = 'pay-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.dir = isAr ? 'rtl' : 'ltr';
    overlay.innerHTML =
      '<div class="pay-wrap">' +
        '<button type="button" class="pay-close" aria-label="' + (isAr ? 'إغلاق' : 'Close') + '">&times;</button>' +
        '<div class="pay-box">' +
          '<div id="geidea-dropin" class="pay-dropin"></div>' +
          '<div class="pay-status" hidden></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.body.classList.add('pay-open');
    const statusEl = overlay.querySelector('.pay-status');
    const dropEl = overlay.querySelector('#geidea-dropin');
    let closed = false;
    const closeOverlay = () => {
      if (closed) return;
      closed = true;
      overlay.remove();
      document.body.classList.remove('pay-open');
    };
    const showStatus = (text) => {
      dropEl.style.display = 'none';
      statusEl.hidden = false;
      statusEl.textContent = text;
    };
    overlay.querySelector('.pay-close').addEventListener('click', () => {
      closeOverlay();
      if (onAbort) onAbort();
    });

    const onSuccess = async () => {
      let status = 'pending';
      showStatus(isAr ? 'جاري تأكيد الدفع...' : 'Confirming your payment...');
      try {
        for (let i = 0; i < 4 && status !== 'paid'; i++) {
          if (i > 0) await sleep(1500);
          status = (await api.confirmPayment(session.paymentId)).data.status;
        }
      } catch (err) {
        closeOverlay();
        return abort(err.message);
      }
      if (status !== 'paid') {
        closeOverlay();
        return abort(tr('checkout.couldNotConfirmPayment', "We couldn't confirm your payment. Your cart is still saved - please try again."));
      }
      closeOverlay();
      if (onPaid) await onPaid();
    };
    const onFail = () => { closeOverlay(); abort(tr('checkout.paymentNotCompleted', 'Payment not completed. Please try again.')); };

    try {
      new window.GeideaCheckout(onSuccess, onFail, onFail).startPayment(session.sessionId, null, 'geidea-dropin');
    } catch (err) {
      closeOverlay();
      abort(err.message);
    }
  },

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

  // ---- Reviews (تقييم + تعليق على كتاب معين) ----
  getProductReviews: (productId) => api.request(`/reviews/${productId}`),

  submitReview: (productId, rating, comment) =>
    api.request(`/reviews/${productId}`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    }),

  deleteReview: (reviewId) =>
    api.request(`/reviews/${reviewId}`, { method: 'DELETE' }),

  // ---- Site Content (النصوص القابلة للتعديل من الأدمن بالعربي والإنجليزي) ----
  getSiteContent: () => api.request('/site-content'),

  updateSiteContent: (items) =>
    api.request('/site-content', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),

  // ---- Contact Us (بتوصل بالإيميل مباشرة لصاحب الموقع) ----
  sendContactMessage: (data) =>
    api.request('/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
