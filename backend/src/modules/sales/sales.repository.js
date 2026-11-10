
const { pool } = require('../../config/database');

function createError(message, statusCode = 400, errorCode = 'VALIDATION_ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

function toCents(value, fieldName) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw createError(`${fieldName} deve ser um valor numérico não negativo.`);
  }

  return Math.round((number + Number.EPSILON) * 100);
}

function fromCents(cents) {
  return Number((cents / 100).toFixed(2));
}

function validatePositiveId(value, fieldName) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError(`${fieldName} inválido.`);
  }

  return id;
}

function validateLimit(value) {
  const limit = Number(value);

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
    throw createError('O limite deve ser um inteiro entre 1 e 500.');
  }

  return limit;
}

class SalesRepository {
  async getCaixaStatus(id_caixa) {
    const id = validatePositiveId(id_caixa, 'ID do caixa');

    const [rows] = await pool.query(
      `SELECT id_caixa, status_caixa, id_funcionario
       FROM Caixas
       WHERE id_caixa = ?
       LIMIT 1;`,
      [id]
    );

    return rows[0] || null;
  }

  async executeCheckout({
    id_caixa,
    id_cliente,
    id_funcionario,
    desconto_percentual = 0,
    desconto_valor = 0,
    itens,
    pagamentos
  }) {
    const caixaId = validatePositiveId(id_caixa, 'ID do caixa');
    const funcionarioId = validatePositiveId(
      id_funcionario,
      'ID do funcionário'
    );

    const clienteId = id_cliente
      ? validatePositiveId(id_cliente, 'ID do cliente')
      : null;

    if (!Array.isArray(itens) || itens.length === 0) {
      throw createError('A venda precisa possuir ao menos um item.');
    }

    if (!Array.isArray(pagamentos) || pagamentos.length === 0) {
      throw createError('A venda precisa possuir ao menos um pagamento.');
    }

    const percentual = Number(desconto_percentual);
    const descontoInformado = toCents(desconto_valor, 'Desconto');

    if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
      throw createError('O desconto percentual deve estar entre 0 e 100.');
    }

    let totalBrutoCentavos = 0;

    const itensValidados = itens.map((item, index) => {
      const produtoId = validatePositiveId(
        item.id_produto,
        `ID do produto no item ${index + 1}`
      );

      const loteId = validatePositiveId(
        item.id_lote,
        `ID do lote no item ${index + 1}`
      );

      const quantidade = Number(item.quantidade);

      if (!Number.isFinite(quantidade) || quantidade <= 0) {
        throw createError(`Quantidade inválida no item ${index + 1}.`);
      }

      const precoCentavos = toCents(
        item.preco_unitario,
        `Preço do item ${index + 1}`
      );

      const descontoItemCentavos = toCents(
        item.desconto ?? 0,
        `Desconto do item ${index + 1}`
      );

      const subtotalBruto = Math.round(
        quantidade * precoCentavos
      );

      if (descontoItemCentavos > subtotalBruto) {
        throw createError(
          `O desconto do item ${index + 1} supera seu subtotal.`
        );
      }

      totalBrutoCentavos += subtotalBruto - descontoItemCentavos;

      return {
        ...item,
        id_produto: produtoId,
        id_lote: loteId,
        id_receita: item.id_receita
          ? validatePositiveId(item.id_receita, 'ID da receita')
          : null,
        quantidade,
        preco_unitario: fromCents(precoCentavos),
        desconto: fromCents(descontoItemCentavos)
      };
    });

    const descontoPercentualCentavos = Math.round(
      totalBrutoCentavos * percentual / 100
    );

    const descontoTotalCentavos =
      descontoPercentualCentavos + descontoInformado;

    if (descontoTotalCentavos > totalBrutoCentavos) {
      throw createError('O desconto total não pode superar o valor da venda.');
    }

    const valorLiquidoCentavos =
      totalBrutoCentavos - descontoTotalCentavos;

