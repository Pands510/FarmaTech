const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: true,
      code: 'AUTH_TOKEN_MISSING',
      message: 'Token de autenticação não fornecido no cabeçalho Authorization.'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: true,
      code: 'AUTH_TOKEN_MALFORMATTED',
      message: 'Formato do cabeçalho de autenticação inválido. Utilize: Bearer <token>'
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'farmatech_jwt_secret_token_secure_key_2026_erp');
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: true,
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'A sessão expirou. Por favor, realize login novamente.'
      });
    }

    return res.status(401).json({
      error: true,
      code: 'AUTH_TOKEN_INVALID',
      message: 'Token de autenticação inválido ou corrompido.'
    });
  }
}

module.exports = authMiddleware;
