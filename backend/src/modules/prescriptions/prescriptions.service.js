const prescriptionsRepository = require('./prescriptions.repository');

class PrescriptionsService {
  async listPrescriptions(filters) {
    return await prescriptionsRepository.findAll(filters);
  }

  async getPrescriptionById(id) {
    const receita = await prescriptionsRepository.findById(id);
    if (!receita) {
      const err = new Error(`Receita médica com ID ${id} não foi encontrada.`);
      err.statusCode = 404;
      err.errorCode = 'PRESCRIPTION_NOT_FOUND';
      throw err;
    }
    return receita;
  }

  async getPendingPrescriptions() {
    return await prescriptionsRepository.findPending();
  }

  async registerPrescription(data, id_funcionario) {
    if (!data.id_cliente || !data.nome_prescritor || !data.crm_prescritor || !data.data_prescricao || !data.validade_receita) {
      const err = new Error('Campos obrigatórios: id_cliente, nome_prescritor, crm_prescritor, data_prescricao e validade_receita.');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }

    if (new Date(data.validade_receita) < new Date(data.data_prescricao)) {
      const err = new Error('A data de validade da receita não pode ser anterior à data da prescrição médica.');
      err.statusCode = 400;
      err.errorCode = 'INVALID_EXPIRY_DATE';
      throw err;
    }

    const id_receita = await prescriptionsRepository.createReceita(data, id_funcionario);
    return await prescriptionsRepository.findById(id_receita);
  }

  async approvePrescription(id, id_farmaceutico) {
    const receita = await this.getPrescriptionById(id);

    if (receita.status_validade === 'VENCIDA') {
      const err = new Error('A receita médica está VENCIDA e não pode ser liberada para venda.');
      err.statusCode = 400;
      err.errorCode = 'EXPIRED_PRESCRIPTION';
      throw err;
    }

    return {
      message: 'Receita médica validada e liberada pelo farmacêutico com sucesso para o checkout.',
      id_receita: receita.id_receita,
      id_cliente: receita.id_cliente,
      status: 'APROVADA',
      farmaceutico_responsavel: id_farmaceutico
    };
  }

  async searchDoctors(crm, uf) {
    if (!crm) {
      const err = new Error('Informe o CRM para realizar a busca.');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }
    return await prescriptionsRepository.findDoctorByCrm(crm, uf);
  }

  async createDoctor(data) {
    if (!data.nome || !data.crm || !data.uf_crm) {
      const err = new Error('Campos obrigatórios: nome, crm e uf_crm.');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }
    return await prescriptionsRepository.createDoctor(data);
  }
}

module.exports = new PrescriptionsService();
