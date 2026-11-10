
const { pool } = require('../../config/database');

function createError(message, statusCode = 400, errorCode = 'VALIDATION_ERROR') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.errorCode = errorCode;
  return err;
}

function validatePositiveId(value, fieldName) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError(`${fieldName} deve ser um inteiro positivo.`);
  }

  return id;
}

function validateLimit(value, defaultValue = 50) {
  const limit = Number(value ?? defaultValue);

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
    throw createError('O limite deve ser um inteiro entre 1 e 500.');
  }

  return limit;
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw createError('A receita deve possuir pelo menos um medicamento.');
  }

  return items.map((item, index) => {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item)
    ) {
      throw createError(`O item ${index + 1} da receita é inválido.`);
    }

    const id_produto = validatePositiveId(
      item.id_produto,
      `id_produto do item ${index + 1}`
    );

    const quantidade = Number(item.quantidade);

    if (!Number.isSafeInteger(quantidade) || quantidade <= 0) {
      throw createError(
        `A quantidade do item ${index + 1} deve ser um inteiro positivo.`
      );
    }

    if (
      item.posologia !== undefined &&
      item.posologia !== null &&
      typeof item.posologia !== 'string'
    ) {
      throw createError(
        `A posologia do item ${index + 1} deve ser um texto.`
      );
    }

    return {
      id_produto,
      quantidade,
      posologia: item.posologia?.trim() || null
    };
  });
}

class PrescriptionsRepository {
  async findAll({ id_cliente, apenas_validas, limite = 50 } = {}) {
    const limit = validateLimit(limite);

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
      WHERE 1 = 1
    `;

    const params = [];

    if (id_cliente !== undefined && id_cliente !== null) {
      const clientId = validatePositiveId(id_cliente, 'id_cliente');

      sql += ' AND r.id_cliente = ?';
      params.push(clientId);
    }

    if (apenas_validas === true || apenas_validas === 'true') {
      sql += ' AND r.validade_receita >= CURDATE()';
    }

    sql += ' ORDER BY r.validade_receita DESC, r.data_prescricao DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.query(sql, params);

    return rows;
  }

  async findById(id_receita) {
    const receitaId = validatePositiveId(id_receita, 'id_receita');

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

    const [rows] = await pool.query(sql, [receitaId]);

    if (rows.length === 0) {
      return null;
    }

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

    const [items] = await pool.query(itemsSql, [receitaId]);

    return {
      ...receita,
      itens: items
    };
  }

  async findPending() {
    // Retorna receitas válidas; a definição de pendência depende
    // de existir ou não um status específico na tabela Receitas.
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
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw createError('Os dados da receita são inválidos.');
    }

    const id_cliente = validatePositiveId(data.id_cliente, 'id_cliente');
    const funcionarioId = validatePositiveId(
      id_funcionario,
      'id_funcionario'
    );

    const id_medico = data.id_medico == null
      ? null
      : validatePositiveId(data.id_medico, 'id_medico');

    const itens = validateItems(data.itens);

    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const insertReceitaSql = `
        INSERT INTO Receitas (
          id_cliente,
          id_funcionario,
          id_medico,
          nome_prescritor,
          crm_prescritor,
          data_prescricao,
          validade_receita,
          observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `;

      const [result] = await connection.query(insertReceitaSql, [
        id_cliente,
        funcionarioId,
        id_medico,
        data.nome_prescritor,
        data.crm_prescritor,
        data.data_prescricao,
        data.validade_receita,
        data.observacoes ?? null
      ]);

      const id_receita = result.insertId;

      const itemSql = `
        INSERT INTO Receitas_Itens (
          id_receita,
          id_produto,
          quantidade,
          posologia
        ) VALUES (?, ?, ?, ?);
      `;

      for (const item of itens) {
        await connection.query(itemSql, [
          id_receita,
          item.id_produto,
          item.quantidade,
          item.posologia
        ]);
      }

      await connection.commit();
      transactionStarted = false;

      return id_receita;
    } catch (err) {
      if (transactionStarted) {
        await connection.rollback();
      }

      throw err;
    } finally {
      connection.release();
    }
  }

  async findDoctorByCrm(crm, uf) {
    if (typeof crm !== 'string' || !crm.trim()) {
      throw createError('O CRM deve ser informado.');
    }

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

    const params = [`%${crm.trim()}%`];

    if (uf !== undefined && uf !== null && uf !== '') {
      if (typeof uf !== 'string' || !/^[A-Za-z]{2}$/.test(uf)) {
        throw createError('A UF deve conter duas letras.');
      }

      sql += ' AND m.uf_crm = ?';
      params.push(uf.toUpperCase());
    }

    sql += ' ORDER BY p.nome ASC LIMIT 100';

    const [rows] = await pool.query(sql, params);

    return rows;
  }

  async createDoctor({ nome, crm, uf_crm, especialidade }) {
    if (typeof nome !== 'string' || !nome.trim()) {
      throw createError('O nome do médico deve ser informado.');
    }

    if (typeof crm !== 'string' || !crm.trim()) {
      throw createError('O CRM deve ser informado.');
    }

    if (typeof uf_crm !== 'string' || !/^[A-Za-z]{2}$/.test(uf_crm)) {
      throw createError('A UF do CRM deve conter duas letras.');
    }

    if (
      especialidade !== undefined &&
      especialidade !== null &&
      typeof especialidade !== 'string'
    ) {
      throw createError('A especialidade deve ser um texto.');
    }

    const nomeNormalizado = nome.trim();
    const crmNormalizado = crm.trim();
    const ufNormalizada = uf_crm.toUpperCase();
    const especialidadeNormalizada = especialidade?.trim() || null;

    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const [pResult] = await connection.query(
        `INSERT INTO Pessoas (tipo, nome, status)
         VALUES ('FISICA', ?, 'ATIVO');`,
        [nomeNormalizado]
      );

      const id_pessoa = pResult.insertId;

      const [mResult] = await connection.query(
        `INSERT INTO Medicos (
          id_pessoa,
          crm,
          uf_crm,
          especialidade
        ) VALUES (?, ?, ?, ?);`,
        [
          id_pessoa,
          crmNormalizado,
          ufNormalizada,
          especialidadeNormalizada
        ]
      );

      await connection.commit();
      transactionStarted = false;

      return {
        id_medico: mResult.insertId,
        id_pessoa,
        nome: nomeNormalizado,
        crm: crmNormalizado,
        uf_crm: ufNormalizada,
        especialidade: especialidadeNormalizada
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
}

module.exports = new PrescriptionsRepository();
