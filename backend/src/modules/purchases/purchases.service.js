const purchasesRepository = require('./purchases.repository');

class PurchasesService {
  async listPurchases(filters) {
    return await purchasesRepository.findAll(filters);
  }

  async getPurchaseById(id) {
    const purchase = await purchasesRepository.findById(id);
    if (!purchase) {
      const err = new Error(`Compra com ID ${id} não foi localizada.`);
      err.statusCode = 404;
      err.errorCode = 'PURCHASE_NOT_FOUND';
      throw err;
    }
    return purchase;
  }

  async createPurchase(data) {
    if (!data.id_fornecedor || !data.numero_nf || !Array.isArray(data.itens) || data.itens.length === 0) {
      const err = new Error('Campos obrigatórios: id_fornecedor, numero_nf e array de itens.');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }

    const id_compra = await purchasesRepository.createPurchase(data);
    return await purchasesRepository.findById(id_compra);
  }

  async receivePurchase(id_compra, lotes, id_funcionario) {
    if (!Array.isArray(lotes) || lotes.length === 0) {
      const err = new Error('Informe ao menos um lote gerado pela Nota Fiscal recebida.');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }

    for (const l of lotes) {
      if (!l.id_produto || !l.numero_lote || !l.data_validade || !l.quantidade) {
        const err = new Error('Cada lote deve conter id_produto, numero_lote, data_validade e quantidade.');
        err.statusCode = 400;
        err.errorCode = 'VALIDATION_ERROR';
        throw err;
      }
    }

    await purchasesRepository.receivePurchase(id_compra, lotes, id_funcionario);
    return await purchasesRepository.findById(id_compra);
  }
}

module.exports = new PurchasesService();
