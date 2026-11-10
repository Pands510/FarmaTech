
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor de Requisição: Injeta o token JWT do localStorage se existir.
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

// Interceptor de Resposta: Padroniza o tratamento de erros.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    // Identifica se a requisição corresponde ao endpoint de login.
    const isLoginRequest = /\/auth\/login(?:[?#]|$)/.test(requestUrl);

    // Trata sessões expiradas ou tokens inválidos.
    if (status === 401 && !isLoginRequest) {
      localStorage.removeItem('farmatech_token');
      localStorage.removeItem('farmatech_user');

      // Redireciona somente se o usuário ainda não estiver no login.
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    // Preserva o erro original do Axios e acrescenta informações
    // que podem ser utilizadas pelos componentes da interface.
    error.userMessage =
      error.response?.data?.message ||
      'Erro ao comunicar com o servidor.';

    error.apiCode =
      error.response?.data?.code ||
      'SERVER_ERROR';

    return Promise.reject(error);
  }
);

export default api;