    const pagamentosValidados = pagamentos.map((pag, index) => {
      const valorCentavos = toCents(
        pag.valor,
        `Valor do pagamento ${index + 1}`
      );

      if (valorCentavos <= 0) {
        throw createError(
          `O pagamento ${index + 1} deve possuir valor maior que zero.`
        );
      }

      if (!pag.forma_pagamento) {
        throw createError(
          `Informe a forma de pagamento ${index + 1}.`
        );
      }

      const forma = String(pag.forma_pagamento).toUpperCase();

      const formasPermitidas = [
        'DINHEIRO',
        'PIX',
        'CREDITO',
        'DEBITO',
        'CARTAO_CREDITO',
        'CARTAO_DEBITO'
      ];

      if (!formasPermitidas.includes(forma)) {
        throw createError(
          `Forma de pagamento inválida no pagamento ${index + 1}.`
        );
      }

      return {
        ...pag,
        forma_pagamento: forma,
        valor: fromCents(valorCentavos),
        valor_centavos: valorCentavos,
        parcelas: Number(pag.parcelas ?? 1)
      };
    });

    const totalPagoCentavos = pagamentosValidados.reduce(
      (total, pagamento) => total + pagamento.valor_centavos,
      0
    );

    if (totalPagoCentavos < valorLiquidoCentavos) {
      throw createError(
        'O valor pago é inferior ao valor líquido da venda.',
        400,
        'PAYMENT_INSUFFICIENT'
      );
    }

    const pagamentosEmDinheiro = pagamentosValidados
      .filter(p => p.forma_pagamento === 'DINHEIRO')
      .reduce((total, p) => total + p.valor_centavos, 0);

    const trocoCentavos = Math.min(
      Math.max(0, totalPagoCentavos - valorLiquidoCentavos),
      pagamentosEmDinheiro
    );

    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      // Confirma que o caixa continua aberto e pertence ao operador.
      const [caixas] = await connection.query(
        `SELECT id_caixa, status_caixa, id_funcionario
         FROM Caixas
         WHERE id_caixa = ?
         FOR UPDATE;`,
        [caixaId]
      );

      if (caixas.length === 0) {
        throw createError(
          'Caixa não encontrado.',
          404,
          'CASHIER_NOT_FOUND'
        );
      }

      if (caixas[0].status_caixa !== 'ABERTO') {
        throw createError(
          'O caixa informado não está aberto.',
          409,
          'CASHIER_NOT_OPEN'
        );
      }

      if (Number(caixas[0].id_funcionario) !== funcionarioId) {
        throw createError(
          'O caixa não pertence ao funcionário autenticado.',
          403,
          'CASHIER_OWNER_MISMATCH'
        );
      }

      if (clienteId) {
        const [clientes] = await connection.query(
          `SELECT c.id_cliente
           FROM Clientes c
           INNER JOIN Pessoas p ON p.id_pessoa = c.id_pessoa
           WHERE c.id_cliente = ?
             AND p.status = 'ATIVO'
           LIMIT 1;`,
          [clienteId]
        );

        if (clientes.length === 0) {
          throw createError(
            'Cliente não encontrado ou inativo.',
            404,
            'CUSTOMER_NOT_FOUND'
          );
        }
      }

      // A validação e a baixa dos lotes continuam sob responsabilidade
      // dos triggers de Vendas_Itens.
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const numero_venda =
        `VND-${Date.now().toString().slice(-6)}-${randomSuffix}`;

      const valorTotal = fromCents(totalBrutoCentavos);
      const descontoTotal = fromCents(descontoTotalCentavos);
      const valorLiquido = fromCents(valorLiquidoCentavos);

      const [vendaResult] = await connection.query(
        `INSERT INTO Vendas (
          numero_venda,
          id_cliente,
          id_funcionario,
          id_caixa,
          valor_total,
          desconto_percentual,
          desconto_valor,
          status_venda
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ABERTA');`,
        [
          numero_venda,
          clienteId,
          funcionarioId,
          caixaId,
          valorTotal,
          percentual,
          descontoTotal
        ]
      );

      const id_venda = vendaResult.insertId;

      const insertItemQuery = `
        INSERT INTO Vendas_Itens (
          id_venda,
          id_produto,
          id_lote,
          id_receita,
          quantidade,
          preco_unitario,
          desconto
        ) VALUES (?, ?, ?, ?, ?, ?, ?);
      `;

      for (const item of itensValidados) {
        await connection.query(insertItemQuery, [
          id_venda,
          item.id_produto,
          item.id_lote,
          item.id_receita,
          item.quantidade,
          item.preco_unitario,
          item.desconto
        ]);
      }

      const insertPagamentoQuery = `
        INSERT INTO Pagamentos (
          id_venda,
          forma_pagamento,
          valor,
          parcelas,
          bandeira_cartao,
          autorizacao,
          status_pagamento
        ) VALUES (?, ?, ?, ?, ?, ?, ?);
      `;

