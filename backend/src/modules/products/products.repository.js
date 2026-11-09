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
      INNER JOIN Subgrupos sg ON p.id_subgrupo = sg.id_subgrupo
      WHERE 1=1
    `;
    const params = [];

    if (busca) {
      sql += ` AND (p.descricao LIKE ? OR p.codigo_barras LIKE ? OR p.principio_ativo LIKE ?)`;
      const term = `%${busca}%`;
      params.push(term, term, term);
    }

    if (id_grupo) {
      sql += ` AND p.id_grupo = ?`;
      params.push(id_grupo);
    }

    if (status) {
      sql += ` AND p.status_produto = ?`;
      params.push(status);
    }

    if (precisa_receita !== undefined && precisa_receita !== null && precisa_receita !== '') {
      sql += ` AND p.precisa_receita = ?`;
      params.push(precisa_receita === 'true' || precisa_receita === true || precisa_receita === 1 ? 1 : 0);
    }

    sql += ` ORDER BY p.descricao ASC;`;

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
      INNER JOIN Subgrupos sg ON p.id_subgrupo = sg.id_subgrupo
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
      INNER JOIN Fornecedores f ON l.id_fornecedor = f.id_fornecedor
      INNER JOIN Pessoas p_forn ON f.id_pessoa = p_forn.id_pessoa
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
        descricao, e_medicamento, precisa_receita, id_grupo, id_subgrupo,
        marca, fabricante, codigo_barras, preco_custo, preco_venda,
        estoque_minimo, status_produto, principio_ativo, apresentacao,
        dosagem, registro_anvisa
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      data.descricao,
      data.e_medicamento ? 1 : 0,
      data.precisa_receita ? 1 : 0,
      data.id_grupo,
      data.id_subgrupo,
      data.marca || null,
      data.fabricante || null,
      data.codigo_barras || null,
      data.preco_custo || 0,
      data.preco_venda,
      data.estoque_minimo !== undefined ? data.estoque_minimo : 5,
      data.status_produto || 'ATIVO',
      data.principio_ativo || null,
      data.apresentacao || null,
      data.dosagem || null,
      data.registro_anvisa || null
    ];

    const [result] = await pool.query(sql, params);
    return result.insertId;
  }

  async update(id_produto, data) {
    const sql = `
      UPDATE Produtos SET
        descricao = COALESCE(?, descricao),
        e_medicamento = COALESCE(?, e_medicamento),
        precisa_receita = COALESCE(?, precisa_receita),
        id_grupo = COALESCE(?, id_grupo),
        id_subgrupo = COALESCE(?, id_subgrupo),
        marca = COALESCE(?, marca),
        fabricante = COALESCE(?, fabricante),
        codigo_barras = COALESCE(?, codigo_barras),
        preco_custo = COALESCE(?, preco_custo),
        preco_venda = COALESCE(?, preco_venda),
        estoque_minimo = COALESCE(?, estoque_minimo),
        status_produto = COALESCE(?, status_produto),
        principio_ativo = COALESCE(?, principio_ativo),
        apresentacao = COALESCE(?, apresentacao),
        dosagem = COALESCE(?, dosagem),
        registro_anvisa = COALESCE(?, registro_anvisa)
      WHERE id_produto = ?;
    `;
    const params = [
      data.descricao !== undefined ? data.descricao : null,
      data.e_medicamento !== undefined ? (data.e_medicamento ? 1 : 0) : null,
      data.precisa_receita !== undefined ? (data.precisa_receita ? 1 : 0) : null,
      data.id_grupo !== undefined ? data.id_grupo : null,
      data.id_subgrupo !== undefined ? data.id_subgrupo : null,
      data.marca !== undefined ? data.marca : null,
      data.fabricante !== undefined ? data.fabricante : null,
      data.codigo_barras !== undefined ? data.codigo_barras : null,
      data.preco_custo !== undefined ? data.preco_custo : null,
      data.preco_venda !== undefined ? data.preco_venda : null,
      data.estoque_minimo !== undefined ? data.estoque_minimo : null,
      data.status_produto !== undefined ? data.status_produto : null,
      data.principio_ativo !== undefined ? data.principio_ativo : null,
      data.apresentacao !== undefined ? data.apresentacao : null,
      data.dosagem !== undefined ? data.dosagem : null,
      data.registro_anvisa !== undefined ? data.registro_anvisa : null,
      id_produto
    ];

    await pool.query(sql, params);
  }

  async inactivate(id_produto) {
    const sql = `UPDATE Produtos SET status_produto = 'INATIVO' WHERE id_produto = ?;`;
    await pool.query(sql, [id_produto]);
  }

  async getGroupsAndSubgroups() {
    const sql = `
      SELECT 
        g.id_grupo,
        g.nome AS grupo_nome,
        sg.id_subgrupo,
        sg.nome AS subgrupo_nome
      FROM Grupos g
      LEFT JOIN Subgrupos sg ON g.id_grupo = sg.id_grupo
      ORDER BY g.nome ASC, sg.nome ASC;
    `;
    const [rows] = await pool.query(sql);

    // Formata agrupando subgrupos em array dentro de cada grupo
    const groupsMap = new Map();
    for (const row of rows) {
      if (!groupsMap.has(row.id_grupo)) {
        groupsMap.set(row.id_grupo, {
          id_grupo: row.id_grupo,
          nome: row.grupo_nome,
          subgrupos: []
        });
      }
      if (row.id_subgrupo) {
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
