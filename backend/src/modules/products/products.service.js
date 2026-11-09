const productsRepository = require('./products.repository');

class ProductsService {
  async listProducts(filters) {
    return await productsRepository.findAll(filters);
  }

  async getProductById(id) {
    const product = await productsRepository.findById(id);
    if (!product) {
      const err = new Error(`Produto com ID ${id} não foi encontrado.`);
      err.statusCode = 404;
      err.errorCode = 'PRODUCT_NOT_FOUND';
      throw err;
    }
    return product;
  }

  async getLotesFifo(id) {
    // Confirma se o produto existe
    await this.getProductById(id);
    return await productsRepository.findLotesFifo(id);
  }

  async createProduct(data) {
    if (!data.descricao || !data.id_grupo || !data.id_subgrupo || data.preco_venda === undefined) {
      const err = new Error('Campos obrigatórios: descricao, id_grupo, id_subgrupo e preco_venda.');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }

    if (data.precisa_receita && !data.e_medicamento) {
      const err = new Error('Produtos que exigem receita médica devem ser classificados como medicamento (e_medicamento = true).');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }

    const newId = await productsRepository.create(data);
    return await productsRepository.findById(newId);
  }

  async updateProduct(id, data) {
    await this.getProductById(id);

    if (data.precisa_receita && data.e_medicamento === false) {
      const err = new Error('Produtos que exigem receita médica devem ser classificados como medicamento (e_medicamento = true).');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }

    await productsRepository.update(id, data);
    return await productsRepository.findById(id);
  }

  async inactivateProduct(id) {
    await this.getProductById(id);
    await productsRepository.inactivate(id);
    return {
      message: `Produto ${id} foi inativado com sucesso mantendo a rastreabilidade histórica.`,
      status_produto: 'INATIVO'
    };
  }

  async getCategories() {
    return await productsRepository.getGroupsAndSubgroups();
  }
}

module.exports = new ProductsService();
