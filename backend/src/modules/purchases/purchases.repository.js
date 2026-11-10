const { pool } = require('../../config/database');

function createError(message, statusCode, errorCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

class PurchasesRepository {
  async findAll({ status, id_fornecedor, limite = 50 } = {}) {
    const limit = Number(limite);

    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
      throw createError(
        'O limite deve ser um inteiro entre 1 e 500.',
        400,
        'INVALID_LIMIT'
      );
    }

    let sql = `
      SELECT
        c.id_compra,
        c.numero_nf,
        c.id_fornecedor,
        p.razao_social AS fornecedor_nome,
        c.data_compra,
        c.valor_total,
        c.status_compra,
        (
          SELECT COUNT(*)
          FROM Compras_Itens ci
          WHERE ci.id_compra = c.id_compra
        ) AS total_itens
      FROM Compras c
      INNER JOIN Fornecedores f
        ON c.id_fornecedor = f.id_fornecedor
      INNER JOIN Pessoas p
        ON f.id_pessoa = p.id_pessoa
      WHERE 1 = 1
    `;

    const params = [];

    if (status !== undefined && status !== null && status !== '') {
      sql += ' AND c.status_compra = ?';
      params.push(status);
    }

    if (id_fornecedor !== undefined && id_fornecedor !== null) {
      const supplierId = Number(id_fornecedor);

      if (!Number.isSafeInteger(supplierId) || supplierId <= 0) {
        throw createError(
          'Identificador de fornecedor inválido.',
          400,
          'INVALID_SUPPLIER_ID'
        );
      }

      sql += ' AND c.id_fornecedor = ?';
      params.push(supplierId);
    }

    sql += ' ORDER BY c.data_compra DESC LIMIT ?';
    params.push(limit);

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
      INNER JOIN Fornecedores f
        ON c.id_fornecedor = f.id_fornecedor
      INNER JOIN Pessoas p
        ON f.id_pessoa = p.id_pessoa
      WHERE c.id_compra = ?
      LIMIT 1;
    `;

    const [rows] = await pool.query(sql, [id_compra]);

    if (rows.length === 0) {
      return null;
    }

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
      INNER JOIN Produtos pr
        ON ci.id_produto = pr.id_produto
      WHERE ci.id_compra = ?;
    `;

    const [items] = await pool.query(itemsSql, [id_compra]);

    const lotsSql = `
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

    const [lots] = await pool.query(lotsSql, [id_compra]);

    return {
      ...purchase,
      itens: items,
      lotes_gerados: lots
    };
  }

  async createPurchase({ id_fornecedor, numero_nf, itens }) {
    if (!Array.isArray(itens) || itens.length === 0) {
      throw createError(
        'A compra precisa possuir pelo menos um item.',
        400,
        'PURCHASE_ITEMS_REQUIRED'
      );
    }

    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const insertCompraSql = `
        INSERT INTO Compras (
          id_fornecedor,
          numero_nf,
          valor_total,
          status_compra
        )
        VALUES (?, ?, 0, 'PENDENTE');
      `;

      const [compraResult] = await connection.query(
        insertCompraSql,
        [id_fornecedor, numero_nf]
      );

      const id_compra = compraResult.insertId;

      const insertItemSql = `
        INSERT INTO Compras_Itens (
          id_compra,
          id_produto,
          quantidade,
          preco_unitario
        )
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

      // Deixa o MySQL calcular o total usando os tipos DECIMAL das colunas.
      const [totalResult] = await connection.query(
        `
          SELECT COALESCE(
            SUM(quantidade * preco_unitario),
            0
          ) AS valor_total
          FROM Compras_Itens
          WHERE id_compra = ?;
        `,
        [id_compra]
      );

      await connection.query(
        `
          UPDATE Compras
          SET valor_total = ?
          WHERE id_compra = ?;
        `,
        [totalResult[0].valor_total, id_compra]
      );

      await connection.commit();
      transactionStarted = false;

      return id_compra;

    } catch (err) {
      if (transactionStarted) {
        await connection.rollback();
      }

      throw err;

    } finally {
      connection.release();
    }
  }

  async receivePurchase(id_compra, lotes, id_funcionario) {
    if (!Array.isArray(lotes) || lotes.length === 0) {
      throw createError(
        'Informe os lotes recebidos.',
        400,
        'PURCHASE_LOTS_REQUIRED'
      );
    }

    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      // Bloqueia a compra para impedir recebimentos simultâneos.
      const [compras] = await connection.query(
        `
          SELECT
            id_compra,
            id_fornecedor,
            numero_nf,
            status_compra
          FROM Compras
          WHERE id_compra = ?
          FOR UPDATE;
        `,
        [id_compra]
      );

      if (compras.length === 0) {
        throw createError(
          `Ordem de compra ${id_compra} não encontrada.`,
          404,
          'PURCHASE_NOT_FOUND'
        );
      }

      const compra = compras[0];

      if (compra.status_compra !== 'PENDENTE') {
        throw createError(
          'Somente compras pendentes podem ser recebidas.',
          409,
          'PURCHASE_NOT_PENDING'
        );
      }

      // Busca e bloqueia os itens que compõem a compra.
      const [itensCompra] = await connection.query(
        `
          SELECT
            id_produto,
            quantidade
          FROM Compras_Itens
          WHERE id_compra = ?
          FOR UPDATE;
        `,
        [id_compra]
      );

      if (itensCompra.length === 0) {
        throw createError(
          'A ordem de compra não possui itens.',
          400,
          'PURCHASE_WITHOUT_ITEMS'
        );
      }

      // Consolida as quantidades compradas por produto.
      const quantidadesCompradas = new Map();

      for (const item of itensCompra) {
        const productId = Number(item.id_produto);
        const quantity = Number(item.quantidade);

        quantidadesCompradas.set(
          productId,
          (quantidadesCompradas.get(productId) || 0) + quantity
        );
      }

      // Consolida as quantidades informadas nos lotes recebidos.
      const quantidadesRecebidas = new Map();

      for (const lote of lotes) {
        if (!lote || typeof lote !== 'object') {
          throw createError(
            'Um dos lotes informados é inválido.',
            400,
            'INVALID_PURCHASE_LOT'
          );
        }

        const productId = Number(lote.id_produto);
        const quantity = Number(lote.quantidade);

        if (
          !Number.isSafeInteger(productId) ||
          productId <= 0 ||
          !Number.isFinite(quantity) ||
          quantity <= 0
        ) {
          throw createError(
            'Produto ou quantidade inválida em um dos lotes.',
            400,
            'INVALID_PURCHASE_LOT'
          );
        }

        if (!quantidadesCompradas.has(productId)) {
          throw createError(
            `O produto ${productId} não pertence a esta compra.`,
            400,
            'PRODUCT_NOT_IN_PURCHASE'
          );
        }

        quantidadesRecebidas.set(
          productId,
          (quantidadesRecebidas.get(productId) || 0) + quantity
        );
      }

      // Exige correspondência integral entre compra e recebimento.
      for (const [productId, purchasedQuantity] of quantidadesCompradas) {
        const receivedQuantity = quantidadesRecebidas.get(productId) || 0;

        if (Math.abs(purchasedQuantity - receivedQuantity) > 1e-9) {
          throw createError(
            `A quantidade recebida do produto ${productId} não corresponde à quantidade comprada.`,
            400,
            'PURCHASE_QUANTITY_MISMATCH'
          );
        }
      }

      const insertLoteSql = `
        INSERT INTO Lotes (
          id_produto,
          id_fornecedor,
          id_compra,
          numero_lote,
          data_fabricacao,
          data_validade,
          quantidade,
          preco_custo_lote
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `;

      const insertMovSql = `
        INSERT INTO Movimentos_Estoque (
          id_produto,
          id_lote,
          id_funcionario,
          tipo_movimento,
          quantidade_movimentada,
          motivo
        )
        VALUES (?, ?, ?, 'ENTRADA', ?, ?);
      `;

      for (const lote of lotes) {
        const [loteResult] = await connection.query(
          insertLoteSql,
          [
            lote.id_produto,
            compra.id_fornecedor,
            id_compra,
            lote.numero_lote,
            lote.data_fabricacao ?? null,
            lote.data_validade,
            lote.quantidade,
            lote.preco_custo_lote ?? 0
          ]
        );

        const id_lote = loteResult.insertId;

        await connection.query(
          insertMovSql,
          [
            lote.id_produto,
            id_lote,
            id_funcionario,
            lote.quantidade,
            `Entrada NF ${compra.numero_nf}`
          ]
        );
      }

      const [updateResult] = await connection.query(
        `
          UPDATE Compras
          SET status_compra = 'RECEBIDA'
          WHERE id_compra = ?
            AND status_compra = 'PENDENTE';
        `,
        [id_compra]
      );

      if (updateResult.affectedRows !== 1) {
        throw createError(
          'Não foi possível atualizar o status da compra.',
          409,
          'PURCHASE_STATUS_UPDATE_FAILED'
        );
      }

      await connection.commit();
      transactionStarted = false;

      return true;

    } catch (err) {
      if (transactionStarted) {
        await connection.rollback();
      }

      throw err;

    } finally {
      connection.release();
    }
  }
}

module.exports = new PurchasesRepository();