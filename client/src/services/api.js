import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT from localStorage
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('indodhobi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor to handle unauthenticated 401s
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-clear if we are already on login page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        // Token expired or invalid
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    return res.data;
  },
  customerFirebaseLogin: async ({ idToken, name, phone }) => {
    const res = await API.post('/auth/customer/firebase-login', { idToken, name, phone });
    return res.data;
  },
  staffLogin: async (email, password) => {
    const res = await API.post('/auth/staff/login', { email, password });
    return res.data;
  },
  register: async (userData) => {
    const res = await API.post('/auth/register', userData);
    return res.data;
  },
  getMe: async () => {
    const res = await API.get('/auth/me');
    return res.data;
  },
  getProfile: async () => {
    const res = await API.get('/auth/profile');
    return res.data;
  },
  completeOnboarding: async ({ name, email }) => {
    const res = await API.post('/auth/complete-onboarding', { name, email });
    return res.data;
  },
  updateProfile: async (profileData) => {
    const res = await API.put('/auth/profile', profileData);
    return res.data;
  },
  uploadAvatar: async (imageBase64) => {
    const res = await API.post('/auth/profile/avatar', { imageBase64 });
    return res.data;
  },
  addAlternatePhone: async (phoneData) => {
    const res = await API.post('/auth/profile/phones', phoneData);
    return res.data;
  },
  deleteAlternatePhone: async (phoneId) => {
    const res = await API.delete(`/auth/profile/phones/${phoneId}`);
    return res.data;
  },
  addAddress: async (addressData) => {
    const res = await API.post('/auth/addresses', addressData);
    return res.data;
  },
  updateAddress: async (addressId, addressData) => {
    const res = await API.put(`/auth/addresses/${addressId}`, addressData);
    return res.data;
  },
  deleteAddress: async (addressId) => {
    const res = await API.delete(`/auth/addresses/${addressId}`);
    return res.data;
  },
};


export const catalogService = {
  getGarments: async (category = '', search = '', includeInactive = false) => {
    const params = {};
    if (category && category !== 'All') params.category = category;
    if (search) params.search = search;
    if (includeInactive) params.includeInactive = 'true';
    const res = await API.get('/catalog/garments', { params });
    return res.data;
  },
  createGarment: async (garmentData) => {
    const res = await API.post('/catalog/garments', garmentData);
    return res.data;
  },
  updateGarment: async (id, garmentData) => {
    const res = await API.put(`/catalog/garments/${id}`, garmentData);
    return res.data;
  },
  saveGarment: async (garmentData) => {
    if (garmentData.id || garmentData._id) {
      const id = garmentData.id || garmentData._id;
      const res = await API.put(`/catalog/garments/${id}`, garmentData);
      return res.data;
    }
    const res = await API.post('/catalog/garments', garmentData);
    return res.data;
  },
};

export const orderService = {
  getSlots: async (date) => {
    const res = await API.get('/orders/slots', { params: { date } });
    return res.data;
  },
  createOrder: async (orderPayload) => {
    const res = await API.post('/orders', orderPayload);
    return res.data;
  },
  payOnline: async (orderId, paymentData) => {
    const res = await API.post(`/orders/${orderId}/pay-online`, paymentData);
    return res.data;
  },
  verifyPayment: async (paymentData) => {
    const res = await API.post('/orders/verify-payment', paymentData);
    return res.data;
  },
  retryPayment: async (orderId) => {
    const res = await API.post(`/orders/${orderId}/retry-payment`);
    return res.data;
  },
  switchToCod: async (orderId) => {
    const res = await API.post(`/orders/${orderId}/switch-to-cod`);
    return res.data;
  },
  getMyOrders: async () => {
    const res = await API.get('/orders/my-orders');
    return res.data;
  },
  getOrderById: async (id) => {
    const res = await API.get(`/orders/${id}`);
    return res.data;
  },
  getAllOrders: async (filters = {}) => {
    const res = await API.get('/orders/all', { params: filters });
    return res.data;
  },
  updateOrderStatus: async (id, statusData) => {
    const res = await API.patch(`/orders/${id}/status`, statusData);
    return res.data;
  },
  getRiders: async () => {
    const res = await API.get('/orders/riders');
    return res.data;
  },
  assignRider: async (orderId, riderId) => {
    const res = await API.patch(`/orders/${orderId}/assign-rider`, { riderId });
    return res.data;
  },
  getRiderTasks: async (filters = {}) => {
    const res = await API.get('/orders/rider-tasks', { params: filters });
    return res.data;
  },
  verifyPickup: async (orderId, pickupData) => {
    const res = await API.post(`/orders/${orderId}/verify-pickup`, pickupData);
    return res.data;
  },
  verifyDelivery: async (orderId, deliveryData) => {
    const res = await API.post(`/orders/${orderId}/verify-delivery`, deliveryData);
    return res.data;
  },
  getCoupons: async () => {
    const res = await API.get('/orders/coupons');
    return res.data;
  },
  getAllCoupons: async () => {
    const res = await API.get('/orders/coupons/all');
    return res.data;
  },
  toggleCoupon: async (id) => {
    const res = await API.patch(`/orders/coupons/${id}/toggle`);
    return res.data;
  },
  getAnalytics: async () => {
    const res = await API.get('/orders/analytics');
    return res.data;
  },
  validateCoupon: async (code, subtotal) => {
    const res = await API.post('/orders/validate-coupon', { code, subtotal });
    return res.data;
  },
  createCoupon: async (couponData) => {
    const res = await API.post('/orders/coupons', couponData);
    return res.data;
  },
  cancelOrder: async (orderId, reason = '') => {
    const res = await API.post(`/orders/${orderId}/cancel`, { reason });
    return res.data;
  },
};

export const configService = {
  getPublicConfig: async () => {
    const res = await API.get('/config/public');
    return res.data;
  },
  updateSettings: async (settingsData) => {
    const res = await API.put('/config/settings', settingsData);
    return res.data;
  },
  getAllSlots: async () => {
    const res = await API.get('/config/slots/all');
    return res.data;
  },
  createSlot: async (slotData) => {
    const res = await API.post('/config/slots', slotData);
    return res.data;
  },
  updateSlot: async (id, slotData) => {
    const res = await API.put(`/config/slots/${id}`, slotData);
    return res.data;
  },
  uploadImage: async (imagePayload, folder = 'indodhobi') => {
    const res = await API.post('/config/upload-image', { image: imagePayload, folder });
    return res.data;
  }
};

export default API;
