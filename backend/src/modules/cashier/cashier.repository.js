const { pool } = require('../../config/database');

class CashierRepository {
  async findCurrentOpenByFuncionario(id_funcionario) {
    const query = `
      SELECT 
        c.id_caixa,
        c.id_funcionario,
        p.nome AS funcionario_nome,
        c.data_abertura,
        c.valor_abertura,
        c.status_caixa
      FROM Caixas c
      INNER JOIN Funcionarios f ON c.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p ON f.id_pessoa = p.id_pessoa
      WHERE c.id_funcionario = ?
        AND c.status_caixa = 'ABERTO'
      ORDER BY c.data_abertura DESC
      LIMIT 1;
    `;
    const [rows] = await pool.query(query, [id_funcionario]);
    return rows[0] || null;
  }

  async findAnyOpenCaixa() {
    const query = `
      SELECT 
        c.id_caixa,
        c.id_funcionario,
        p.nome AS funcionario_nome,
        c.data_abertura,
        c.valor_abertura,
        c.status_caixa
      FROM Caixas c
      INNER JOIN Funcionarios f ON c.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p ON f.id_pessoa = p.id_pessoa
      WHERE c.status_caixa = 'ABERTO'
      ORDER BY c.data_abertura DESC
      LIMIT 1;
    `;
    const [rows] = await pool.query(query);
    return rows[0] || null;
  }

  async findById(id_caixa) {
    const query = `
      SELECT 
        c.id_caixa,
        c.id_funcionario,
        p.nome AS funcionario_nome,
        c.data_abertura,
        c.data_fechamento,
        c.valor_abertura,
        c.valor_fechamento,
        c.status_caixa
      FROM Caixas c
      INNER JOIN Funcionarios f ON c.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p ON f.id_pessoa = p.id_pessoa
      WHERE c.id_caixa = ?
      LIMIT 1;
    `;
    const [rows] = await pool.query(query, [id_caixa]);
    return rows[0] || null;
  }

  async openCaixa(id_funcionario, valor_abertura) {
    const query = `
      INSERT INTO Caixas (id_funcionario, valor_abertura, status_caixa)
      VALUES (?, ?, 'ABERTO');
    `;
    const [result] = await pool.query(query, [id_funcionario, valor_abertura || 0]);
    return result.insertId;
  }

  async closeCaixaWithProcedure(id_caixa, valor_informado) {
    // Chama a Stored Procedure oficial criada na Seção 4 do banco: sp_fechar_caixa
    const query = 'CALL sp_fechar_caixa(?, ?);';
    const [rows] = await pool.query(query, [id_caixa, valor_informado]);

    // O retorno da procedure no MySQL via CALL vem dentro do primeiro conjunto de resultados
    const procedureResult = rows[0] && rows[0][0] ? rows[0][0] : null;
    return procedureResult;
  }

  async getCaixaSummary(id_caixa) {
    // 1. Total geral e contagem de vendas
    const totalQuery = `
      SELECT 
        COALESCE(SUM(valor_liquido), 0) AS total_vendas,
        COUNT(id_venda) AS quantidade_vendas
      FROM Vendas
      WHERE id_caixa = ? AND status_venda = 'FINALIZADA';
    `;
    const [totalRows] = await pool.query(totalQuery, [id_caixa]);

    // 2. Totais agrupados por forma de pagamento
    const paymentQuery = `
      SELECT 
        p.forma_pagamento,
        COALESCE(SUM(p.valor), 0) AS total
      FROM Pagamentos p
      INNER JOIN Vendas v ON p.id_venda = v.id_venda
      WHERE v.id_caixa = ? AND v.status_venda = 'FINALIZADA'
      GROUP BY p.forma_pagamento;
    `;
    const [paymentRows] = await pool.query(paymentQuery, [id_caixa]);

    const formas = {
      DINHEIRO: 0,
      CREDITO: 0,
      DEBITO: 0,
      PIX: 0,
      BOLETO: 0,
      CONVENIO: 0
    };

    for (const row of paymentRows) {
      if (formas[row.forma_pagamento] !== undefined) {
        formas[row.forma_pagamento] = Number(row.total);
      }
    }

    return {
      id_caixa,
      total_vendas: Number(totalRows[0]?.total_vendas || 0),
      quantidade_vendas: Number(totalRows[0]?.quantidade_vendas || 0),
      formas_pagamento: formas
    };
  }

  async getHistory({ limite = 30 }) {
    const query = `
      SELECT 
        c.id_caixa,
        c.id_funcionario,
        p.nome AS funcionario_nome,
        c.data_abertura,
        c.data_fechamento,
        c.valor_abertura,
        c.valor_fechamento,
        c.status_caixa,
        COALESCE(SUM(v.valor_liquido), 0) AS total_vendas_sessao
      FROM Caixas c
      INNER JOIN Funcionarios f ON c.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p ON f.id_pessoa = p.id_pessoa
      LEFT JOIN Vendas v ON v.id_caixa = c.id_caixa AND v.status_venda = 'FINALIZADA'
      GROUP BY c.id_caixa
      ORDER BY c.data_abertura DESC
      LIMIT ?;
    `;
    const [rows] = await pool.query(query, [Number(limite)]);
    return rows;
  }
}

module.exports = new CashierRepository();
