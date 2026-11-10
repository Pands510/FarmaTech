
const authService = require('./auth.service');

class AuthController {
  async login(req, res, next) {
    try {
      const { matricula, senha } = req.body || {};

      const result = await authService.login(
        matricula,
        senha
      );

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async me(req, res, next) {
    try {
      if (!req.user || !req.user.id_funcionario) {
        const error = new Error(
          'Usuário não autenticado.'
        );

        error.statusCode = 401;
        error.errorCode = 'AUTH_REQUIRED';

        throw error;
      }

      const profile = await authService.getProfile(
        req.user.id_funcionario
      );

      return res.status(200).json(profile);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new AuthController();
