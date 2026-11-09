/**
 * Middleware para controle de acesso baseado em papéis (RBAC).
 * Exemplo de uso: authorize(['ADMINISTRADOR', 'GERENTE', 'FARMACEUTICO'])
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

    const userCargo = (req.user.cargo || '').toUpperCase();
    const userPerfil = (req.user.perfil || '').toUpperCase();

    // Administradores e gerentes têm acesso geral por padrão
    if (userCargo === 'ADMINISTRADOR' || userPerfil === 'CEO' || userPerfil === 'DBA') {
      return next();
    }

    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

    const hasCargoPermission = normalizedAllowed.includes(userCargo);
    const hasPerfilPermission = normalizedAllowed.includes(userPerfil);

    if (!hasCargoPermission && !hasPerfilPermission) {
      return res.status(403).json({
        error: true,
        code: 'FORBIDDEN',
        message: `Acesso negado. Esta operação exige perfil/cargo: [${allowedRoles.join(', ')}]. Seu cargo atual: ${req.user.cargo || 'Não definido'}.`
      });
    }

    return next();
  };
}

module.exports = {
  authorize
};
