
const purchasesService = require('./purchases.service');

function parsePositiveId(value, fieldName) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    const err = new Error(`${fieldName} deve ser um número inteiro positivo.`);
    err.statusCode = 400;
    err.errorCode = 'VALIDATION_ERROR';
    throw err;
  }

  return id;
}

class PurchasesController {
  async list(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        id_fornecedor: req.query.id_fornecedor
          ? parsePositiveId(req.query.id_fornecedor, 'id_fornecedor')
          : undefined,
        limite: req.query.limite !== undefined
          ? Number(req.query.limite)
          : 50
      };

      const purchases = await purchasesService.listPurchases(filters);

      return res.status(200).json(purchases);
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const id = parsePositiveId(req.params.id, 'id_compra');

      const purchase = await purchasesService.getPurchaseById(id);

      return res.status(200).json(purchase);
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const created = await purchasesService.createPurchase(
        req.body || {}
      );

      return res.status(201).json(created);
    } catch (error) {
      return next(error);
    }
  }

  async receive(req, res, next) {
    try {
      const id = parsePositiveId(req.params.id, 'id_compra');

      const lotes = req.body?.lotes;

      if (!Array.isArray(lotes) || lotes.length === 0) {
        const err = new Error(
          'É necessário informar os lotes para receber a compra.'
        );

        err.statusCode = 400;
        err.errorCode = 'VALIDATION_ERROR';

        throw err;
      }

      if (!req.user?.id_funcionario) {
        const err = new Error(
          'Funcionário autenticado não identificado.'
        );

        err.statusCode = 401;
        err.errorCode = 'AUTH_REQUIRED';

        throw err;
      }

      const received = await purchasesService.receivePurchase(
        id,
        lotes,
        req.user.id_funcionario
      );

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
