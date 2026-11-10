
import api from './api';

const TOKEN_KEY = 'farmatech_token';
const USER_KEY = 'farmatech_user';

export const authService = {
  async login(matricula, senha) {
    try {
      const response = await api.post('/auth/login', {
        matricula,
        senha
      });

      const { token, usuario } = response.data || {};

      if (!token || !usuario) {
        throw new Error('Resposta de autenticação inválida.');
      }

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(usuario));

      return response.data;
    } catch (error) {
      this.logout();
      throw error;
    }
  },

  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getCurrentUser() {
    const userStr = localStorage.getItem(USER_KEY);

    if (!userStr) {
      return null;
    }

    try {
      return JSON.parse(userStr);
    } catch {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY);
  }
};
