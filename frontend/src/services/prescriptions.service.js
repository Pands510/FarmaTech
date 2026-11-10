
import api from './api';

const prescriptionsService = {
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

  async searchDoctors(crm, uf) {
    const response = await api.get('/medicos/busca', {
      params: { crm, uf }
    });
    return response.data;
  },

  async createDoctor(doctorData) {
    const response = await api.post('/medicos', doctorData);
    return response.data;
  }
};

export default prescriptionsService;
