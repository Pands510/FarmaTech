
const auditService = require('./audit.service');

class AuditController {
  async getLogs(req, res, next) {
    try {
      const limiteInformado = req.query.limite;
      const limite = limiteInformado === undefined
        ? 50
        : Number(limiteInformado);

      if (
        !Number.isInteger(limite) ||
        limite < 1 ||
        limite > 500
      ) {
        const error = new Error(
          'O limite deve ser um número inteiro entre 1 e 500.'
        );

        error.statusCode = 400;
        error.errorCode = 'INVALID_LIMIT';

        throw error;
      }

      const filters = {
        tabela: req.query.tabela,
        operacao: req.query.operacao,
        limite
      };

      const logs = await auditService.getLogs(filters);

      return res.status(200).json(logs);
    } catch (error) {
      return next(error);
    }
  }

  async getSalesReport(req, res, next) {
    try {
      const filters = {
        data_inicio: req.query.data_inicio,
        data_fim: req.query.data_fim
      };

      if (filters.data_inicio && filters.data_fim) {
        const dataInicio = new Date(filters.data_inicio);
        const dataFim = new Date(filters.data_fim);

        if (
          Number.isNaN(dataInicio.getTime()) ||
          Number.isNaN(dataFim.getTime()) ||
          dataInicio > dataFim
        ) {
          const error = new Error(
            'Intervalo de datas inválido.'
          );

          error.statusCode = 400;
          error.errorCode = 'INVALID_DATE_RANGE';

          throw error;
        }
      }

      const report = await auditService.getSalesReport(filters);

      return res.status(200).json(report);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new AuditController();
