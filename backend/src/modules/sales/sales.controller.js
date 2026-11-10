const salesService = require('./sales.service');

class SalesController {
  async checkout(req, res, next) {
    try {
      const result = await salesService.checkout(
        req.body || {},
        req.user.id_funcionario
      );

      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async list(req, res, next) {
    try {
      const filters = {
        data_inicio: req.query.data_inicio,
        data_fim: req.query.data_fim,
        status_venda: req.query.status_venda,
        id_caixa: req.query.id_caixa,
        limite: req.query.limite ?? 50
      };

      const sales = await salesService.listSales(filters);

      return res.status(200).json(sales);
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const sale = await salesService.getSaleById(req.params.id);

      return res.status(200).json(sale);
    } catch (error) {
      return next(error);
    }
  }

  async searchCustomers(req, res, next) {
    try {
      const customers = await salesService.searchCustomers(
        req.query.busca
      );

      return res.status(200).json(customers);
    } catch (error) {
      return next(error);
    }
  }

  async createCustomer(req, res, next) {
    try {
      const customer = await salesService.createCustomer(
        req.body || {}
      );

      return res.status(201).json(customer);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new SalesController();