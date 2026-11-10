
const salesRepository = require('./sales.repository');

class SalesService {
  createError(message, statusCode = 400, errorCode = 'VALIDATION_ERROR') {
    const err = new Error(message);
    err.statusCode = statusCode;
    err.errorCode = errorCode;
    return err;
  }

  validateId(value, fieldName) {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
      throw this.createError(
        `O campo ${fieldName} deve ser um identificador inteiro positivo.`
      );
    }

    return id;
  }

  validateNumber(value, fieldName, { min = 0, exclusiveMin = false, max = Infinity } = {}) {
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      typeof value === 'boolean'
    ) {
      throw this.createError(`O campo ${fieldName} deve ser numérico.`);
    }

    const number = Number(value);

    if (
      !Number.isFinite(number) ||
      (exclusiveMin ? number <= min : number < min) ||
      number > max
    ) {
      throw this.createError(`O campo ${fieldName} possui um valor inválido.`);
    }

    return number;
  }

  validateDate(value, fieldName) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw this.createError(
        `O campo ${fieldName} deve utilizar o formato YYYY-MM-DD.`
      );
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw this.createError(`O campo ${fieldName} contém uma data inválida.`);
    }

    return value;
  }

  async checkout(payload, id_funcionario) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw this.createError('Os dados da venda são inválidos.');
    }

    const {
      id_caixa,
      id_cliente,
      itens,
      pagamentos,
      desconto_percentual = 0,
      desconto_valor = 0
    } = payload;

    const funcionarioId = this.validateId(
      id_funcionario,
      'id_funcionario'
    );

    const caixaId = this.validateId(id_caixa, 'id_caixa');

    const clienteId =
      id_cliente === null || id_cliente === undefined
        ? null
        : this.validateId(id_cliente, 'id_cliente');

    if (!Array.isArray(itens) || itens.length === 0) {
      throw this.createError(
        'A venda deve conter pelo menos um item.',
        400,
        'EMPTY_CART'
      );
    }

    if (!Array.isArray(pagamentos) || pagamentos.length === 0) {
      throw this.createError(
        'A venda deve conter pelo menos um pagamento.',
        400,
        'PAYMENT_REQUIRED'
      );
    }

    const descontoPercentual = this.validateNumber(
      desconto_percentual,
      'desconto_percentual',
      { min: 0, max: 100 }
    );

    const descontoValor = this.validateNumber(
      desconto_valor,
      'desconto_valor',
      { min: 0 }
    );

    const itensValidados = itens.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw this.createError(`O item ${index + 1} é inválido.`);
      }

      const id_produto = this.validateId(
        item.id_produto,
        `itens[${index}].id_produto`
      );

      const id_lote = this.validateId(
        item.id_lote,
        `itens[${index}].id_lote`
      );

      const quantidade = this.validateNumber(
        item.quantidade,
        `itens[${index}].quantidade`,
        { min: 0, exclusiveMin: true }
      );

      const preco_unitario = this.validateNumber(
        item.preco_unitario,
        `itens[${index}].preco_unitario`,
        { min: 0 }
      );

      const desconto = this.validateNumber(
        item.desconto ?? 0,
        `itens[${index}].desconto`,
        { min: 0 }
      );

      const id_receita =
        item.id_receita === null || item.id_receita === undefined
          ? null
          : this.validateId(
              item.id_receita,
              `itens[${index}].id_receita`
            );

      return {
        id_produto,
        id_lote,
        id_receita,
        quantidade,
        preco_unitario,
        desconto
      };
    });

    const pagamentosValidados = pagamentos.map((pagamento, index) => {
      if (
        !pagamento ||
        typeof pagamento !== 'object' ||
        Array.isArray(pagamento)
      ) {
        throw this.createError(`O pagamento ${index + 1} é inválido.`);
      }

      if (
        typeof pagamento.forma_pagamento !== 'string' ||
        !pagamento.forma_pagamento.trim()
      ) {
        throw this.createError(
          `A forma de pagamento do pagamento ${index + 1} é obrigatória.`
        );
      }

      const valor = this.validateNumber(
        pagamento.valor,
        `pagamentos[${index}].valor`,
        { min: 0, exclusiveMin: true }
      );

      return {
        ...pagamento,
        forma_pagamento: pagamento.forma_pagamento.trim().toUpperCase(),
        valor
      };
    });

    // O repositório realiza os cálculos financeiros definitivos,
    // bloqueia o caixa e executa toda a operação na transação.
    const result = await salesRepository.executeCheckout({
      id_caixa: caixaId,
      id_cliente: clienteId,
      id_funcionario: funcionarioId,
      desconto_percentual: descontoPercentual,
      desconto_valor: descontoValor,
      itens: itensValidados,
      pagamentos: pagamentosValidados
    });

    if (!result || !result.id_venda) {
      throw this.createError(
        'Não foi possível recuperar o identificador da venda finalizada.',
        500,
        'SALE_RESULT_INVALID'
      );
    }

    const fullSale = await salesRepository.findSaleById(result.id_venda);

    if (!fullSale) {
      throw this.createError(
        'A venda foi registrada, mas não foi possível recuperar seus detalhes.',
        500,
        'SALE_DETAILS_NOT_FOUND'
      );
    }

    return {
      message: 'Venda finalizada com sucesso!',
      comprovante: {
        id_venda: fullSale.id_venda,
        numero_venda: fullSale.numero_venda,
        data_hora: fullSale.data_hora,
        status_venda: fullSale.status_venda,
        caixa: fullSale.id_caixa,
        operador: fullSale.funcionario_nome,
        cliente:
          fullSale.cliente_nome || 'Consumidor Final (Não identificado)',
        valor_total: fullSale.valor_total,
        desconto_valor: fullSale.desconto_valor,
        valor_liquido: fullSale.valor_liquido,
        total_pago: result.total_pago,
        troco: result.troco,
        itens: fullSale.itens,
        pagamentos: fullSale.pagamentos
      }
    };
  }

  async listSales(filters = {}) {
    if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
      throw this.createError('Os filtros da listagem são inválidos.');
    }

    const data_inicio = this.validateDate(
      filters.data_inicio,
      'data_inicio'
    );

    const data_fim = this.validateDate(
      filters.data_fim,
      'data_fim'
    );

    if (data_inicio && data_fim && data_inicio > data_fim) {
      throw this.createError(
        'A data inicial não pode ser posterior à data final.'
      );
    }

    const statusPermitidos = [
      'ABERTA',
      'FINALIZADA',
      'CANCELADA',
      'DEVOLVIDA'
    ];

    let status_venda = filters.status_venda;

    if (status_venda !== undefined && status_venda !== '') {
      if (
        typeof status_venda !== 'string' ||
        !statusPermitidos.includes(status_venda.toUpperCase())
      ) {
        throw this.createError('O status da venda informado é inválido.');
      }

      status_venda = status_venda.toUpperCase();
    } else {
      status_venda = undefined;
    }

    const id_caixa =
      filters.id_caixa === undefined || filters.id_caixa === ''
        ? undefined
        : this.validateId(filters.id_caixa, 'id_caixa');

    const limite =
      filters.limite === undefined || filters.limite === ''
        ? 50
        : this.validateNumber(filters.limite, 'limite', {
            min: 1,
            max: 500
          });

    if (!Number.isInteger(limite)) {
      throw this.createError('O limite deve ser um número inteiro.');
    }

    return salesRepository.findSales({
      data_inicio,
      data_fim,
      status_venda,
      id_caixa,
      limite
    });
  }

  async getSaleById(id) {
    const saleId = this.validateId(id, 'id');

    const sale = await salesRepository.findSaleById(saleId);

    if (!sale) {
      throw this.createError(
        `Venda com ID ${saleId} não foi encontrada.`,
        404,
        'SALE_NOT_FOUND'
      );
    }

    return sale;
  }

  async searchCustomers(busca) {
      if (typeof busca !== 'string') {
        throw this.createError('O termo de pesquisa deve ser textual.');
      }
  
      const termo = busca.trim();
  
      if (termo.length < 2) {
        throw this.createError(
          'Informe pelo menos dois caracteres para pesquisar clientes.'
        );
      }
  
      return salesRepository.searchCustomers(termo);
    }

  async createCustomer(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw this.createError('Os dados do cliente são inválidos.');
    }

    const nome = typeof data.nome === 'string' ? data.nome.trim() : '';

    if (!nome) {
      throw this.createError(
        'Nome do cliente é obrigatório.'
      );
    }

    const cpf =
      data.cpf === undefined || data.cpf === null
        ? null
        : String(data.cpf).trim();

    const telefone =
      data.telefone === undefined || data.telefone === null
        ? null
        : String(data.telefone).trim();

    const email =
      data.email === undefined || data.email === null
        ? null
        : String(data.email).trim();

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw this.createError('O endereço de e-mail informado é inválido.');
    }

    return salesRepository.createCustomer({
      nome,
      cpf: cpf || null,
      telefone: telefone || null,
      email: email || null
    });
  }
}

module.exports = new SalesService();
