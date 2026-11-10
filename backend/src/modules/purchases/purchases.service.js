
const purchasesRepository = require('./purchases.repository');

function createError(message, statusCode = 400, errorCode = 'VALIDATION_ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

function parsePositiveId(value, fieldName) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError(
      `${fieldName} deve ser um identificador inteiro positivo.`
    );
  }

  return id;
}

function parsePositiveQuantity(value, fieldName = 'quantidade') {
  const quantity = Number(value);

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw createError(
      `${fieldName} deve ser um número inteiro positivo.`
    );
  }

  return quantity;
}

function parseNonNegativeMoney(value, fieldName) {
  if (
    value === undefined ||
    value === null ||
    (typeof value !== 'number' &&
      !(typeof value === 'string' && value.trim() !== ''))
  ) {
    throw createError(
      `${fieldName} deve ser um valor numérico maior ou igual a zero.`
    );
  }

  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > 99999999.99
  ) {
    throw createError(
      `${fieldName} deve ser um valor entre 0 e 99.999.999,99.`
    );
  }

  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8) {
    throw createError(
      `${fieldName} deve possuir no máximo duas casas decimais.`
    );
  }

  return amount;
}

function validateText(value, fieldName, maxLength = 100) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError(`${fieldName} é obrigatório.`);
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw createError(
      `${fieldName} não pode ultrapassar ${maxLength} caracteres.`
    );
  }

  return normalized;
}

function validateDate(value, fieldName) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw createError(
      `${fieldName} deve estar no formato YYYY-MM-DD.`
    );
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw createError(`${fieldName} contém uma data inválida.`);
  }

  return value;
}

class PurchasesService {
  async listPurchases(filters = {}) {
    const normalizedFilters = {};

    if (
      filters.status !== undefined &&
      filters.status !== null &&
      filters.status !== ''
    ) {
      const status = String(filters.status).trim().toUpperCase();

      const allowedStatuses = [
        'PENDENTE',
        'RECEBIDA',
        'CANCELADA'
      ];

      if (!allowedStatuses.includes(status)) {
        throw createError('Status de compra inválido.');
      }

      normalizedFilters.status = status;
    }

    if (
      filters.id_fornecedor !== undefined &&
      filters.id_fornecedor !== null &&
      filters.id_fornecedor !== ''
    ) {
      normalizedFilters.id_fornecedor = parsePositiveId(
        filters.id_fornecedor,
        'id_fornecedor'
      );
    }

    const limit =
      filters.limite === undefined ||
      filters.limite === null ||
      filters.limite === ''
        ? 50
        : Number(filters.limite);

    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
      throw createError(
        'O limite deve ser um inteiro entre 1 e 500.'
      );
    }

    normalizedFilters.limite = limit;

    return purchasesRepository.findAll(normalizedFilters);
  }

  async getPurchaseById(id) {
    const purchaseId = parsePositiveId(id, 'id_compra');

    const purchase = await purchasesRepository.findById(purchaseId);

    if (!purchase) {
      throw createError(
        `Compra com ID ${purchaseId} não foi localizada.`,
        404,
        'PURCHASE_NOT_FOUND'
      );
    }

    return purchase;
  }

  async createPurchase(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw createError('Informe os dados da compra.');
    }

    const id_fornecedor = parsePositiveId(
      data.id_fornecedor,
      'id_fornecedor'
    );

    const numero_nf = validateText(
      data.numero_nf,
      'numero_nf',
      50
    );

    if (!Array.isArray(data.itens) || data.itens.length === 0) {
      throw createError(
        'A compra precisa possuir pelo menos um item.'
      );
    }

    const itens = data.itens.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw createError(`O item ${index + 1} é inválido.`);
      }

      return {
        id_produto: parsePositiveId(
          item.id_produto,
          `id_produto do item ${index + 1}`
        ),

        quantidade: parsePositiveQuantity(
          item.quantidade,
          `quantidade do item ${index + 1}`
        ),

        preco_unitario: parseNonNegativeMoney(
          item.preco_unitario,
          `preco_unitario do item ${index + 1}`
        )
      };
    });

    const id_compra = await purchasesRepository.createPurchase({
      id_fornecedor,
      numero_nf,
      itens
    });

    return purchasesRepository.findById(id_compra);
  }

  async receivePurchase(id_compra, lotes, id_funcionario) {
    const purchaseId = parsePositiveId(id_compra, 'id_compra');

    const employeeId = parsePositiveId(
      id_funcionario,
      'id_funcionario'
    );

    if (!Array.isArray(lotes) || lotes.length === 0) {
      throw createError(
        'Informe ao menos um lote para o recebimento.'
      );
    }

    const normalizedLots = lotes.map((lote, index) => {
      if (!lote || typeof lote !== 'object' || Array.isArray(lote)) {
        throw createError(`O lote ${index + 1} é inválido.`);
      }

      const id_produto = parsePositiveId(
        lote.id_produto,
        `id_produto do lote ${index + 1}`
      );

      const numero_lote = validateText(
        lote.numero_lote,
        `numero_lote do lote ${index + 1}`,
        50
      );

      const quantidade = parsePositiveQuantity(
        lote.quantidade,
        `quantidade do lote ${index + 1}`
      );

      const data_validade = validateDate(
        lote.data_validade,
        `data_validade do lote ${index + 1}`
      );

      let data_fabricacao = null;

      if (
        lote.data_fabricacao !== undefined &&
        lote.data_fabricacao !== null &&
        lote.data_fabricacao !== ''
      ) {
        data_fabricacao = validateDate(
          lote.data_fabricacao,
          `data_fabricacao do lote ${index + 1}`
        );

        if (data_fabricacao >= data_validade) {
          throw createError(
            `A data de fabricação do lote ${index + 1} deve ser anterior à data de validade.`
          );
        }
      }

      const preco_custo_lote =
        lote.preco_custo_lote === undefined ||
        lote.preco_custo_lote === null ||
        lote.preco_custo_lote === ''
          ? 0
          : parseNonNegativeMoney(
              lote.preco_custo_lote,
              `preco_custo_lote do lote ${index + 1}`
            );

      return {
        id_produto,
        numero_lote,
        data_fabricacao,
        data_validade,
        quantidade,
        preco_custo_lote
      };
    });

    await purchasesRepository.receivePurchase(
      purchaseId,
      normalizedLots,
      employeeId
    );

    return purchasesRepository.findById(purchaseId);
  }
}

module.exports = new PurchasesService();
