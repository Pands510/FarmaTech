
const productsRepository = require('./products.repository');

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

function parseBoolean(value, fieldName) {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true;
  }

  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false;
  }

  throw createError(`${fieldName} deve ser um valor booleano.`);
}

function validateText(value, fieldName, maxLength = 255) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError(`${fieldName} deve ser uma string não vazia.`);
  }

  if (value.trim().length > maxLength) {
    throw createError(`${fieldName} excede o limite de ${maxLength} caracteres.`);
  }

  return value.trim();
}

function validateMoney(value, fieldName, required = false) {
  if (value === undefined || value === null) {
    if (required) {
      throw createError(`${fieldName} é obrigatório.`);
    }

    return value;
  }

  if (
    typeof value !== 'number' &&
    !(typeof value === 'string' && value.trim() !== '')
  ) {
    throw createError(`${fieldName} deve ser numérico.`);
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw createError(`${fieldName} deve ser um número válido e não negativo.`);
  }

  return number;
}

function validateBooleanFields(data) {
  const normalized = { ...data };

  for (const field of ['e_medicamento', 'precisa_receita']) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      normalized[field] = parseBoolean(data[field], field);
    }
  }

  return normalized;
}

class ProductsService {
  async listProducts(filters = {}) {
    const normalized = { ...filters };

    if (normalized.id_grupo !== undefined && normalized.id_grupo !== '') {
      normalized.id_grupo = parsePositiveId(
        normalized.id_grupo,
        'id_grupo'
      );
    }

    if (normalized.busca !== undefined && normalized.busca !== '') {
      normalized.busca = validateText(normalized.busca, 'busca', 100);
    }

    if (
      normalized.precisa_receita !== undefined &&
      normalized.precisa_receita !== null &&
      normalized.precisa_receita !== ''
    ) {
      normalized.precisa_receita = parseBoolean(
        normalized.precisa_receita,
        'precisa_receita'
      );
    }

    const allowedStatuses = [
      'ATIVO',
      'INATIVO',
      'DESCONTINUADO',
      'BLOQUEADO'
    ];

    if (
      normalized.status !== undefined &&
      !allowedStatuses.includes(normalized.status)
    ) {
      throw createError('Status de produto inválido.');
    }

    return productsRepository.findAll(normalized);
  }

  async getProductById(id) {
    const productId = parsePositiveId(id, 'id_produto');

    const product = await productsRepository.findById(productId);

    if (!product) {
      throw createError(
        `Produto com ID ${productId} não foi encontrado.`,
        404,
        'PRODUCT_NOT_FOUND'
      );
    }

    return product;
  }

  async getLotesFifo(id) {
    const product = await this.getProductById(id);

    return productsRepository.findLotesFifo(product.id_produto);
  }

  async createProduct(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw createError('Dados do produto inválidos.');
    }

    const normalized = validateBooleanFields(data);

    normalized.descricao = validateText(
      normalized.descricao,
      'descricao'
    );

    normalized.id_grupo = parsePositiveId(
      normalized.id_grupo,
      'id_grupo'
    );

    // Mantém a obrigatoriedade existente no service original.
    normalized.id_subgrupo = parsePositiveId(
      normalized.id_subgrupo,
      'id_subgrupo'
    );

    normalized.preco_venda = validateMoney(
      normalized.preco_venda,
      'preco_venda',
      true
    );

    if (normalized.preco_custo !== undefined) {
      normalized.preco_custo = validateMoney(
        normalized.preco_custo,
        'preco_custo'
      );
    }

    if (normalized.estoque_minimo !== undefined) {
      const estoqueMinimo = Number(normalized.estoque_minimo);

      if (!Number.isSafeInteger(estoqueMinimo) || estoqueMinimo < 0) {
        throw createError('estoque_minimo deve ser um inteiro não negativo.');
      }

      normalized.estoque_minimo = estoqueMinimo;
    }

    normalized.e_medicamento ??= false;
    normalized.precisa_receita ??= false;

    if (normalized.precisa_receita && !normalized.e_medicamento) {
      throw createError(
        'Produtos que exigem receita médica devem ser classificados como medicamento.'
      );
    }

    if (normalized.status_produto !== undefined) {
      const allowedStatuses = [
        'ATIVO',
        'INATIVO',
        'DESCONTINUADO',
        'BLOQUEADO'
      ];

      if (!allowedStatuses.includes(normalized.status_produto)) {
        throw createError('Status de produto inválido.');
      }
    }

    const newId = await productsRepository.create(normalized);

    return this.getProductById(newId);
  }

  async updateProduct(id, data) {
    const product = await this.getProductById(id);

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw createError('Dados de atualização inválidos.');
    }

    if (Object.keys(data).length === 0) {
      throw createError('Informe pelo menos um campo para atualização.');
    }

    const normalized = validateBooleanFields(data);

    if (Object.prototype.hasOwnProperty.call(normalized, 'descricao')) {
      normalized.descricao = validateText(
        normalized.descricao,
        'descricao'
      );
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'id_grupo')) {
      normalized.id_grupo = parsePositiveId(
        normalized.id_grupo,
        'id_grupo'
      );
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'id_subgrupo')) {
      normalized.id_subgrupo = parsePositiveId(
        normalized.id_subgrupo,
        'id_subgrupo'
      );
    }

    for (const field of ['preco_custo', 'preco_venda']) {
      if (Object.prototype.hasOwnProperty.call(normalized, field)) {
        normalized[field] = validateMoney(normalized[field], field);
      }
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'estoque_minimo')) {
      const estoqueMinimo = Number(normalized.estoque_minimo);

      if (!Number.isSafeInteger(estoqueMinimo) || estoqueMinimo < 0) {
        throw createError('estoque_minimo deve ser um inteiro não negativo.');
      }

      normalized.estoque_minimo = estoqueMinimo;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'status_produto')) {
      const allowedStatuses = [
        'ATIVO',
        'INATIVO',
        'DESCONTINUADO',
        'BLOQUEADO'
      ];

      if (!allowedStatuses.includes(normalized.status_produto)) {
        throw createError('Status de produto inválido.');
      }
    }

    // Considera os valores atuais e os campos enviados.
    const finalMedicine = normalized.e_medicamento !== undefined
      ? normalized.e_medicamento
      : Boolean(Number(product.e_medicamento));

    const finalPrescription = normalized.precisa_receita !== undefined
      ? normalized.precisa_receita
      : Boolean(Number(product.precisa_receita));

    if (finalPrescription && !finalMedicine) {
      throw createError(
        'Produtos que exigem receita médica devem ser classificados como medicamento.'
      );
    }

    await productsRepository.update(product.id_produto, normalized);

    return this.getProductById(product.id_produto);
  }

  async inactivateProduct(id) {
    const product = await this.getProductById(id);

    if (product.status_produto === 'INATIVO') {
      throw createError(
        'Este produto já está inativo.',
        409,
        'PRODUCT_ALREADY_INACTIVE'
      );
    }

    const result = await productsRepository.inactivate(
      product.id_produto
    );

    if (result.affectedRows === 0) {
      throw createError(
        'Não foi possível inativar o produto.',
        409,
        'PRODUCT_INACTIVATION_FAILED'
      );
    }

    return {
      message: `Produto ${product.id_produto} foi inativado com sucesso mantendo a rastreabilidade histórica.`,
      status_produto: 'INATIVO'
    };
  }

  async getCategories() {
    return productsRepository.getGroupsAndSubgroups();
  }
}

module.exports = new ProductsService();
