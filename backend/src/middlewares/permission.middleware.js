
/**
 * Middleware para controle de acesso baseado em papéis (RBAC).
 *
 * Exemplo:
 * authorize(['ADMINISTRADOR', 'GERENTE', 'FARMACEUTICO'])
 */

function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        code: 'UNAUTHENTICATED',
        message: 'Usuário não autenticado.'
      });
    }

    if (!Array.isArray(allowedRoles)) {
      return res.status(500).json({
        error: true,
        code: 'AUTHORIZATION_CONFIGURATION_ERROR',
        message: 'Configuração de papéis inválida.'
      });
    }

    const userPerfil = String(req.user.perfil || '')
      .trim()
      .toUpperCase();

    const normalizedAllowed = allowedRoles.map(role =>
      String(role).trim().toUpperCase()
    );

    if (!userPerfil) {
      return res.status(403).json({
        error: true,
        code: 'PROFILE_NOT_DEFINED',
        message: 'Usuário sem perfil de acesso definido.'
      });
    }

    if (!normalizedAllowed.includes(userPerfil)) {
      return res.status(403).json({
        error: true,
        code: 'FORBIDDEN',
        message: `Acesso negado. Esta operação exige um dos seguintes perfis: [${allowedRoles.join(', ')}].`
      });
    }

    return next();
  };
}

module.exports = {
  authorize
};
