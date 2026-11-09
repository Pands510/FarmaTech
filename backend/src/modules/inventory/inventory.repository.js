const { pool } = require('../../config/database');

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
      INNER JOIN Produtos p ON l.id_produto = p.id_produto
      WHERE l.id_lote = ?
      LIMIT 1;
    `;
    const [rows] = await pool.query(query, [id_lote]);
    return rows[0] || null;
  }

  async createLoteEntry(data, id_funcionario) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Insere o Lote
      const loteQuery = `
        INSERT INTO Lotes (
          id_produto, id_fornecedor, id_compra, numero_lote,
          data_fabricacao, data_validade, quantidade, preco_custo_lote
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `;
      const [loteResult] = await connection.query(loteQuery, [
        data.id_produto,
        data.id_fornecedor,
        data.id_compra || null,
        data.numero_lote,
        data.data_fabricacao || null,
        data.data_validade,
        data.quantidade,
        data.preco_custo_lote || 0
      ]);

      const id_lote = loteResult.insertId;

      // 2. Insere auditoria em Movimentos_Estoque
      const movQuery = `
        INSERT INTO Movimentos_Estoque (
          id_produto, id_lote, id_funcionario,
          tipo_movimento, quantidade_movimentada, motivo
        ) VALUES (?, ?, ?, 'ENTRADA', ?, ?);
      `;
      await connection.query(movQuery, [
        data.id_produto,
        id_lote,
        id_funcionario,
        data.quantidade,
        data.motivo || 'Entrada de mercadoria no estoque'
      ]);

      await connection.commit();
      return id_lote;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async manualDischarge({ id_produto, id_lote, quantidade, motivo, observacao, id_funcionario }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Busca lote com lock FOR UPDATE para consistência transacional
      const [lotes] = await connection.query(
        'SELECT id_lote, id_produto, quantidade FROM Lotes WHERE id_lote = ? FOR UPDATE;',
        [id_lote]
      );

      if (lotes.length === 0) {
        const err = new Error('Lote informado não foi localizado.');
        err.statusCode = 404;
        err.errorCode = 'BATCH_NOT_FOUND';
        throw err;
      }

      const lote = lotes[0];

      if (lote.id_produto !== id_produto) {
        const err = new Error('O lote informado não pertence a este produto.');
        err.statusCode = 400;
        err.errorCode = 'BATCH_MISMATCH';
        throw err;
      }

      if (lote.quantidade < quantidade) {
        const err = new Error(`Saldo insuficiente no lote ${id_lote}. Saldo atual: ${lote.quantidade}, Solicitado: ${quantidade}.`);
        err.statusCode = 400;
        err.errorCode = 'INSUFFICIENT_STOCK';
        throw err;
      }

      // 2. Baixa física no lote
      await connection.query(
        'UPDATE Lotes SET quantidade = quantidade - ? WHERE id_lote = ?;',
        [quantidade, id_lote]
      );

      // 3. Registra auditoria em Movimentos_Estoque
      const motivoTexto = observacao ? `${motivo} - ${observacao}` : motivo;
      await connection.query(
        `INSERT INTO Movimentos_Estoque (
          id_produto, id_lote, id_funcionario,
          tipo_movimento, quantidade_movimentada, motivo
        ) VALUES (?, ?, ?, 'ACERTO_SAIDA', ?, ?);`,
        [id_produto, id_lote, id_funcionario, quantidade, motivoTexto]
      );

      // 4. Saldo atualizado do produto
      const [prodRows] = await connection.query(
        'SELECT fn_estoque_disponivel(?) AS saldo_atual;',
        [id_produto]
      );

      await connection.commit();

      return {
        id_produto,
        id_lote,
        quantidade_baixada: quantidade,
        saldo_restante_lote: lote.quantidade - quantidade,
        saldo_disponivel_produto: prodRows[0]?.saldo_atual || 0
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async getStockMovements({ id_produto, limite = 50 }) {
    let sql = `
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
      INNER JOIN Produtos p ON m.id_produto = p.id_produto
      INNER JOIN Lotes l ON m.id_lote = l.id_lote
      INNER JOIN Funcionarios f ON m.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p_func ON f.id_pessoa = p_func.id_pessoa
      WHERE 1=1
    `;
    const params = [];

    if (id_produto) {
      sql += ' AND m.id_produto = ?';
      params.push(id_produto);
    }

    sql += ' ORDER BY m.data_movimentacao DESC LIMIT ?;';
    params.push(Number(limite));

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
      INNER JOIN Pessoas p ON f.id_pessoa = p.id_pessoa
      WHERE p.status = 'ATIVO'
      ORDER BY p.razao_social ASC;
    `;
    const [rows] = await pool.query(query);
    return rows;
  }
}

module.exports = new InventoryRepository();
