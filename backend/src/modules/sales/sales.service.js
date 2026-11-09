const salesRepository = require('./sales.repository');

class SalesService {
  async checkout(payload, id_funcionario) {
    const { id_caixa, id_cliente, itens, pagamentos, desconto_percentual, desconto_valor } = payload;

    if (!id_caixa) {
      const err = new Error('Identificador da sessão do caixa (id_caixa) é obrigatório.');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }

    if (!Array.isArray(itens) || itens.length === 0) {
      const err = new Error('A venda deve conter pelo menos um item.');
      err.statusCode = 400;
      err.errorCode = 'EMPTY_CART';
      throw err;
    }

    if (!Array.isArray(pagamentos) || pagamentos.length === 0) {
      const err = new Error('A venda deve conter pelo menos uma forma de pagamento informada.');
      err.statusCode = 400;
      err.errorCode = 'PAYMENT_REQUIRED';
      throw err;
    }

    // 1. Inspeciona se o caixa existe e está aberto
    const caixa = await salesRepository.getCaixaStatus(id_caixa);
    if (!caixa) {
      const err = new Error(`Caixa ${id_caixa} não foi encontrado.`);
      err.statusCode = 404;
      err.errorCode = 'CASHIER_NOT_FOUND';
      throw err;
    }

    if (caixa.status_caixa !== 'ABERTO') {
      const err = new Error(`Operação bloqueada: o caixa ${id_caixa} está FECHADO. Abra o caixa antes de vender.`);
      err.statusCode = 400;
      err.errorCode = 'CASHIER_CLOSED';
      throw err;
    }

    // 2. Validações prévias de itens
    let totalBruto = 0;
    for (const item of itens) {
      if (!item.id_produto || !item.id_lote || !item.quantidade || !item.preco_unitario) {
        const err = new Error('Cada item deve conter id_produto, id_lote, quantidade e preco_unitario.');
        err.statusCode = 400;
        err.errorCode = 'INVALID_ITEM';
        throw err;
      }
      if (item.quantidade <= 0) {
        const err = new Error('A quantidade do item deve ser positiva.');
        err.statusCode = 400;
        err.errorCode = 'INVALID_QUANTITY';
        throw err;
      }
      totalBruto += (Number(item.quantidade) * Number(item.preco_unitario)) - Number(item.desconto || 0);
    }

    const desc = Number(desconto_valor) || 0;
    const totalLiquido = Math.max(0, totalBruto - desc);

    // 3. Validação da soma dos pagamentos
    const totalPago = pagamentos.reduce((acc, p) => acc + Number(p.valor || 0), 0);
    if (totalPago < totalLiquido) {
      const err = new Error(`Valor total dos pagamentos (R$ ${totalPago.toFixed(2)}) é inferior ao valor da venda (R$ ${totalLiquido.toFixed(2)}).`);
      err.statusCode = 400;
      err.errorCode = 'INSUFFICIENT_PAYMENT';
      throw err;
    }

    // 4. Executa a transação atômica
    const result = await salesRepository.executeCheckout({
      id_caixa,
      id_cliente,
      id_funcionario,
      desconto_percentual,
      desconto_valor: desc,
      itens,
      pagamentos
    });

    const fullSale = await salesRepository.findSaleById(result.id_venda);

    return {
      message: 'Venda finalizada com sucesso!',
      comprovante: {
        id_venda: fullSale.id_venda,
        numero_venda: fullSale.numero_venda,
        data_hora: fullSale.data_hora,
        status_venda: fullSale.status_venda,
        caixa: fullSale.id_caixa,
        operador: fullSale.funcionario_nome,
        cliente: fullSale.cliente_nome || 'Consumidor Final (Não identificado)',
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

  async listSales(filters) {
    return await salesRepository.findSales(filters);
  }

  async getSaleById(id) {
    const sale = await salesRepository.findSaleById(id);
    if (!sale) {
      const err = new Error(`Venda com ID ${id} não foi encontrada.`);
      err.statusCode = 404;
      err.errorCode = 'SALE_NOT_FOUND';
      throw err;
    }
    return sale;
  }

  async searchCustomers(busca) {
    return await salesRepository.searchCustomers(busca);
  }

  async createCustomer(data) {
    if (!data.nome) {
      const err = new Error('Nome do cliente é obrigatório.');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }
    return await salesRepository.createCustomer(data);
  }
}

module.exports = new SalesService();
