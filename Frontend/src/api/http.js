// Axios wrapper for the front end. Configures a base URL from
// environment variables and attaches the JWT token to each request.

import axios from 'axios';

const http = axios.create({
  // The API base URL is configured via Vite environment variables. In development
  // this will typically be http://localhost:5000. See Frontend/.env.example.
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:5000',
  timeout: 15000,
});

// Attach the JWT to each outgoing request if it is present. Tokens are
// stored in localStorage by the auth store when login succeeds. The
// Authorization header is set using the Bearer scheme.
http.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default http;