
const auditRepository = require('./audit.repository');

class AuditService {
  createError(message, code) {
    const error = new Error(message);
    error.statusCode = 400;
    error.errorCode = code;
    return error;
  }

  validateDate(date, fieldName) {
    if (date === undefined || date === null || date === '') {
      return;
    }

    if (typeof date !== 'string') {
      throw this.createError(
        `${fieldName} deve estar no formato YYYY-MM-DD.`,
        'INVALID_DATE'
      );
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

    if (!match) {
      throw this.createError(
        `${fieldName} deve estar no formato YYYY-MM-DD.`,
        'INVALID_DATE'
      );
    }

    const [, year, month, day] = match;

    const parsedDate = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day))
    );

    if (
      parsedDate.getUTCFullYear() !== Number(year) ||
      parsedDate.getUTCMonth() !== Number(month) - 1 ||
      parsedDate.getUTCDate() !== Number(day)
    ) {
      throw this.createError(
        `${fieldName} não representa uma data válida.`,
        'INVALID_DATE'
      );
    }
  }

  async getLogs(filters = {}) {
    const { tabela, operacao, limite = 50 } = filters;

    if (tabela !== undefined && typeof tabela !== 'string') {
      throw this.createError(
        'O filtro tabela deve ser um texto.',
        'INVALID_TABLE_FILTER'
      );
    }

    let operacaoNormalizada;

    if (operacao !== undefined) {
      if (typeof operacao !== 'string') {
        throw this.createError(
          'Operação de auditoria inválida.',
          'INVALID_AUDIT_OPERATION'
        );
      }

      operacaoNormalizada = operacao.trim().toUpperCase();

      if (!['INSERT', 'UPDATE', 'DELETE'].includes(operacaoNormalizada)) {
        throw this.createError(
          'Operação de auditoria inválida.',
          'INVALID_AUDIT_OPERATION'
        );
      }
    }

    const parsedLimit = Number(limite);

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 500
    ) {
      throw this.createError(
        'O limite deve ser um inteiro entre 1 e 500.',
        'INVALID_LIMIT'
      );
    }

    return auditRepository.getAuditLogs({
      tabela: tabela?.trim(),
      operacao: operacaoNormalizada,
      limite: parsedLimit
    });
  }

  async getSalesReport(filters = {}) {
    const { data_inicio, data_fim } = filters;

    this.validateDate(data_inicio, 'data_inicio');
    this.validateDate(data_fim, 'data_fim');

    if (
      data_inicio &&
      data_fim &&
      data_inicio > data_fim
    ) {
      throw this.createError(
        'A data inicial não pode ser posterior à data final.',
        'INVALID_DATE_RANGE'
      );
    }

    return auditRepository.getSalesReport({
      data_inicio,
      data_fim
    });
  }
}

module.exports = new AuditService();
