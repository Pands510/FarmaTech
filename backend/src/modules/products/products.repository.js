
const { pool } = require('../../config/database');

class ProductsRepository {
  async findAll({ busca, id_grupo, status, precisa_receita }) {
    let sql = `
      SELECT
        p.id_produto,
        p.descricao,
        p.e_medicamento,
        p.precisa_receita,
        p.id_grupo,
        g.nome AS grupo_nome,
        p.id_subgrupo,
        sg.nome AS subgrupo_nome,
        p.marca,
        p.fabricante,
        p.codigo_barras,
        p.preco_custo,
        p.preco_venda,
        p.estoque_minimo,
        p.status_produto,
        p.principio_ativo,
        p.apresentacao,
        p.dosagem,
        p.registro_anvisa,
        fn_estoque_disponivel(p.id_produto) AS estoque_disponivel
      FROM Produtos p
      INNER JOIN Grupos g ON p.id_grupo = g.id_grupo
      LEFT JOIN Subgrupos sg ON p.id_subgrupo = sg.id_subgrupo
      WHERE 1=1
    `;

    const params = [];

    if (busca) {
      sql += `
        AND (
          p.descricao LIKE ?
          OR p.codigo_barras LIKE ?
          OR p.principio_ativo LIKE ?
        )
      `;

      const term = `%${busca}%`;
      params.push(term, term, term);
    }

    if (id_grupo !== undefined && id_grupo !== null) {
      sql += ' AND p.id_grupo = ?';
      params.push(id_grupo);
    }

    if (status) {
      sql += ' AND p.status_produto = ?';
      params.push(status);
    }

    if (precisa_receita !== undefined && precisa_receita !== null) {
      sql += ' AND p.precisa_receita = ?';
      params.push(precisa_receita ? 1 : 0);
    }

    sql += ' ORDER BY p.descricao ASC;';

    const [rows] = await pool.query(sql, params);

    return rows;
  }

  async findById(id_produto) {
    const sql = `
      SELECT
        p.id_produto,
        p.descricao,
        p.e_medicamento,
        p.precisa_receita,
        p.id_grupo,
        g.nome AS grupo_nome,
        p.id_subgrupo,
        sg.nome AS subgrupo_nome,
        p.marca,
        p.fabricante,
        p.codigo_barras,
        p.preco_custo,
        p.preco_venda,
        p.estoque_minimo,
        p.status_produto,
        p.principio_ativo,
        p.apresentacao,
        p.dosagem,
        p.registro_anvisa,
        fn_estoque_disponivel(p.id_produto) AS estoque_disponivel
      FROM Produtos p
      INNER JOIN Grupos g ON p.id_grupo = g.id_grupo
      LEFT JOIN Subgrupos sg ON p.id_subgrupo = sg.id_subgrupo
      WHERE p.id_produto = ?
      LIMIT 1;
    `;

    const [rows] = await pool.query(sql, [id_produto]);

    return rows[0] || null;
  }

  async findLotesFifo(id_produto) {
    const sql = `
      SELECT
        l.id_lote,
        l.id_produto,
        l.numero_lote,
        l.data_fabricacao,
        l.data_validade,
        l.quantidade,
        l.preco_custo_lote,
        l.id_fornecedor,
        p_forn.razao_social AS fornecedor_nome,
        CASE
          WHEN l.data_validade < CURDATE() THEN 'VENCIDO'
          WHEN l.quantidade <= 0 THEN 'ESGOTADO'
          ELSE 'DISPONIVEL'
        END AS situacao_lote
      FROM Lotes l
      INNER JOIN Fornecedores f
        ON l.id_fornecedor = f.id_fornecedor
      INNER JOIN Pessoas p_forn
        ON f.id_pessoa = p_forn.id_pessoa
      WHERE l.id_produto = ?
        AND l.quantidade > 0
        AND l.data_validade >= CURDATE()
      ORDER BY l.data_validade ASC, l.data_entrada ASC;
    `;

    const [rows] = await pool.query(sql, [id_produto]);

    return rows;
  }

