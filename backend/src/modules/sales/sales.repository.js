const { pool } = require('../../config/database');

class SalesRepository {
  async getCaixaStatus(id_caixa) {
    const [rows] = await pool.query(
      'SELECT id_caixa, status_caixa, id_funcionario FROM Caixas WHERE id_caixa = ? LIMIT 1;',
      [id_caixa]
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
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Gera código identificador da venda
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const numero_venda = `VND-${Date.now().toString().slice(-6)}-${randomSuffix}`;

      // 2. Calcula total bruto
      let valor_total = 0;
      for (const item of itens) {
        const subtotalItem = (Number(item.quantidade) * Number(item.preco_unitario)) - Number(item.desconto || 0);
        valor_total += subtotalItem;
      }

      // Valida desconto
      const descVal = Number(desconto_valor) || 0;
      const valor_liquido = Math.max(0, valor_total - descVal);

      // 3. Insere cabeçalho da Venda (status ABERTA temporariamente)
      const insertVendaQuery = `
        INSERT INTO Vendas (
          numero_venda, id_cliente, id_funcionario, id_caixa,
          valor_total, desconto_percentual, desconto_valor, status_venda
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ABERTA');
      `;
      const [vendaResult] = await connection.query(insertVendaQuery, [
        numero_venda,
        id_cliente || null,
        id_funcionario,
        id_caixa,
        valor_total,
        desconto_percentual || 0,
        descVal
      ]);

      const id_venda = vendaResult.insertId;

      // 4. Insere cada item (Dispara trg_valida_estoque_venda e trg_baixa_estoque_venda)
      const insertItemQuery = `
        INSERT INTO Vendas_Itens (
          id_venda, id_produto, id_lote, id_receita,
          quantidade, preco_unitario, desconto
        ) VALUES (?, ?, ?, ?, ?, ?, ?);
      `;

      for (const item of itens) {
        await connection.query(insertItemQuery, [
          id_venda,
          item.id_produto,
          item.id_lote,
          item.id_receita || null,
          item.quantidade,
          item.preco_unitario,
          item.desconto || 0
        ]);
      }

      // 5. Insere Pagamentos
      const insertPagamentoQuery = `
        INSERT INTO Pagamentos (
          id_venda, forma_pagamento, valor, parcelas,
          bandeira_cartao, autorizacao, status_pagamento
        ) VALUES (?, ?, ?, ?, ?, ?, 'APROVADO');
      `;

      let totalPago = 0;
      for (const pag of pagamentos) {
        totalPago += Number(pag.valor);
        await connection.query(insertPagamentoQuery, [
          id_venda,
          pag.forma_pagamento,
          pag.valor,
          pag.parcelas || 1,
          pag.bandeira_cartao || null,
          pag.autorizacao || null
        ]);
      }

      // 6. Finaliza a Venda
      await connection.query(
        "UPDATE Vendas SET status_venda = 'FINALIZADA' WHERE id_venda = ?;",
        [id_venda]
      );

      // 7. Atualiza pontos de fidelidade do cliente se identificado (1 ponto por real líquido)
      if (id_cliente) {
        const pontosGanhos = Math.floor(valor_liquido);
        await connection.query(
          'UPDATE Clientes SET pontos_fidelidade = pontos_fidelidade + ? WHERE id_cliente = ?;',
          [pontosGanhos, id_cliente]
        );
      }

      await connection.commit();

      const troco = totalPago > valor_liquido ? Number((totalPago - valor_liquido).toFixed(2)) : 0;

      return {
        id_venda,
        numero_venda,
        status_venda: 'FINALIZADA',
        valor_total,
        desconto_valor: descVal,
        valor_liquido,
        total_pago: totalPago,
        troco
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findSales({ data_inicio, data_fim, status_venda, id_caixa, limite = 50 }) {
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
      INNER JOIN Funcionarios f ON v.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p_func ON f.id_pessoa = p_func.id_pessoa
      LEFT JOIN Clientes c ON v.id_cliente = c.id_cliente
      LEFT JOIN Pessoas p_cli ON c.id_pessoa = p_cli.id_pessoa
      WHERE 1=1
    `;
    const params = [];

    if (data_inicio) {
      sql += ' AND DATE(v.data_hora) >= ?';
      params.push(data_inicio);
    }
    if (data_fim) {
      sql += ' AND DATE(v.data_hora) <= ?';
      params.push(data_fim);
    }
    if (status_venda) {
      sql += ' AND v.status_venda = ?';
      params.push(status_venda);
    }
    if (id_caixa) {
      sql += ' AND v.id_caixa = ?';
      params.push(id_caixa);
    }

    sql += ' ORDER BY v.data_hora DESC LIMIT ?;';
    params.push(Number(limite));

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  async findSaleById(id_venda) {
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
      INNER JOIN Funcionarios f ON v.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p_func ON f.id_pessoa = p_func.id_pessoa
      LEFT JOIN Clientes c ON v.id_cliente = c.id_cliente
      LEFT JOIN Pessoas p_cli ON c.id_pessoa = p_cli.id_pessoa
      WHERE v.id_venda = ?
      LIMIT 1;
    `;
    const [sales] = await pool.query(saleSql, [id_venda]);
    if (sales.length === 0) return null;

    const sale = sales[0];

    // Itens
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
      INNER JOIN Produtos p ON vi.id_produto = p.id_produto
      INNER JOIN Lotes l ON vi.id_lote = l.id_lote
      WHERE vi.id_venda = ?;
    `;
    const [items] = await pool.query(itemsSql, [id_venda]);

    // Pagamentos
    const paymentsSql = `
      SELECT 
        id_pagamento,
        forma_pagamento,
        valor,
        parcelas,
        bandeira_cartao,
        autorizacao,
        status_pagamento,
        data_pagamento
      FROM Pagamentos
      WHERE id_venda = ?;
    `;
    const [payments] = await pool.query(paymentsSql, [id_venda]);

    return {
      ...sale,
      itens: items,
      pagamentos: payments
    };
  }

  async searchCustomers(busca) {
    let sql = `
      SELECT 
        c.id_cliente,
        p.id_pessoa,
        p.nome,
        p.status,
        c.pontos_fidelidade,
        d.numero AS cpf,
        ct.telefone
      FROM Clientes c
      INNER JOIN Pessoas p ON c.id_pessoa = p.id_pessoa
      LEFT JOIN Documentos d ON p.id_pessoa = d.id_pessoa AND d.tipo_documento = 'CPF'
      LEFT JOIN Contatos ct ON p.id_pessoa = ct.id_pessoa AND ct.principal = TRUE
      WHERE p.status = 'ATIVO'
    `;
    const params = [];

    if (busca) {
      sql += ' AND (p.nome LIKE ? OR d.numero LIKE ?)';
      params.push(`%${busca}%`, `%${busca}%`);
    }

    sql += ' ORDER BY p.nome ASC LIMIT 30;';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  async createCustomer({ nome, cpf, telefone, email }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Pessoa
      const [pessoaResult] = await connection.query(
        "INSERT INTO Pessoas (tipo, nome, status) VALUES ('FISICA', ?, 'ATIVO');",
        [nome]
      );
      const id_pessoa = pessoaResult.insertId;

      // 2. Documento CPF se informado
      if (cpf) {
        await connection.query(
          "INSERT INTO Documentos (id_pessoa, tipo_documento, numero) VALUES (?, 'CPF', ?);",
          [id_pessoa, cpf]
        );
      }

      // 3. Contato se informado
      if (telefone || email) {
        await connection.query(
          `INSERT INTO Contatos (id_pessoa, tipo, email, telefone, principal) 
           VALUES (?, ?, ?, ?, TRUE);`,
          [id_pessoa, telefone ? 'CELULAR' : 'EMAIL', email || null, telefone || null]
        );
      }

      // 4. Cliente
      const [cliResult] = await connection.query(
        'INSERT INTO Clientes (id_pessoa, pontos_fidelidade) VALUES (?, 0);',
        [id_pessoa]
      );

      await connection.commit();

      return {
        id_cliente: cliResult.insertId,
        id_pessoa,
        nome,
        cpf,
        telefone,
        pontos_fidelidade: 0
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = new SalesRepository();