      for (const pagamento of pagamentosValidados) {
        const isCard = [
          'CREDITO',
          'DEBITO',
          'CARTAO_CREDITO',
          'CARTAO_DEBITO'
        ].includes(pagamento.forma_pagamento);

        // Não afirma aprovação de cartão sem integração de pagamento.
        if (isCard) {
          throw createError(
            'Pagamentos com cartão precisam de confirmação da operadora antes da finalização.',
            501,
            'CARD_PAYMENT_NOT_INTEGRATED'
          );
        }

        await connection.query(insertPagamentoQuery, [
          id_venda,
          pagamento.forma_pagamento,
          pagamento.valor,
          pagamento.parcelas,
          pagamento.bandeira_cartao || null,
          pagamento.autorizacao || null,
          'APROVADO'
        ]);
      }

      const [updateResult] = await connection.query(
        `UPDATE Vendas
         SET status_venda = 'FINALIZADA'
         WHERE id_venda = ?
           AND status_venda = 'ABERTA';`,
        [id_venda]
      );

      if (updateResult.affectedRows !== 1) {
        throw createError(
          'Não foi possível finalizar a venda.',
          409,
          'SALE_FINALIZATION_FAILED'
        );
      }

      if (clienteId) {
        const pontosGanhos = Math.floor(valorLiquidoCentavos / 100);

        await connection.query(
          `UPDATE Clientes
           SET pontos_fidelidade = pontos_fidelidade + ?
           WHERE id_cliente = ?;`,
          [pontosGanhos, clienteId]
        );
      }

      await connection.commit();
      transactionStarted = false;

