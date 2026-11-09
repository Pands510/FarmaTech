import api from './api';

export const salesService = {
  async checkout(payload) {
    // payload: { id_caixa, id_cliente, itens: [...], pagamentos: [...], desconto_valor }
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
    const response = await api.get('/vendas/clientes', { params: { busca } });
    return response.data;
  },

  async createCustomer(customerData) {
    const response = await api.post('/vendas/clientes', customerData);
    return response.data;
  }
};
