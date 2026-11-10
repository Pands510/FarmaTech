
const inventoryService = require('./inventory.service');

class InventoryController {
  async entry(req, res, next) {
    try {
      const result = await inventoryService.registerBatchEntry(
        req.body || {},
        req.user.id_funcionario
      );

      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async manualDischarge(req, res, next) {
    try {
      const result = await inventoryService.manualDischarge(
        req.body || {},
        req.user.id_funcionario
      );

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async movements(req, res, next) {
    try {
      const idProduto = req.query.id_produto;
      const limite = req.query.limite;

      const filters = {};

      if (idProduto !== undefined) {
        const parsedId = Number(idProduto);

        if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
          const error = new Error('ID do produto inválido.');
          error.statusCode = 400;
          error.errorCode = 'INVALID_PRODUCT_ID';
          throw error;
        }

        filters.id_produto = parsedId;
      }

      const parsedLimit = limite === undefined
        ? 50
        : Number(limite);

      if (
        !Number.isSafeInteger(parsedLimit) ||
        parsedLimit < 1 ||
        parsedLimit > 500
      ) {
        const error = new Error(
          'O limite deve ser um número inteiro entre 1 e 500.'
        );

        error.statusCode = 400;
        error.errorCode = 'INVALID_LIMIT';
        throw error;
      }

      filters.limite = parsedLimit;

      const movements = await inventoryService.getMovements(filters);

      return res.status(200).json(movements);
    } catch (error) {
      return next(error);
    }
  }

  async suppliers(req, res, next) {
    try {
      const suppliers = await inventoryService.getSuppliers();

      return res.status(200).json(suppliers);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new InventoryController();
