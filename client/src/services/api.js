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
  register: async (userData) => {
    const res = await API.post('/auth/register', userData);
    return res.data;
  },
  getMe: async () => {
    const res = await API.get('/auth/me');
    return res.data;
  },
  updateProfile: async (profileData) => {
    const res = await API.put('/auth/profile', profileData);
    return res.data;
  },
};

export const catalogService = {
  getGarments: async (category = '', search = '') => {
    const params = {};
    if (category && category !== 'All') params.category = category;
    if (search) params.search = search;
    const res = await API.get('/catalog/garments', { params });
    return res.data;
  },
  saveGarment: async (garmentData) => {
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
};

export default API;
