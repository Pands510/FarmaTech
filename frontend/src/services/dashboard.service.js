import api from './api';

export const dashboardService = {
  async getKpis() {
    const response = await api.get('/dashboard/kpis');
    return response.data;
  },

  async getLowStockAlerts() {
    const response = await api.get('/dashboard/alertas-estoque');
    return response.data;
  },

  async getExpiringBatches() {
    const response = await api.get('/dashboard/produtos-vencendo');
    return response.data;
  },

  async getWeeklySales() {
    const response = await api.get('/dashboard/vendas-grafico');
    return response.data;
  },

  async getSalesByCategory() {
    const response = await api.get('/dashboard/vendas-por-categoria');
    return response.data;
  }
};
