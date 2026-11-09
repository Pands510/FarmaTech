import api from './api';

export const inventoryService = {
  async listProducts(filters = {}) {
    const response = await api.get('/produtos', { params: filters });
    return response.data;
  },

  async getProductById(id) {
    const response = await api.get(`/produtos/${id}`);
    return response.data;
  },

  async getLotesFifo(idProduto) {
    const response = await api.get(`/produtos/${idProduto}/lotes-fifo`);
    return response.data;
  },

  async getCategories() {
    const response = await api.get('/produtos/categorias');
    return response.data;
  },

  async createProduct(productData) {
    const response = await api.post('/produtos', productData);
    return response.data;
  },

  async inactivateProduct(id) {
    const response = await api.patch(`/produtos/${id}/inativar`);
    return response.data;
  },

  async registerBatchEntry(entryData) {
    const response = await api.post('/estoque/entrada', entryData);
    return response.data;
  },

  async manualDischarge(dischargeData) {
    // dischargeData: { id_produto, id_lote, quantidade, motivo, observacao }
    const response = await api.post('/estoque/baixa-manual', dischargeData);
    return response.data;
  },

  async getMovements(filters = {}) {
    const response = await api.get('/estoque/movimentos', { params: filters });
    return response.data;
  },

  async getSuppliers() {
    const response = await api.get('/estoque/fornecedores');
    return response.data;
  }
};
