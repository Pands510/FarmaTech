const inventoryRepository = require('./inventory.repository');
const productsRepository = require('../products/products.repository');

class InventoryService {
  async registerBatchEntry(data, id_funcionario) {
    if (!data.id_produto || !data.id_fornecedor || !data.numero_lote || !data.data_validade || !data.quantidade) {
      const err = new Error('Campos obrigatórios: id_produto, id_fornecedor, numero_lote, data_validade e quantidade.');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }

    if (data.quantidade <= 0) {
      const err = new Error('A quantidade informada deve ser maior que zero.');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }

    const product = await productsRepository.findById(data.id_produto);
    if (!product) {
      const err = new Error('Produto referenciado não existe.');
      err.statusCode = 404;
      err.errorCode = 'PRODUCT_NOT_FOUND';
      throw err;
    }

    const id_lote = await inventoryRepository.createLoteEntry(data, id_funcionario);
    const createdLote = await inventoryRepository.findLoteById(id_lote);

    return {
      message: 'Entrada de lote registrada com sucesso.',
      lote: createdLote
    };
  }

  async manualDischarge(data, id_funcionario) {
    const { id_produto, id_lote, quantidade, motivo, observacao } = data;

    if (!id_produto || !id_lote || !quantidade || !motivo) {
      const err = new Error('Campos obrigatórios: id_produto, id_lote, quantidade e motivo.');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }

    if (quantidade <= 0) {
      const err = new Error('A quantidade de baixa deve ser maior que zero.');
      err.statusCode = 400;
      err.errorCode = 'INVALID_QUANTITY';
      throw err;
    }

    const result = await inventoryRepository.manualDischarge({
      id_produto,
      id_lote,
      quantidade,
      motivo,
      observacao,
      id_funcionario
    });

    return {
      message: 'Baixa manual de estoque realizada com sucesso.',
      ...result
    };
  }

  async getMovements(filters) {
    return await inventoryRepository.getStockMovements(filters);
  }

  async getSuppliers() {
    return await inventoryRepository.getSuppliers();
  }
}

module.exports = new InventoryService();
