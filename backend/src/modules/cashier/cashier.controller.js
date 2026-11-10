
const cashierService = require('./cashier.service');

class CashierController {
  createError(message, code) {
    const error = new Error(message);
    error.statusCode = 400;
    error.errorCode = code;
    return error;
  }

  validatePositiveInteger(value, fieldName) {
    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw this.createError(
        `${fieldName} deve ser um número inteiro positivo.`,
        'INVALID_ID'
      );
    }

    return parsed;
  }

  validateMoney(value, fieldName) {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      (typeof value === 'string' && !value.trim()) ||
      !Number.isFinite(Number(value)) ||
      Number(value) < 0
    ) {
      throw this.createError(
        `${fieldName} deve ser um valor numérico maior ou igual a zero.`,
        'INVALID_MONEY_VALUE'
      );
    }

    return Number(value);
  }

  async getStatus(req, res, next) {
    try {
      const status = await cashierService.getStatus(
        req.user.id_funcionario
      );

      return res.status(200).json(status);
    } catch (error) {
      return next(error);
    }
  }

  async open(req, res, next) {
    try {
      const { valor_abertura } = req.body || {};

      const valor = this.validateMoney(
        valor_abertura,
        'valor_abertura'
      );

      const result = await cashierService.openCaixa(
        req.user.id_funcionario,
        valor
      );

      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async close(req, res, next) {
    try {
      const {
        id_caixa,
        valor_informado_dinheiro
      } = req.body || {};

      const idCaixa = this.validatePositiveInteger(
        id_caixa,
        'id_caixa'
      );

      const valorInformado = this.validateMoney(
        valor_informado_dinheiro,
        'valor_informado_dinheiro'
      );

      const result = await cashierService.closeCaixa(
        req.user.id_funcionario,
        idCaixa,
        valorInformado
      );

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async getSummary(req, res, next) {
    try {
      const idCaixa = this.validatePositiveInteger(
        req.params.id,
        'id'
      );

      const summary = await cashierService.getSummary(
        req.user.id_funcionario,
        idCaixa
      );

      return res.status(200).json(summary);
    } catch (error) {
      return next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const limite = req.query.limite === undefined
        ? 30
        : Number(req.query.limite);

      if (
        !Number.isInteger(limite) ||
        limite < 1 ||
        limite > 500
      ) {
        throw this.createError(
          'O limite deve ser um inteiro entre 1 e 500.',
          'INVALID_LIMIT'
        );
      }

      const history = await cashierService.getHistory({ limite });

      return res.status(200).json(history);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new CashierController();