      return {
        id_venda,
        numero_venda,
        status_venda: 'FINALIZADA',
        valor_total: valorTotal,
        desconto_percentual: percentual,
        desconto_valor: descontoTotal,
        valor_liquido: valorLiquido,
        total_pago: fromCents(totalPagoCentavos),
        troco: fromCents(trocoCentavos)
      };
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback();
      }

      throw error;
    } finally {
      connection.release();
    }
  }

  async findSales({
    data_inicio,
    data_fim,
    status_venda,
    id_caixa,
    limite = 50
  } = {}) {
    const limit = validateLimit(limite);

    let sql = `
      SELECT
        v.id_venda,
        v.numero_venda,
        v.data_hora,
        v.valor_total,
        v.desconto_valor,
        v.valor_liquido,
        v.status_venda,
        v.id_caixa,
        v.id_funcionario,
        p_func.nome AS funcionario_nome,
        v.id_cliente,
        p_cli.nome AS cliente_nome
      FROM Vendas v
      INNER JOIN Funcionarios f
        ON v.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p_func
        ON f.id_pessoa = p_func.id_pessoa
      LEFT JOIN Clientes c
        ON v.id_cliente = c.id_cliente
      LEFT JOIN Pessoas p_cli
        ON c.id_pessoa = p_cli.id_pessoa
      WHERE 1 = 1
    `;

    const params = [];

    if (data_inicio) {
      sql += ' AND v.data_hora >= ?';
      params.push(`${data_inicio} 00:00:00`);
    }

    if (data_fim) {
      sql += ' AND v.data_hora < DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(`${data_fim} 00:00:00`);
    }

    if (status_venda) {
      sql += ' AND v.status_venda = ?';
      params.push(status_venda);
    }

    if (id_caixa !== undefined && id_caixa !== null && id_caixa !== '') {
      sql += ' AND v.id_caixa = ?';
      params.push(validatePositiveId(id_caixa, 'ID do caixa'));
    }

    sql += ' ORDER BY v.data_hora DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  async findSaleById(id_venda) {
    const id = validatePositiveId(id_venda, 'ID da venda');

    const saleSql = `
      SELECT
        v.id_venda,
        v.numero_venda,
        v.data_hora,
        v.valor_total,
        v.desconto_percentual,
        v.desconto_valor,
        v.valor_liquido,
        v.status_venda,
        v.id_caixa,
        v.id_funcionario,
        p_func.nome AS funcionario_nome,
        v.id_cliente,
        p_cli.nome AS cliente_nome
      FROM Vendas v
      INNER JOIN Funcionarios f
        ON v.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p_func
        ON f.id_pessoa = p_func.id_pessoa
      LEFT JOIN Clientes c
        ON v.id_cliente = c.id_cliente
      LEFT JOIN Pessoas p_cli
        ON c.id_pessoa = p_cli.id_pessoa
      WHERE v.id_venda = ?
      LIMIT 1;
    `;

    const [sales] = await pool.query(saleSql, [id]);

    if (sales.length === 0) {
      return null;
    }

    const sale = sales[0];

    const itemsSql = `
      SELECT
        vi.id_item_venda,
        vi.id_produto,
        p.descricao AS produto_descricao,
        vi.id_lote,
        l.numero_lote,
        vi.id_receita,
        vi.quantidade,
        vi.preco_unitario,
        vi.desconto,
        vi.subtotal
      FROM Vendas_Itens vi
      INNER JOIN Produtos p
        ON vi.id_produto = p.id_produto
      INNER JOIN Lotes l
        ON vi.id_lote = l.id_lote
      WHERE vi.id_venda = ?;
    `;

    const [items] = await pool.query(itemsSql, [id]);

    const paymentsSql = `
      SELECT
        id_pagamento,
        forma_pagamento,
        valor,
        parcelas,
        bandeira_cartao,
        status_pagamento,
        data_pagamento
      FROM Pagamentos
      WHERE id_venda = ?;
    `;

    const [payments] = await pool.query(paymentsSql, [id]);

    return {
      ...sale,
      itens: items,
      pagamentos: payments
    };
  }

  async searchCustomers(busca) {
    if (typeof busca !== 'string' || busca.trim().length < 2) {
      throw createError(
        'Informe ao menos dois caracteres para pesquisar clientes.'
      );
    }

    const termo = busca.trim();

    const sql = `
      SELECT
        c.id_cliente,
        p.id_pessoa,
        p.nome,
        p.status,
        c.pontos_fidelidade,
        d.numero AS cpf,
        ct.telefone
      FROM Clientes c
      INNER JOIN Pessoas p
        ON c.id_pessoa = p.id_pessoa
      LEFT JOIN Documentos d
        ON p.id_pessoa = d.id_pessoa
       AND d.tipo_documento = 'CPF'
      LEFT JOIN Contatos ct
        ON p.id_pessoa = ct.id_pessoa
       AND ct.principal = TRUE
      WHERE p.status = 'ATIVO'
        AND (
          p.nome LIKE ?
          OR d.numero LIKE ?
        )
      GROUP BY
        c.id_cliente,
        p.id_pessoa,
        p.nome,
        p.status,
        c.pontos_fidelidade,
        d.numero,
        ct.telefone
      ORDER BY p.nome ASC
      LIMIT 30;
    `;

    const [rows] = await pool.query(
      sql,
      [`%${termo}%`, `%${termo}%`]
    );

    return rows;
  }

  async createCustomer({ nome, cpf, telefone, email }) {
    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const [pessoaResult] = await connection.query(
        `INSERT INTO Pessoas (tipo, nome, status)
         VALUES ('FISICA', ?, 'ATIVO');`,
        [nome]
      );

      const id_pessoa = pessoaResult.insertId;

      if (cpf) {
        await connection.query(
          `INSERT INTO Documentos (
            id_pessoa,
            tipo_documento,
            numero
          ) VALUES (?, 'CPF', ?);`,
          [id_pessoa, cpf]
        );
      }

      if (telefone) {
        await connection.query(
          `INSERT INTO Contatos (
            id_pessoa,
            tipo,
            email,
            telefone,
            principal
          ) VALUES (?, 'CELULAR', ?, ?, TRUE);`,
          [id_pessoa, email || null, telefone]
        );
      } else if (email) {
        await connection.query(
          `INSERT INTO Contatos (
            id_pessoa,
            tipo,
            email,
            telefone,
            principal
          ) VALUES (?, 'EMAIL', ?, NULL, TRUE);`,
          [id_pessoa, email]
        );
      }

      const [clienteResult] = await connection.query(
        `INSERT INTO Clientes (id_pessoa, pontos_fidelidade)
         VALUES (?, 0);`,
        [id_pessoa]
      );

      await connection.commit();
      transactionStarted = false;

      return {
        id_cliente: clienteResult.insertId,
        id_pessoa,
        nome,
        cpf: cpf || null,
        telefone: telefone || null,
        email: email || null,
        pontos_fidelidade: 0
      };
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback();
      }

      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new SalesRepository();
