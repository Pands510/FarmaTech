
const prescriptionsService = require('./prescriptions.service');

function createError(message, statusCode = 400, errorCode = 'VALIDATION_ERROR') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.errorCode = errorCode;
  return err;
}

function parsePositiveId(value, fieldName = 'id') {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError(`${fieldName} deve ser um número inteiro positivo.`);
  }

  return id;
}

function parseBoolean(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  throw createError(`${fieldName} deve ser true ou false.`);
}

class PrescriptionsController {
  async list(req, res, next) {
    try {
      const filters = {
        id_cliente: req.query.id_cliente
          ? parsePositiveId(req.query.id_cliente, 'id_cliente')
          : undefined,

        apenas_validas: parseBoolean(
          req.query.apenas_validas,
          'apenas_validas'
        ),

        limite: req.query.limite
          ? Number(req.query.limite)
          : 50
      };

      if (
        !Number.isSafeInteger(filters.limite) ||
        filters.limite < 1 ||
        filters.limite > 500
      ) {
        throw createError('O limite deve ser um inteiro entre 1 e 500.');
      }

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
      const id = parsePositiveId(req.params.id);

      const data = await prescriptionsService.getPrescriptionById(id);

      return res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const body = req.body || {};

      const created = await prescriptionsService.registerPrescription(
        body,
        req.user.id_funcionario
      );

      return res.status(201).json(created);
    } catch (error) {
      return next(error);
    }
  }

  async approve(req, res, next) {
    try {
      const id = parsePositiveId(req.params.id);

      const result = await prescriptionsService.approvePrescription(
        id,
        req.user.id_funcionario
      );

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async searchDoctors(req, res, next) {
    try {
      const { crm, uf } = req.query;

      const doctors = await prescriptionsService.searchDoctors(crm, uf);

      return res.status(200).json(doctors);
    } catch (error) {
      return next(error);
    }
  }

  async createDoctor(req, res, next) {
    try {
      const created = await prescriptionsService.createDoctor(
        req.body || {}
      );

      return res.status(201).json(created);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new PrescriptionsController();
