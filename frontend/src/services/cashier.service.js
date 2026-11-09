import api from './api';

export const cashierService = {
  async getStatus() {
    const response = await api.get('/caixa/status-atual');
    return response.data;
  },

  async openCaixa(valorAbertura) {
    const response = await api.post('/caixa/abrir', { valor_abertura: valorAbertura });
    return response.data;
  },

  async closeCaixa(idCaixa, valorInformadoDinheiro) {
    const response = await api.post('/caixa/fechar', {
      id_caixa: idCaixa,
      valor_informado_dinheiro: valorInformadoDinheiro
    });
    return response.data;
  },

  async getSummary(idCaixa) {
    const response = await api.get(`/caixa/${idCaixa}/resumo`);
    return response.data;
  },

  async getHistory() {
    const response = await api.get('/caixa/historico');
    return response.data;
  }
};
