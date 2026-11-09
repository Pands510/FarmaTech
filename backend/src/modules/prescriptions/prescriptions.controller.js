const prescriptionsService = require('./prescriptions.service');

class PrescriptionsController {
  async list(req, res, next) {
    try {
      const filters = {
        id_cliente: req.query.id_cliente ? Number(req.query.id_cliente) : undefined,
        apenas_validas: req.query.apenas_validas,
        limite: req.query.limite ? Number(req.query.limite) : 50
      };
      const data = await prescriptionsService.listPrescriptions(filters);
      return res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async getPending(req, res, next) {
    try {
      const data = await prescriptionsService.getPendingPrescriptions();
      return res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await prescriptionsService.getPrescriptionById(Number(req.params.id));
      return res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const created = await prescriptionsService.registerPrescription(req.body, req.user.id_funcionario);
      return res.status(201).json(created);
    } catch (error) {
      return next(error);
    }
  }

  async approve(req, res, next) {
    try {
      const result = await prescriptionsService.approvePrescription(Number(req.params.id), req.user.id_funcionario);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async searchDoctors(req, res, next) {
    try {
      const doctors = await prescriptionsService.searchDoctors(req.query.crm, req.query.uf);
      return res.status(200).json(doctors);
    } catch (error) {
      return next(error);
    }
  }

  async createDoctor(req, res, next) {
    try {
      const created = await prescriptionsService.createDoctor(req.body);
      return res.status(201).json(created);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new PrescriptionsController();
