const productsService = require('./products.service');

class ProductsController {
  async list(req, res, next) {
    try {
      const filters = {
        busca: req.query.busca,
        id_grupo: req.query.id_grupo ? Number(req.query.id_grupo) : undefined,
        status: req.query.status,
        precisa_receita: req.query.precisa_receita
      };
      const products = await productsService.listProducts(filters);
      return res.status(200).json(products);
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await productsService.getProductById(Number(req.params.id));
      return res.status(200).json(product);
    } catch (error) {
      return next(error);
    }
  }

  async getLotesFifo(req, res, next) {
    try {
      const lotes = await productsService.getLotesFifo(Number(req.params.id));
      return res.status(200).json(lotes);
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const created = await productsService.createProduct(req.body);
      return res.status(201).json(created);
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await productsService.updateProduct(Number(req.params.id), req.body);
      return res.status(200).json(updated);
    } catch (error) {
      return next(error);
    }
  }

  async inactivate(req, res, next) {
    try {
      const result = await productsService.inactivateProduct(Number(req.params.id));
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
