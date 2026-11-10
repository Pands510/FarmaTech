
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('[AUTH] JWT_SECRET ausente ou com menos de 32 caracteres.');

    return res.status(500).json({
      error: true,
      code: 'AUTH_CONFIGURATION_ERROR',
      message: 'Erro interno na configuração de autenticação.'
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: true,
      code: 'AUTH_TOKEN_MISSING',
      message: 'Token de autenticação não fornecido no cabeçalho Authorization.'
    });
  }

  const match = authHeader.trim().match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res.status(401).json({
      error: true,
      code: 'AUTH_TOKEN_MALFORMED',
      message: 'Formato do cabeçalho de autenticação inválido. Utilize: Bearer <token>'
    });
  }

  const token = match[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    });

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      Array.isArray(decoded)
    ) {
      return res.status(401).json({
        error: true,
        code: 'AUTH_TOKEN_INVALID',
        message: 'Payload do token de autenticação inválido.'
      });
    }

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
