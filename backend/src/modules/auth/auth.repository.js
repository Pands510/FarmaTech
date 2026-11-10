
const { pool } = require('../../config/database');

class AuthRepository {
  async findByMatricula(matricula) {
    const query = `
      SELECT
        f.id_funcionario,
        f.matricula,
        f.senha_hash,
        f.cargo,
        f.status_funcionario,
        f.id_perfil,
        p.id_pessoa,
        p.nome,
        perf.nome AS perfil_nome
      FROM Funcionarios f
      INNER JOIN Pessoas p
        ON f.id_pessoa = p.id_pessoa
      INNER JOIN Perfis perf
        ON f.id_perfil = perf.id_perfil
      WHERE f.matricula = ?
      LIMIT 1;
    `;

    const [rows] = await pool.query(query, [matricula]);

    return rows[0] || null;
  }

  async findById(id_funcionario) {
    const query = `
      SELECT
        f.id_funcionario,
        f.matricula,
        f.cargo,
        f.status_funcionario,
        f.id_perfil,
        p.id_pessoa,
        p.nome,
        perf.nome AS perfil_nome,
        f.ultimo_acesso
      FROM Funcionarios f
      INNER JOIN Pessoas p
        ON f.id_pessoa = p.id_pessoa
      INNER JOIN Perfis perf
        ON f.id_perfil = perf.id_perfil
      WHERE f.id_funcionario = ?
      LIMIT 1;
    `;

    const [rows] = await pool.query(query, [id_funcionario]);

    return rows[0] || null;
  }

  async updateLastAccess(id_funcionario) {
    const query = `
      UPDATE Funcionarios
      SET ultimo_acesso = NOW()
      WHERE id_funcionario = ?;
    `;

    await pool.query(query, [id_funcionario]);
  }
}

module.exports = new AuthRepository();
