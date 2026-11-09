const { pool } = require('../../config/database');

class PrescriptionsRepository {
  async findAll({ id_cliente, apenas_validas, limite = 50 }) {
    let sql = `
      SELECT 
        r.id_receita,
        r.id_cliente,
        p_cli.nome AS cliente_nome,
        r.id_funcionario,
        p_func.nome AS farmaceutico_nome,
        r.id_medico,
        r.nome_prescritor,
        r.crm_prescritor,
        r.data_prescricao,
        r.validade_receita,
        r.observacoes,
        CASE 
          WHEN r.validade_receita >= CURDATE() THEN 'VALIDA'
          ELSE 'VENCIDA'
        END AS status_validade,
        DATEDIFF(r.validade_receita, CURDATE()) AS dias_restantes
      FROM Receitas r
      INNER JOIN Clientes c ON r.id_cliente = c.id_cliente
      INNER JOIN Pessoas p_cli ON c.id_pessoa = p_cli.id_pessoa
      INNER JOIN Funcionarios f ON r.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p_func ON f.id_pessoa = p_func.id_pessoa
      WHERE 1=1
    `;
    const params = [];

    if (id_cliente) {
      sql += ' AND r.id_cliente = ?';
      params.push(id_cliente);
    }

    if (apenas_validas === 'true' || apenas_validas === true) {
      sql += ' AND r.validade_receita >= CURDATE()';
    }

    sql += ' ORDER BY r.validade_receita DESC, r.data_prescricao DESC LIMIT ?;';
    params.push(Number(limite));

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  async findById(id_receita) {
    const sql = `
      SELECT 
        r.id_receita,
        r.id_cliente,
        p_cli.nome AS cliente_nome,
        r.id_funcionario,
        p_func.nome AS farmaceutico_nome,
        r.id_medico,
        r.nome_prescritor,
        r.crm_prescritor,
        r.data_prescricao,
        r.validade_receita,
        r.observacoes,
        CASE 
          WHEN r.validade_receita >= CURDATE() THEN 'VALIDA'
          ELSE 'VENCIDA'
        END AS status_validade,
        DATEDIFF(r.validade_receita, CURDATE()) AS dias_restantes
      FROM Receitas r
      INNER JOIN Clientes c ON r.id_cliente = c.id_cliente
      INNER JOIN Pessoas p_cli ON c.id_pessoa = p_cli.id_pessoa
      INNER JOIN Funcionarios f ON r.id_funcionario = f.id_funcionario
      INNER JOIN Pessoas p_func ON f.id_pessoa = p_func.id_pessoa
      WHERE r.id_receita = ?
      LIMIT 1;
    `;
    const [rows] = await pool.query(sql, [id_receita]);
    if (rows.length === 0) return null;

    const receita = rows[0];

    const itemsSql = `
      SELECT 
        ri.id_receita_item,
        ri.id_produto,
        p.descricao AS produto_descricao,
        ri.quantidade,
        ri.posologia
      FROM Receitas_Itens ri
      INNER JOIN Produtos p ON ri.id_produto = p.id_produto
      WHERE ri.id_receita = ?;
    `;
    const [items] = await pool.query(itemsSql, [id_receita]);

    return {
      ...receita,
      itens: items
    };
  }

  async findPending() {
    // Lista receitas válidas cadastradas recentemente aguardando uso ou validação
    const sql = `
      SELECT 
        r.id_receita,
        r.id_cliente,
        p_cli.nome AS cliente_nome,
        r.nome_prescritor,
        r.crm_prescritor,
        r.data_prescricao,
        r.validade_receita,
        DATEDIFF(r.validade_receita, CURDATE()) AS dias_restantes,
        (
          SELECT GROUP_CONCAT(p.descricao SEPARATOR ', ')
          FROM Receitas_Itens ri
          INNER JOIN Produtos p ON ri.id_produto = p.id_produto
          WHERE ri.id_receita = r.id_receita
        ) AS medicamentos
      FROM Receitas r
      INNER JOIN Clientes c ON r.id_cliente = c.id_cliente
      INNER JOIN Pessoas p_cli ON c.id_pessoa = p_cli.id_pessoa
      WHERE r.validade_receita >= CURDATE()
      ORDER BY r.data_prescricao DESC
      LIMIT 20;
    `;
    const [rows] = await pool.query(sql);
    return rows;
  }

  async createReceita(data, id_funcionario) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const insertReceitaSql = `
        INSERT INTO Receitas (
          id_cliente, id_funcionario, id_medico,
          nome_prescritor, crm_prescritor, data_prescricao,
          validade_receita, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `;

      const [result] = await connection.query(insertReceitaSql, [
        data.id_cliente,
        id_funcionario,
        data.id_medico || null,
        data.nome_prescritor,
        data.crm_prescritor,
        data.data_prescricao,
        data.validade_receita,
        data.observacoes || null
      ]);

      const id_receita = result.insertId;

      if (Array.isArray(data.itens) && data.itens.length > 0) {
        const itemSql = `
          INSERT INTO Receitas_Itens (id_receita, id_produto, quantidade, posologia)
          VALUES (?, ?, ?, ?);
        `;
        for (const item of data.itens) {
          await connection.query(itemSql, [
            id_receita,
            item.id_produto,
            item.quantidade,
            item.posologia || null
          ]);
        }
      }

      await connection.commit();
      return id_receita;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async findDoctorByCrm(crm, uf) {
    let sql = `
      SELECT 
        m.id_medico,
        p.nome,
        m.crm,
        m.uf_crm,
        m.especialidade
      FROM Medicos m
      INNER JOIN Pessoas p ON m.id_pessoa = p.id_pessoa
      WHERE m.crm LIKE ?
    `;
    const params = [`%${crm}%`];

    if (uf) {
      sql += ' AND m.uf_crm = ?';
      params.push(uf);
    }

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  async createDoctor({ nome, crm, uf_crm, especialidade }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [pResult] = await connection.query(
        "INSERT INTO Pessoas (tipo, nome, status) VALUES ('FISICA', ?, 'ATIVO');",
        [nome]
      );
      const id_pessoa = pResult.insertId;

      const [mResult] = await connection.query(
        'INSERT INTO Medicos (id_pessoa, crm, uf_crm, especialidade) VALUES (?, ?, ?, ?);',
        [id_pessoa, crm, uf_crm.toUpperCase(), especialidade || null]
      );

      await connection.commit();

      return {
        id_medico: mResult.insertId,
        id_pessoa,
        nome,
        crm,
        uf_crm: uf_crm.toUpperCase(),
        especialidade
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = new PrescriptionsRepository();
