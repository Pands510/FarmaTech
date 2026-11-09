const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');

class AuthService {
  /**
   * Mapeamento de permissões do sistema conforme o Cargo / Perfil RBAC
   */
  getPermissionsForRole(cargo, perfil) {
    const role = (cargo || perfil || '').toUpperCase();

    const fullPermissions = [
      'DASHBOARD_FULL',
      'PDV_TOTAL',
      'ESTOQUE_GERAL',
      'RECEITAS_TOTAL',
      'CAIXA_TOTAL',
      'RELATORIOS',
      'COMPRAS_TOTAL',
      'ADMIN_CONFIG'
    ];

    if (role === 'ADMINISTRADOR' || role === 'CEO' || role === 'DBA') {
      return fullPermissions;
    }

    if (role === 'GERENTE') {
      return [
        'DASHBOARD_FULL',
        'PDV_TOTAL',
        'ESTOQUE_GERAL',
        'RECEITAS_TOTAL',
        'CAIXA_TOTAL',
        'RELATORIOS',
        'COMPRAS_TOTAL'
      ];
    }

    if (role === 'FARMACEUTICO') {
      return [
        'RECEITAS_TOTAL',
        'PDV_TOTAL',
        'ESTOQUE_CONSULTA',
        'DASHBOARD_CONSULTA'
      ];
    }

    if (role === 'ATENDENTE') {
      return [
        'PDV_TOTAL',
        'ESTOQUE_CONSULTA'
      ];
    }

    if (role === 'CAIXA') {
      return [
        'CAIXA_TOTAL',
        'PDV_TOTAL'
      ];
    }

    if (role === 'ESTOQUISTA') {
      return [
        'ESTOQUE_GERAL',
        'COMPRAS_TOTAL'
      ];
    }

    return ['PDV_TOTAL'];
  }

  async login(matricula, senha) {
    if (!matricula || !senha) {
      const err = new Error('Matrícula e senha são obrigatórios.');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }

    const funcionario = await authRepository.findByMatricula(matricula);

    if (!funcionario) {
      const err = new Error('Credenciais inválidas: funcionário não encontrado.');
      err.statusCode = 401;
      err.errorCode = 'AUTH_FAILED';
      throw err;
    }

    if (funcionario.status_funcionario !== 'ATIVO') {
      const err = new Error(`Acesso negado: colaborador encontra-se com status '${funcionario.status_funcionario}'.`);
      err.statusCode = 403;
      err.errorCode = 'ACCOUNT_INACTIVE';
      throw err;
    }

    // O banco utiliza SHA2(senha, 256) em hex
    const senhaHash = crypto.createHash('sha256').update(senha).digest('hex');

    if (senhaHash.toLowerCase() !== funcionario.senha_hash.toLowerCase()) {
      const err = new Error('Credenciais inválidas: senha incorreta.');
      err.statusCode = 401;
      err.errorCode = 'AUTH_FAILED';
      throw err;
    }

    const permissoes = this.getPermissionsForRole(funcionario.cargo, funcionario.perfil_nome);

    const payload = {
      id_funcionario: funcionario.id_funcionario,
      matricula: funcionario.matricula,
      id_perfil: funcionario.id_perfil,
      cargo: funcionario.cargo,
      perfil: funcionario.perfil_nome,
      nome: funcionario.nome
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'farmatech_jwt_secret_token_secure_key_2026_erp',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    await authRepository.updateLastAccess(funcionario.id_funcionario);

    return {
      token,
      usuario: {
        id_funcionario: funcionario.id_funcionario,
        nome: funcionario.nome,
        matricula: funcionario.matricula,
        cargo: funcionario.cargo,
        perfil: funcionario.perfil_nome,
        permissoes
      }
    };
  }

  async getProfile(id_funcionario) {
    const funcionario = await authRepository.findById(id_funcionario);
    if (!funcionario) {
      const err = new Error('Funcionário não localizado.');
      err.statusCode = 404;
      err.errorCode = 'NOT_FOUND';
      throw err;
    }

    const permissoes = this.getPermissionsForRole(funcionario.cargo, funcionario.perfil_nome);

    return {
      id_funcionario: funcionario.id_funcionario,
      nome: funcionario.nome,
      matricula: funcionario.matricula,
      cargo: funcionario.cargo,
      perfil: funcionario.perfil_nome,
      ultimo_acesso: funcionario.ultimo_acesso,
      permissoes
    };
  }
}

module.exports = new AuthService();