  async create(data) {
    const sql = `
      INSERT INTO Produtos (
        descricao,
        e_medicamento,
        precisa_receita,
        id_grupo,
        id_subgrupo,
        marca,
        fabricante,
        codigo_barras,
        preco_custo,
        preco_venda,
        estoque_minimo,
        status_produto,
        principio_ativo,
        apresentacao,
        dosagem,
        registro_anvisa
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    const params = [
      data.descricao,
      data.e_medicamento ? 1 : 0,
      data.precisa_receita ? 1 : 0,
      data.id_grupo,
      data.id_subgrupo ?? null,
      data.marca ?? null,
      data.fabricante ?? null,
      data.codigo_barras ?? null,
      data.preco_custo ?? 0,
      data.preco_venda,
      data.estoque_minimo ?? 5,
      data.status_produto ?? 'ATIVO',
      data.principio_ativo ?? null,
      data.apresentacao ?? null,
      data.dosagem ?? null,
      data.registro_anvisa ?? null
    ];

    const [result] = await pool.query(sql, params);

    return result.insertId;
  }

  async update(id_produto, data) {
    const allowedFields = {
      descricao: 'descricao',
      e_medicamento: 'e_medicamento',
      precisa_receita: 'precisa_receita',
      id_grupo: 'id_grupo',
      id_subgrupo: 'id_subgrupo',
      marca: 'marca',
      fabricante: 'fabricante',
      codigo_barras: 'codigo_barras',
      preco_custo: 'preco_custo',
      preco_venda: 'preco_venda',
      estoque_minimo: 'estoque_minimo',
      status_produto: 'status_produto',
      principio_ativo: 'principio_ativo',
      apresentacao: 'apresentacao',
      dosagem: 'dosagem',
      registro_anvisa: 'registro_anvisa'
    };

    const fields = [];
    const params = [];

    for (const [field, column] of Object.entries(allowedFields)) {
      if (!Object.prototype.hasOwnProperty.call(data, field)) {
        continue;
      }

      let value = data[field];

      if (field === 'e_medicamento' || field === 'precisa_receita') {
        value = value ? 1 : 0;
      }

      fields.push(`${column} = ?`);
      params.push(value);
    }

    if (fields.length === 0) {
      return {
        affectedRows: 0,
        changedRows: 0
      };
    }

    const sql = `
      UPDATE Produtos
      SET ${fields.join(', ')}
      WHERE id_produto = ?;
    `;

    params.push(id_produto);

    const [result] = await pool.query(sql, params);

    return result;
  }

  async inactivate(id_produto) {
    const sql = `
      UPDATE Produtos
      SET status_produto = 'INATIVO'
      WHERE id_produto = ?
        AND status_produto <> 'INATIVO';
    `;

    const [result] = await pool.query(sql, [id_produto]);

    return result;
  }

  async getGroupsAndSubgroups() {
    const sql = `
      SELECT
        g.id_grupo,
        g.nome AS grupo_nome,
        sg.id_subgrupo,
        sg.nome AS subgrupo_nome
      FROM Grupos g
      LEFT JOIN Subgrupos sg
        ON g.id_grupo = sg.id_grupo
      ORDER BY g.nome ASC, sg.nome ASC;
    `;

    const [rows] = await pool.query(sql);

    const groupsMap = new Map();

    for (const row of rows) {
      if (!groupsMap.has(row.id_grupo)) {
        groupsMap.set(row.id_grupo, {
          id_grupo: row.id_grupo,
          nome: row.grupo_nome,
          subgrupos: []
        });
      }

      if (row.id_subgrupo !== null) {
        groupsMap.get(row.id_grupo).subgrupos.push({
          id_subgrupo: row.id_subgrupo,
          nome: row.subgrupo_nome
        });
      }
    }

    return Array.from(groupsMap.values());
  }
}

module.exports = new ProductsRepository();
