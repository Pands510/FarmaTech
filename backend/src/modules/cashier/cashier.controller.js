const cashierService = require('./cashier.service');

class CashierController {
  async getStatus(req, res, next) {
    try {
      const status = await cashierService.getStatus(req.user.id_funcionario);
      return res.status(200).json(status);
    } catch (error) {
      return next(error);
    }
  }

  async open(req, res, next) {
    try {
      const { valor_abertura } = req.body;
      const result = await cashierService.openCaixa(req.user.id_funcionario, valor_abertura);
      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async close(req, res, next) {
    try {
      const { id_caixa, valor_informado_dinheiro } = req.body;
      const result = await cashierService.closeCaixa(Number(id_caixa), valor_informado_dinheiro);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async getSummary(req, res, next) {
    try {
      const summary = await cashierService.getSummary(Number(req.params.id));
      return res.status(200).json(summary);
    } catch (error) {
      return next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const history = await cashierService.getHistory({
        limite: req.query.limite ? Number(req.query.limite) : 30
      });
      return res.status(200).json(history);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new CashierController();
