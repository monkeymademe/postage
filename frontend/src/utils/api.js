import axios from 'axios';

// Use environment variable if set, otherwise try to detect the correct API URL
// If running on same machine, use localhost, otherwise use Pi's IP
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Check if we're accessing from the Pi itself or from another machine
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  // Use proxy when on localhost (development)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '/api';
  }
  
  // For production/domain access:
  // If page is served over HTTPS, use relative path (assumes reverse proxy)
  // If page is served over HTTP, use HTTP with port 3001
  if (protocol === 'https:') {
    // HTTPS - use relative path, assuming reverse proxy handles /api -> backend
    return '/api';
  } else {
    // HTTP - use same hostname with port 3001
    return `http://${hostname}:3001/api`;
  }
};

// Create axios instance with dynamic baseURL
const api = axios.create({
  baseURL: '/api', // Default to relative path for proxy/reverse proxy
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to dynamically set baseURL and add auth token
api.interceptors.request.use(
  (config) => {
    // Dynamically determine API URL for each request
    const apiUrl = getApiUrl();
    config.baseURL = apiUrl;
    
    // Debug logging in development (only log once per request)
    if (import.meta.env.DEV && !config._apiUrlLogged) {
      console.log('API URL:', apiUrl, 'Protocol:', window.location.protocol, 'Hostname:', window.location.hostname);
      config._apiUrlLogged = true;
    }
    
    // Add token to requests if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
