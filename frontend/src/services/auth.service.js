import api from './api';

export const authService = {
  async login(matricula, senha) {
    const response = await api.post('/auth/login', { matricula, senha });
    if (response.data.token) {
      localStorage.setItem('farmatech_token', response.data.token);
      localStorage.setItem('farmatech_user', JSON.stringify(response.data.usuario));
    }
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('farmatech_token');
    localStorage.removeItem('farmatech_user');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('farmatech_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('farmatech_token');
  }
};
