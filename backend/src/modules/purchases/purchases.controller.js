const purchasesService = require('./purchases.service');

class PurchasesController {
  async list(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        id_fornecedor: req.query.id_fornecedor ? Number(req.query.id_fornecedor) : undefined,
        limite: req.query.limite ? Number(req.query.limite) : 50
      };
      const purchases = await purchasesService.listPurchases(filters);
      return res.status(200).json(purchases);
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const purchase = await purchasesService.getPurchaseById(Number(req.params.id));
      return res.status(200).json(purchase);
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const created = await purchasesService.createPurchase(req.body);
      return res.status(201).json(created);
    } catch (error) {
      return next(error);
    }
  }

  async receive(req, res, next) {
    try {
      const { lotes } = req.body;
      const received = await purchasesService.receivePurchase(Number(req.params.id), lotes, req.user.id_funcionario);
      return res.status(200).json({
        message: 'Nota Fiscal e mercadorias recebidas com sucesso. Novos lotes ativados!',
        compra: received
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new PurchasesController();
