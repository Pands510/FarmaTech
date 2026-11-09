import api from './api';

export const prescriptionsService = {
  async getPending() {
    const response = await api.get('/receitas/pendentes');
    return response.data;
  },

  async listPrescriptions(filters = {}) {
    const response = await api.get('/receitas', { params: filters });
    return response.data;
  },

  async getPrescriptionById(id) {
    const response = await api.get(`/receitas/${id}`);
    return response.data;
  },

  async createPrescription(prescriptionData) {
    const response = await api.post('/receitas', prescriptionData);
    return response.data;
  },

  async approvePrescription(id) {
    const response = await api.post(`/receitas/${id}/aprovar`);
    return response.data;
  },

  async searchDoctors(crm, uf) {
    const response = await api.get('/medicos/busca', { params: { crm, uf } });
    return response.data;
  },

  async createDoctor(doctorData) {
    const response = await api.post('/medicos', doctorData);
    return response.data;
  }
};
