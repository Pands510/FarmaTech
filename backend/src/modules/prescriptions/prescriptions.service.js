
const prescriptionsRepository = require('./prescriptions.repository');

function createError(message, statusCode = 400, errorCode = 'VALIDATION_ERROR') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.errorCode = errorCode;
  return err;
}

function parsePositiveId(value, fieldName) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError(`${fieldName} deve ser um número inteiro positivo.`);
  }

  return id;
}

function validateText(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError(`${fieldName} deve ser informado.`);
  }

  return value.trim();
}

function validateDate(value, fieldName) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createError(`${fieldName} deve estar no formato YYYY-MM-DD.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw createError(`${fieldName} não é uma data válida.`);
  }

  return value;
}

class PrescriptionsService {
  async listPrescriptions(filters = {}) {
    return prescriptionsRepository.findAll(filters);
  }

  async getPrescriptionById(id) {
    const id_receita = parsePositiveId(id, 'id_receita');

    const receita = await prescriptionsRepository.findById(id_receita);

    if (!receita) {
      throw createError(
        `Receita médica com ID ${id_receita} não foi encontrada.`,
        404,
        'PRESCRIPTION_NOT_FOUND'
      );
    }

    return receita;
  }

  async getPendingPrescriptions() {
    return prescriptionsRepository.findPending();
  }

  async registerPrescription(data, id_funcionario) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw createError('Os dados da receita são inválidos.');
    }

    const id_cliente = parsePositiveId(data.id_cliente, 'id_cliente');

    const funcionarioId = parsePositiveId(
      id_funcionario,
      'id_funcionario'
    );

    const nome_prescritor = validateText(
      data.nome_prescritor,
      'nome_prescritor'
    );

    const crm_prescritor = validateText(
      data.crm_prescritor,
      'crm_prescritor'
    );

    const data_prescricao = validateDate(
      data.data_prescricao,
      'data_prescricao'
    );

    const validade_receita = validateDate(
      data.validade_receita,
      'validade_receita'
    );

    if (validade_receita < data_prescricao) {
      throw createError(
        'A data de validade não pode ser anterior à data da prescrição.',
        400,
        'INVALID_EXPIRY_DATE'
      );
    }

    let id_medico = null;

    if (data.id_medico !== undefined && data.id_medico !== null) {
      id_medico = parsePositiveId(data.id_medico, 'id_medico');
    }

    let observacoes = null;

    if (data.observacoes !== undefined && data.observacoes !== null) {
      if (typeof data.observacoes !== 'string') {
        throw createError('observacoes deve ser um texto.');
      }

      observacoes = data.observacoes.trim() || null;
    }

    if (!Array.isArray(data.itens) || data.itens.length === 0) {
      throw createError(
        'A receita deve possuir pelo menos um medicamento.'
      );
    }

    const itens = data.itens.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw createError(`O item ${index + 1} é inválido.`);
      }

      const id_produto = parsePositiveId(
        item.id_produto,
        `itens[${index}].id_produto`
      );

      const quantidade = Number(item.quantidade);

      if (!Number.isSafeInteger(quantidade) || quantidade <= 0) {
        throw createError(
          `A quantidade do item ${index + 1} deve ser um inteiro positivo.`
        );
      }

      let posologia = null;

      if (item.posologia !== undefined && item.posologia !== null) {
        if (typeof item.posologia !== 'string') {
          throw createError(
            `A posologia do item ${index + 1} deve ser um texto.`
          );
        }

        posologia = item.posologia.trim() || null;
      }

      return {
        id_produto,
        quantidade,
        posologia
      };
    });

    const receitaData = {
      id_cliente,
      id_medico,
      nome_prescritor,
      crm_prescritor,
      data_prescricao,
      validade_receita,
      observacoes,
      itens
    };

    const id_receita = await prescriptionsRepository.createReceita(
      receitaData,
      funcionarioId
    );

    return this.getPrescriptionById(id_receita);
  }

  async approvePrescription(id, id_farmaceutico) {
    parsePositiveId(id, 'id_receita');
    parsePositiveId(id_farmaceutico, 'id_farmaceutico');

    // Não retornar sucesso enquanto a aprovação não for persistida.
    throw createError(
      'A aprovação de receitas ainda não possui persistência implementada no banco de dados.',
      501,
      'APPROVAL_NOT_IMPLEMENTED'
    );
  }

  async searchDoctors(crm, uf) {
    const crmValidado = validateText(crm, 'crm');

    let ufValidada;

    if (uf !== undefined && uf !== null && uf !== '') {
      ufValidada = validateText(uf, 'uf').toUpperCase();

      if (!/^[A-Z]{2}$/.test(ufValidada)) {
        throw createError('A UF deve conter duas letras.');
      }
    }

    return prescriptionsRepository.findDoctorByCrm(
      crmValidado,
      ufValidada
    );
  }

  async createDoctor(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw createError('Os dados do médico são inválidos.');
    }

    const nome = validateText(data.nome, 'nome');
    const crm = validateText(data.crm, 'crm');
    const uf_crm = validateText(data.uf_crm, 'uf_crm').toUpperCase();

    if (!/^[A-Z]{2}$/.test(uf_crm)) {
      throw createError('A UF do CRM deve conter duas letras.');
    }

    let especialidade = null;

    if (data.especialidade !== undefined && data.especialidade !== null) {
      if (typeof data.especialidade !== 'string') {
        throw createError('especialidade deve ser um texto.');
      }

      especialidade = data.especialidade.trim() || null;
    }

    return prescriptionsRepository.createDoctor({
      nome,
      crm,
      uf_crm,
      especialidade
    });
  }
}

module.exports = new PrescriptionsService();
