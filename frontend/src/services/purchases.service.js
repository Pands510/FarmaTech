
import api from './api';

const purchasesService = {
  async listPurchases(filters = {}) {
    const response = await api.get('/compras', {
      params: filters
    });

    return response.data;
  },

  async getPurchaseById(id) {
    const response = await api.get(`/compras/${id}`);

    return response.data;
  },

  async createPurchase(data) {
    const response = await api.post('/compras', data);

    return response.data;
  },

  async receivePurchase(id, data) {
    const response = await api.post(`/compras/${id}/receber`, data);

    return response.data;
  }
};

export default purchasesService;
