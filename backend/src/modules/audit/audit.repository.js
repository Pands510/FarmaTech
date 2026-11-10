
const { pool } = require('../../config/database');

class AuditRepository {
  async getAuditLogs({ tabela, operacao, limite = 50 } = {}) {
    const parsedLimit = Number(limite);

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 500
    ) {
      const error = new Error(
        'O limite de registros deve ser um inteiro entre 1 e 500.'
      );

      error.statusCode = 400;
      error.errorCode = 'INVALID_LIMIT';

      throw error;
    }

    let sql = `
      SELECT
        l.id_log,
        l.nome_tabela,
        l.operacao,
        l.id_registro,
        l.dados_antes,
        l.dados_depois,
        l.id_funcionario,
        p.nome AS funcionario_nome,
        l.data_hora
      FROM Log_Auditoria l
      LEFT JOIN Funcionarios f
        ON l.id_funcionario = f.id_funcionario
      LEFT JOIN Pessoas p
        ON f.id_pessoa = p.id_pessoa
      WHERE 1=1
    `;

    const params = [];

    if (tabela) {
      sql += ' AND l.nome_tabela = ?';
      params.push(tabela);
    }

    if (operacao) {
      sql += ' AND l.operacao = ?';
      params.push(operacao);
    }

    sql += ' ORDER BY l.data_hora DESC LIMIT ?;';
    params.push(parsedLimit);

    const [rows] = await pool.query(sql, params);

    return rows;
  }

  async getSalesReport({ data_inicio, data_fim } = {}) {
    let sql = `
      SELECT
        v.id_venda,
        v.numero_venda,
        v.data_hora,
        v.status_venda,
        v.valor_total,
        v.desconto_valor,
        v.valor_liquido,
        v.id_caixa,
        p_func.nome AS operador,
        COALESCE(p_cli.nome, 'Consumidor Final') AS cliente,
        (
          SELECT GROUP_CONCAT(
            CONCAT(p.descricao, ' (x', vi.quantidade, ')')
            SEPARATOR '; '
          )
          FROM Vendas_Itens vi
          INNER JOIN Produtos p
            ON vi.id_produto = p.id_produto
          WHERE vi.id_venda = v.id_venda
        ) AS itens_resumo,
        (
          SELECT GROUP_CONCAT(
            CONCAT(pg.forma_pagamento, ': R$ ', pg.valor)
            SEPARATOR '; '
          )
          FROM Pagamentos pg
          WHERE pg.id_venda = v.id_venda
        ) AS pagamentos_resumo
      FROM Vendas v
      INNER JOIN Funcionarios f
        ON v.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p_func
        ON f.id_pessoa = p_func.id_pessoa
      LEFT JOIN Clientes c
        ON v.id_cliente = c.id_cliente
      LEFT JOIN Pessoas p_cli
        ON c.id_pessoa = p_cli.id_pessoa
      WHERE 1=1
    `;

    const params = [];

    if (data_inicio) {
      sql += ' AND v.data_hora >= ?';
      params.push(data_inicio);
    }

    if (data_fim) {
      sql += ' AND v.data_hora < DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(data_fim);
    }

    sql += ' ORDER BY v.data_hora DESC LIMIT 100;';

    const [rows] = await pool.query(sql, params);

    return rows;
  }
}

module.exports = new AuditRepository();
