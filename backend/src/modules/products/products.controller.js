
const productsService = require('./products.service');

function createError(message, statusCode = 400, errorCode = 'VALIDATION_ERROR') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.errorCode = errorCode;
  throw err;
}

function parsePositiveId(value, fieldName = 'id') {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    createError(`${fieldName} deve ser um número inteiro positivo.`);
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

  createError(`${fieldName} deve ser true ou false.`);
}

class ProductsController {
  async list(req, res, next) {
    try {
      const filters = {
        busca: req.query.busca,
        id_grupo: req.query.id_grupo !== undefined
            ? parsePositiveId(req.query.id_grupo, 'id_grupo')
            : undefined,
        status: req.query.status,
        precisa_receita: parseBoolean(
          req.query.precisa_receita,
          'precisa_receita'
        )
      };

      const products = await productsService.listProducts(filters);

      return res.status(200).json(products);
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const id = parsePositiveId(req.params.id);

      const product = await productsService.getProductById(id);

      return res.status(200).json(product);
    } catch (error) {
      return next(error);
    }
  }

  async getLotesFifo(req, res, next) {
    try {
      const id = parsePositiveId(req.params.id);

      const lotes = await productsService.getLotesFifo(id);

      return res.status(200).json(lotes);
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const created = await productsService.createProduct(
        req.body || {}
      );

      return res.status(201).json(created);
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const id = parsePositiveId(req.params.id);

      const updated = await productsService.updateProduct(
        id,
        req.body || {}
      );

      return res.status(200).json(updated);
    } catch (error) {
      return next(error);
    }
  }

  async inactivate(req, res, next) {
    try {
      const id = parsePositiveId(req.params.id);

      const result = await productsService.inactivateProduct(id);

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async getCategories(req, res, next) {
    try {
      const categories = await productsService.getCategories();

      return res.status(200).json(categories);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new ProductsController();
