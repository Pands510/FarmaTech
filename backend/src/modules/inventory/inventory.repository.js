
const { pool } = require('../../config/database');

function createError(message, statusCode, errorCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

class InventoryRepository {
  async findLoteById(id_lote) {
    const query = `
      SELECT
        l.id_lote,
        l.id_produto,
        p.descricao AS produto_descricao,
        l.id_fornecedor,
        l.numero_lote,
        l.data_fabricacao,
        l.data_validade,
        l.quantidade,
        l.preco_custo_lote
      FROM Lotes l
      INNER JOIN Produtos p
        ON l.id_produto = p.id_produto
      WHERE l.id_lote = ?
      LIMIT 1;
    `;

    const [rows] = await pool.query(query, [id_lote]);
    return rows[0] || null;
  }

  async createLoteEntry(data, id_funcionario) {
    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const loteQuery = `
        INSERT INTO Lotes (
          id_produto,
          id_fornecedor,
          id_compra,
          numero_lote,
          data_fabricacao,
          data_validade,
          quantidade,
          preco_custo_lote
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `;

      const [loteResult] = await connection.query(loteQuery, [
        data.id_produto,
        data.id_fornecedor,
        data.id_compra ?? null,
        data.numero_lote,
        data.data_fabricacao ?? null,
        data.data_validade,
        data.quantidade,
        data.preco_custo_lote ?? 0
      ]);

      const id_lote = loteResult.insertId;

      const movQuery = `
        INSERT INTO Movimentos_Estoque (
          id_produto,
          id_lote,
          id_funcionario,
          tipo_movimento,
          quantidade_movimentada,
          motivo
        ) VALUES (?, ?, ?, 'ENTRADA', ?, ?);
      `;

      await connection.query(movQuery, [
        data.id_produto,
        id_lote,
        id_funcionario,
        data.quantidade,
        data.motivo ?? 'Entrada de mercadoria no estoque'
      ]);

      await connection.commit();
      transactionStarted = false;

      return id_lote;
    } catch (err) {
      if (transactionStarted) {
        await connection.rollback();
      }

      throw err;
    } finally {
      connection.release();
    }
  }

  async manualDischarge({
    id_produto,
    id_lote,
    quantidade,
    motivo,
    observacao,
    id_funcionario
  }) {
    const quantidadeNum = Number(quantidade);
    const idProdutoNum = Number(id_produto);
    const idLoteNum = Number(id_lote);

    if (
      !Number.isSafeInteger(idProdutoNum) ||
      idProdutoNum <= 0 ||
      !Number.isSafeInteger(idLoteNum) ||
      idLoteNum <= 0
    ) {
      throw createError(
        'Produto ou lote inválido.',
        400,
        'INVALID_PRODUCT_OR_BATCH'
      );
    }

    if (!Number.isFinite(quantidadeNum) || quantidadeNum <= 0) {
      throw createError(
        'A quantidade da baixa deve ser maior que zero.',
        400,
        'INVALID_DISCHARGE_QUANTITY'
      );
    }

    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const [lotes] = await connection.query(
        `
          SELECT id_lote, id_produto, quantidade
          FROM Lotes
          WHERE id_lote = ?
          FOR UPDATE;
        `,
        [idLoteNum]
      );

      if (lotes.length === 0) {
        throw createError(
          'Lote informado não foi localizado.',
          404,
          'BATCH_NOT_FOUND'
        );
      }

      const lote = lotes[0];

      if (Number(lote.id_produto) !== idProdutoNum) {
        throw createError(
          'O lote informado não pertence a este produto.',
          400,
          'BATCH_MISMATCH'
        );
      }

      const saldoLote = Number(lote.quantidade);

      if (!Number.isFinite(saldoLote) || saldoLote < quantidadeNum) {
        throw createError(
          `Saldo insuficiente no lote ${idLoteNum}. Saldo atual: ${saldoLote}, solicitado: ${quantidadeNum}.`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }

      const [updateResult] = await connection.query(
        `
          UPDATE Lotes
          SET quantidade = quantidade - ?
          WHERE id_lote = ?
            AND quantidade >= ?;
        `,
        [quantidadeNum, idLoteNum, quantidadeNum]
      );

      if (updateResult.affectedRows !== 1) {
        throw createError(
          'Não foi possível atualizar o saldo do lote.',
          409,
          'BATCH_BALANCE_UPDATE_FAILED'
        );
      }

      const motivoTexto = observacao
        ? `${motivo} - ${observacao}`
        : motivo;

      await connection.query(
        `
          INSERT INTO Movimentos_Estoque (
            id_produto,
            id_lote,
            id_funcionario,
            tipo_movimento,
            quantidade_movimentada,
            motivo
          ) VALUES (?, ?, ?, 'ACERTO_SAIDA', ?, ?);
        `,
        [
          idProdutoNum,
          idLoteNum,
          id_funcionario,
          quantidadeNum,
          motivoTexto
        ]
      );

      const [prodRows] = await connection.query(
        'SELECT fn_estoque_disponivel(?) AS saldo_atual;',
        [idProdutoNum]
      );

      await connection.commit();
      transactionStarted = false;

      return {
        id_produto: idProdutoNum,
        id_lote: idLoteNum,
        quantidade_baixada: quantidadeNum,
        saldo_restante_lote: saldoLote - quantidadeNum,
        saldo_disponivel_produto: Number(
          prodRows[0]?.saldo_atual ?? 0
        )
      };
    } catch (err) {
      if (transactionStarted) {
        await connection.rollback();
      }

      throw err;
    } finally {
      connection.release();
    }
  }

  async getStockMovements({ id_produto, limite = 50 } = {}) {
    const limiteNum = Number(limite);

    if (
      !Number.isSafeInteger(limiteNum) ||
      limiteNum < 1 ||
      limiteNum > 500
    ) {
      throw createError(
        'O limite deve ser um número inteiro entre 1 e 500.',
        400,
        'INVALID_LIMIT'
      );
    }

    const sql = `
      SELECT
        m.id_movimento,
        m.id_produto,
        p.descricao AS produto_descricao,
        m.id_lote,
        l.numero_lote,
        m.id_venda,
        m.id_funcionario,
        p_func.nome AS funcionario_nome,
        m.tipo_movimento,
        m.quantidade_movimentada,
        m.motivo,
        m.data_movimentacao
      FROM Movimentos_Estoque m
      INNER JOIN Produtos p
        ON m.id_produto = p.id_produto
      LEFT JOIN Lotes l
        ON m.id_lote = l.id_lote
      INNER JOIN Funcionarios f
        ON m.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p_func
        ON f.id_pessoa = p_func.id_pessoa
      WHERE 1 = 1
      ${id_produto !== undefined && id_produto !== null
        ? 'AND m.id_produto = ?'
        : ''}
      ORDER BY m.data_movimentacao DESC
      LIMIT ?;
    `;

    const params = [];

    if (id_produto !== undefined && id_produto !== null) {
      const idProdutoNum = Number(id_produto);

      if (
        !Number.isSafeInteger(idProdutoNum) ||
        idProdutoNum <= 0
      ) {
        throw createError(
          'ID do produto inválido.',
          400,
          'INVALID_PRODUCT_ID'
        );
      }

      params.push(idProdutoNum);
    }

    params.push(limiteNum);

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  async getSuppliers() {
    const query = `
      SELECT
        f.id_fornecedor,
        p.razao_social,
        p.nome_fantasia,
        f.inscricao_estadual,
        p.status
      FROM Fornecedores f
      INNER JOIN Pessoas p
        ON f.id_pessoa = p.id_pessoa
      WHERE p.status = 'ATIVO'
      ORDER BY p.razao_social ASC;
    `;

    const [rows] = await pool.query(query);
    return rows;
  }
}

module.exports = new InventoryRepository();
