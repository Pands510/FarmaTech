
const inventoryRepository = require('./inventory.repository');
const productsRepository = require('../products/products.repository');

function createError(message, statusCode = 400, errorCode = 'VALIDATION_ERROR') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.errorCode = errorCode;
  return err;
}

function parsePositiveId(value, fieldName) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError(`${fieldName} deve ser um número inteiro positivo.`);
  }

  return id;
}

function parsePositiveQuantity(value, fieldName = 'quantidade') {
  const quantity = Number(value);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw createError(`${fieldName} deve ser um número maior que zero.`);
  }

  return quantity;
}

function validateDate(value, fieldName) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createError(`${fieldName} deve estar no formato YYYY-MM-DD.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw createError(`${fieldName} não é uma data válida.`);
  }

  return value;
}

function validateText(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError(`${fieldName} deve ser informado como texto.`);
  }

  return value.trim();
}

class InventoryService {
  async registerBatchEntry(data, id_funcionario) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw createError('Os dados da entrada de estoque são inválidos.');
    }

    const id_produto = parsePositiveId(data.id_produto, 'id_produto');
    const id_fornecedor = parsePositiveId(data.id_fornecedor, 'id_fornecedor');
    const quantidade = parsePositiveQuantity(data.quantidade);

    const numero_lote = validateText(data.numero_lote, 'numero_lote');
    const data_validade = validateDate(data.data_validade, 'data_validade');

    const id_funcionario_validado = parsePositiveId(
      id_funcionario,
      'id_funcionario'
    );

    let data_fabricacao = null;

    if (data.data_fabricacao) {
      data_fabricacao = validateDate(
        data.data_fabricacao,
        'data_fabricacao'
      );

      if (data_fabricacao > data_validade) {
        throw createError(
          'A data de fabricação não pode ser posterior à data de validade.'
        );
      }
    }

    let preco_custo_lote = 0;

    if (data.preco_custo_lote !== undefined && data.preco_custo_lote !== null) {
      preco_custo_lote = Number(data.preco_custo_lote);

      if (!Number.isFinite(preco_custo_lote) || preco_custo_lote < 0) {
        throw createError(
          'O preço de custo do lote deve ser um número válido e não negativo.'
        );
      }
    }

    let id_compra = null;

    if (data.id_compra !== undefined && data.id_compra !== null) {
      id_compra = parsePositiveId(data.id_compra, 'id_compra');
    }

    const product = await productsRepository.findById(id_produto);

    if (!product) {
      throw createError(
        'Produto referenciado não existe.',
        404,
        'PRODUCT_NOT_FOUND'
      );
    }

    const loteData = {
      ...data,
      id_produto,
      id_fornecedor,
      quantidade,
      numero_lote,
      data_validade,
      data_fabricacao,
      preco_custo_lote,
      id_compra
    };

    const id_lote = await inventoryRepository.createLoteEntry(
      loteData,
      id_funcionario_validado
    );

    const createdLote = await inventoryRepository.findLoteById(id_lote);

    if (!createdLote) {
      throw createError(
        'A entrada foi registrada, mas não foi possível recuperar o lote criado.',
        500,
        'CREATED_BATCH_NOT_FOUND'
      );
    }

    return {
      message: 'Entrada de lote registrada com sucesso.',
      lote: createdLote
    };
  }

  async manualDischarge(data, id_funcionario) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw createError('Os dados da baixa de estoque são inválidos.');
    }

    const id_produto = parsePositiveId(data.id_produto, 'id_produto');
    const id_lote = parsePositiveId(data.id_lote, 'id_lote');
    const quantidade = parsePositiveQuantity(data.quantidade);
    const motivo = validateText(data.motivo, 'motivo');

    const id_funcionario_validado = parsePositiveId(
      id_funcionario,
      'id_funcionario'
    );

    let observacao = null;

    if (data.observacao !== undefined && data.observacao !== null) {
      if (typeof data.observacao !== 'string') {
        throw createError('observacao deve ser um texto.');
      }

      observacao = data.observacao.trim() || null;
    }

    const result = await inventoryRepository.manualDischarge({
      id_produto,
      id_lote,
      quantidade,
      motivo,
      observacao,
      id_funcionario: id_funcionario_validado
    });

    return {
      message: 'Baixa manual de estoque realizada com sucesso.',
      ...result
    };
  }

  async getMovements(filters = {}) {
    const normalizedFilters = { ...filters };

    if (normalizedFilters.id_produto !== undefined &&
        normalizedFilters.id_produto !== null &&
        normalizedFilters.id_produto !== '') {
      normalizedFilters.id_produto = parsePositiveId(
        normalizedFilters.id_produto,
        'id_produto'
      );
    } else {
      delete normalizedFilters.id_produto;
    }

    if (normalizedFilters.limite === undefined ||
        normalizedFilters.limite === null ||
        normalizedFilters.limite === '') {
      normalizedFilters.limite = 50;
    } else {
      const limite = Number(normalizedFilters.limite);

      if (!Number.isSafeInteger(limite) || limite < 1 || limite > 500) {
        throw createError('O limite deve ser um inteiro entre 1 e 500.');
      }

      normalizedFilters.limite = limite;
    }

    return inventoryRepository.getStockMovements(normalizedFilters);
  }

  async getSuppliers() {
    return inventoryRepository.getSuppliers();
  }
}

module.exports = new InventoryService();
