import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor de Requisição: Injeta o token JWT do localStorage se existir
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('farmatech_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Resposta: Padroniza o tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Se a sessão expirou (401), limpa credenciais e redireciona para login se necessário
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('farmatech_token');
        localStorage.removeItem('farmatech_user');
      }
    }

    const customMessage = error.response?.data?.message || 'Erro ao comunicar com o servidor.';
    const customCode = error.response?.data?.code || 'SERVER_ERROR';

    return Promise.reject({
      ...error,
      userMessage: customMessage,
      code: customCode
    });
  }
);

export default api;
