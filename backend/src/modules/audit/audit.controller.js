const auditService = require('./audit.service');

class AuditController {
  async getLogs(req, res, next) {
    try {
      const filters = {
        tabela: req.query.tabela,
        operacao: req.query.operacao,
        limite: req.query.limite ? Number(req.query.limite) : 50
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
      const report = await auditService.getSalesReport(filters);
      return res.status(200).json(report);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new AuditController();
