const { pool } = require('../../config/database');

class PurchasesRepository {
  async findAll({ status, id_fornecedor, limite = 50 }) {
    let sql = `
      SELECT 
        c.id_compra,
        c.numero_nf,
        c.id_fornecedor,
        p.razao_social AS fornecedor_nome,
        c.data_compra,
        c.valor_total,
        c.status_compra,
        (SELECT COUNT(*) FROM Compras_Itens ci WHERE ci.id_compra = c.id_compra) AS total_itens
      FROM Compras c
      INNER JOIN Fornecedores f ON c.id_fornecedor = f.id_fornecedor
      INNER JOIN Pessoas p ON f.id_pessoa = p.id_pessoa
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND c.status_compra = ?';
      params.push(status);
    }

    if (id_fornecedor) {
      sql += ' AND c.id_fornecedor = ?';
      params.push(id_fornecedor);
    }

    sql += ' ORDER BY c.data_compra DESC LIMIT ?;';
    params.push(Number(limite));

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  async findById(id_compra) {
    const sql = `
      SELECT 
        c.id_compra,
        c.numero_nf,
        c.id_fornecedor,
        p.razao_social AS fornecedor_nome,
        p.nome_fantasia AS fornecedor_fantasia,
        c.data_compra,
        c.valor_total,
        c.status_compra
      FROM Compras c
      INNER JOIN Fornecedores f ON c.id_fornecedor = f.id_fornecedor
      INNER JOIN Pessoas p ON f.id_pessoa = p.id_pessoa
      WHERE c.id_compra = ?
      LIMIT 1;
    `;
    const [rows] = await pool.query(sql, [id_compra]);
    if (rows.length === 0) return null;

    const purchase = rows[0];

    const itemsSql = `
      SELECT 
        ci.id_compra_item,
        ci.id_produto,
        pr.descricao AS produto_descricao,
        ci.quantidade,
        ci.preco_unitario,
        ci.subtotal
      FROM Compras_Itens ci
      INNER JOIN Produtos pr ON ci.id_produto = pr.id_produto
      WHERE ci.id_compra = ?;
    `;
    const [items] = await pool.query(itemsSql, [id_compra]);

    const lotesSql = `
      SELECT 
        id_lote,
        id_produto,
        numero_lote,
        data_validade,
        quantidade,
        preco_custo_lote
      FROM Lotes
      WHERE id_compra = ?;
    `;
    const [lotes] = await pool.query(lotesSql, [id_compra]);

    return {
      ...purchase,
      itens: items,
      lotes_gerados: lotes
    };
  }

  async createPurchase({ id_fornecedor, numero_nf, itens }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      let valor_total = 0;
      for (const item of itens) {
        valor_total += Number(item.quantidade) * Number(item.preco_unitario);
      }

      const insertCompraSql = `
        INSERT INTO Compras (id_fornecedor, numero_nf, valor_total, status_compra)
        VALUES (?, ?, ?, 'PENDENTE');
      `;
      const [compraResult] = await connection.query(insertCompraSql, [
        id_fornecedor,
        numero_nf,
        valor_total
      ]);

      const id_compra = compraResult.insertId;

      const insertItemSql = `
        INSERT INTO Compras_Itens (id_compra, id_produto, quantidade, preco_unitario)
        VALUES (?, ?, ?, ?);
      `;
      for (const item of itens) {
        await connection.query(insertItemSql, [
          id_compra,
          item.id_produto,
          item.quantidade,
          item.preco_unitario
        ]);
      }

      await connection.commit();
      return id_compra;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async receivePurchase(id_compra, lotes, id_funcionario) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Inspeciona status da compra
      const [compras] = await connection.query(
        'SELECT id_compra, id_fornecedor, numero_nf, status_compra FROM Compras WHERE id_compra = ? FOR UPDATE;',
        [id_compra]
      );

      if (compras.length === 0) {
        const err = new Error(`Ordem de compra ${id_compra} não encontrada.`);
        err.statusCode = 404;
        err.errorCode = 'PURCHASE_NOT_FOUND';
        throw err;
      }

      const compra = compras[0];
      if (compra.status_compra === 'RECEBIDA') {
        const err = new Error(`Esta ordem de compra já foi recebida anteriormente.`);
        err.statusCode = 400;
        err.errorCode = 'ALREADY_RECEIVED';
        throw err;
      }

      // Para cada lote enviado na entrada fiscal:
      const insertLoteSql = `
        INSERT INTO Lotes (
          id_produto, id_fornecedor, id_compra, numero_lote,
          data_fabricacao, data_validade, quantidade, preco_custo_lote
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `;

      const insertMovSql = `
        INSERT INTO Movimentos_Estoque (
          id_produto, id_lote, id_funcionario,
          tipo_movimento, quantidade_movimentada, motivo
        ) VALUES (?, ?, ?, 'ENTRADA', ?, ?);
      `;

      for (const l of lotes) {
        const [loteResult] = await connection.query(insertLoteSql, [
          l.id_produto,
          compra.id_fornecedor,
          id_compra,
          l.numero_lote,
          l.data_fabricacao || null,
          l.data_validade,
          l.quantidade,
          l.preco_custo_lote || 0
        ]);

        const id_lote = loteResult.insertId;

        await connection.query(insertMovSql, [
          l.id_produto,
          id_lote,
          id_funcionario,
          l.quantidade,
          `Entrada NF ${compra.numero_nf}`
        ]);
      }

      // Atualiza status da compra para RECEBIDA
      await connection.query(
        "UPDATE Compras SET status_compra = 'RECEBIDA' WHERE id_compra = ?;",
        [id_compra]
      );

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = new PurchasesRepository();
