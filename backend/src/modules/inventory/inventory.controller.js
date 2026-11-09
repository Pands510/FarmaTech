const inventoryService = require('./inventory.service');

class InventoryController {
  async entry(req, res, next) {
    try {
      const result = await inventoryService.registerBatchEntry(req.body, req.user.id_funcionario);
      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async manualDischarge(req, res, next) {
    try {
      const result = await inventoryService.manualDischarge(req.body, req.user.id_funcionario);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async movements(req, res, next) {
    try {
      const filters = {
        id_produto: req.query.id_produto ? Number(req.query.id_produto) : undefined,
        limite: req.query.limite ? Number(req.query.limite) : 50
      };
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
