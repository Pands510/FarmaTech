
import api from './api';

const salesService = {
  async checkout(payload) {
    const response = await api.post('/vendas/checkout', payload);
    return response.data;
  },

  async listSales(filters = {}) {
    const response = await api.get('/vendas', { params: filters });
    return response.data;
  },

  async getSaleById(id) {
    const response = await api.get(`/vendas/${id}`);
    return response.data;
  },

  async searchCustomers(busca) {
    const response = await api.get('/vendas/clientes', {
      params: { busca }
    });
    return response.data;
  },

  async createCustomer(customerData) {
    const response = await api.post('/vendas/clientes', customerData);
    return response.data;
  }
};

export default salesService;
