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
      INNER JOIN Funcionarios f
        ON c.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p
        ON f.id_pessoa = p.id_pessoa
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
      INNER JOIN Funcionarios f
        ON c.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p
        ON f.id_pessoa = p.id_pessoa
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
      INNER JOIN Funcionarios f
        ON c.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p
        ON f.id_pessoa = p.id_pessoa
      WHERE c.id_caixa = ?
      LIMIT 1;
    `;

    const [rows] = await pool.query(query, [id_caixa]);
    return rows[0] || null;
  }

  async openCaixa(id_funcionario, valor_abertura) {
    const query = `
      INSERT INTO Caixas (
        id_funcionario,
        valor_abertura,
        status_caixa
      )
      VALUES (?, ?, 'ABERTO');
    `;

    const [result] = await pool.query(query, [
      id_funcionario,
      valor_abertura
    ]);

    return result.insertId;
  }

  async closeCaixaWithProcedure(id_caixa, valor_informado) {
    const query = 'CALL sp_fechar_caixa(?, ?);';

    const [rows] = await pool.query(query, [
      id_caixa,
      valor_informado
    ]);

    // Primeiro conjunto de resultados retornado pela procedure.
    const procedureResult =
      Array.isArray(rows) && Array.isArray(rows[0])
        ? rows[0][0] || null
        : null;

    return procedureResult;
  }

  async getCaixaSummary(id_caixa) {
    const totalQuery = `
      SELECT
        COALESCE(SUM(valor_liquido), 0) AS total_vendas,
        COUNT(id_venda) AS quantidade_vendas
      FROM Vendas
      WHERE id_caixa = ?
        AND status_venda = 'FINALIZADA';
    `;

    const [totalRows] = await pool.query(totalQuery, [id_caixa]);

    const paymentQuery = `
      SELECT
        p.forma_pagamento,
        COALESCE(SUM(p.valor), 0) AS total
      FROM Pagamentos p
      INNER JOIN Vendas v
        ON p.id_venda = v.id_venda
      WHERE v.id_caixa = ?
        AND v.status_venda = 'FINALIZADA'
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
      const forma = String(row.forma_pagamento).toUpperCase();

      if (Object.prototype.hasOwnProperty.call(formas, forma)) {
        formas[forma] = Number(row.total);
      }
    }

    return {
      id_caixa,
      total_vendas: Number(totalRows[0]?.total_vendas || 0),
      quantidade_vendas: Number(totalRows[0]?.quantidade_vendas || 0),
      formas_pagamento: formas
    };
  }

  async getHistory({ limite = 30 } = {}) {
    const parsedLimit = Number(limite);

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 500
    ) {
      const error = new Error(
        'O limite do histórico deve ser um inteiro entre 1 e 500.'
      );

      error.statusCode = 400;
      error.errorCode = 'INVALID_LIMIT';

      throw error;
    }

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
        COALESCE(v.total_vendas_sessao, 0) AS total_vendas_sessao
      FROM Caixas c
      INNER JOIN Funcionarios f
        ON c.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p
        ON f.id_pessoa = p.id_pessoa
      LEFT JOIN (
        SELECT
          id_caixa,
          SUM(valor_liquido) AS total_vendas_sessao
        FROM Vendas
        WHERE status_venda = 'FINALIZADA'
        GROUP BY id_caixa
      ) v ON v.id_caixa = c.id_caixa
      ORDER BY c.data_abertura DESC
      LIMIT ?;
    `;

    const [rows] = await pool.query(query, [parsedLimit]);
    return rows;
  }
}

module.exports = new CashierRepository();