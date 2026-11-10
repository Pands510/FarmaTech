
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');

class AuthService {

  getJwtSecret() {
    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
      const err = new Error(
        'JWT_SECRET ausente ou insuficiente. Configure uma chave segura.'
      );

      err.statusCode = 500;
      err.errorCode = 'AUTH_CONFIGURATION_ERROR';

      throw err;
    }

    return secret;
  }


  getPermissionsForRole(cargo, perfil) {
    const role = (perfil || cargo || '').trim().toUpperCase();
  
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
  
    if (['ADMINISTRADOR', 'CEO', 'DBA'].includes(role)) {
      return [...fullPermissions];
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
    if (
      typeof matricula !== 'string' ||
      !matricula.trim() ||
      typeof senha !== 'string' ||
      !senha
    ) {
      const err = new Error(
        'Matrícula e senha são obrigatórios.'
      );

      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';

      throw err;
    }

    const JWT_SECRET = this.getJwtSecret();

    const funcionario = await authRepository.findByMatricula(
      matricula.trim()
    );

    if (!funcionario) {
      const err = new Error('Credenciais inválidas.');
      err.statusCode = 401;
      err.errorCode = 'AUTH_FAILED';
      throw err;
    }

    if (funcionario.status_funcionario !== 'ATIVO') {
      const err = new Error('Acesso negado: funcionário inativo.');
      err.statusCode = 403;
      err.errorCode = 'ACCOUNT_INACTIVE';
      throw err;
    }

    // Compatibilidade temporária com os hashes SHA-256 existentes.
    const senhaHash = crypto
      .createHash('sha256')
      .update(senha, 'utf8')
      .digest();

    const hashBanco = funcionario.senha_hash;

    if (
      typeof hashBanco !== 'string' ||
      !/^[a-fA-F0-9]{64}$/.test(hashBanco)
    ) {
      const err = new Error('Credenciais inválidas.');
      err.statusCode = 401;
      err.errorCode = 'AUTH_FAILED';
      throw err;
    }

    const hashArmazenado = Buffer.from(hashBanco, 'hex');

    if (!crypto.timingSafeEqual(senhaHash, hashArmazenado)) {
      const err = new Error('Credenciais inválidas.');
      err.statusCode = 401;
      err.errorCode = 'AUTH_FAILED';
      throw err;
    }

    const permissoes = this.getPermissionsForRole(
      funcionario.cargo,
      funcionario.perfil_nome
    );

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
      JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: process.env.JWT_EXPIRES_IN || '8h'
      }
    );

    await authRepository.updateLastAccess(
      funcionario.id_funcionario
    );

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
    const funcionario = await authRepository.findById(
      id_funcionario
    );

    if (!funcionario) {
      const err = new Error('Funcionário não localizado.');
      err.statusCode = 404;
      err.errorCode = 'NOT_FOUND';
      throw err;
    }

    if (funcionario.status_funcionario !== 'ATIVO') {
      const err = new Error('Acesso negado: funcionário inativo.');
      err.statusCode = 403;
      err.errorCode = 'ACCOUNT_INACTIVE';
      throw err;
    }

    const permissoes = this.getPermissionsForRole(
      funcionario.cargo,
      funcionario.perfil_nome
    );

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
