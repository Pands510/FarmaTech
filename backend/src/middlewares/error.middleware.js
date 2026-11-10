
function errorMiddleware(err, req, res, next) {

  // Registra detalhes técnicos apenas no servidor
  console.error('[Error Middleware]', {
    message: err.message,
    code: err.code,
    sqlState: err.sqlState,
    stack: process.env.NODE_ENV === 'development'
      ? err.stack
      : undefined
  });

  // Impede tentativa de resposta caso a conexão já tenha sido encerrada
  if (res.headersSent) {
    return next(err);
  }

  // Erro de origem não autorizada pelo CORS
  if (err.errorCode === 'CORS_ORIGIN_DENIED') {
    return res.status(403).json({
      error: true,
      code: 'CORS_ORIGIN_DENIED',
      message: 'Origem não autorizada a acessar esta API.'
    });
  }

  // JSON inválido enviado na requisição
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: true,
      code: 'INVALID_JSON',
      message: 'O corpo da requisição contém um JSON inválido.'
    });
  }

  // Corpo da requisição excedeu o limite permitido
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: true,
      code: 'REQUEST_TOO_LARGE',
      message: 'O tamanho da requisição excede o limite permitido.'
    });
  }

  // Erros emitidos por Triggers ou Procedures do MySQL
  if (err.sqlState === '45000') {
    const message = (err.message || 'Regra de negócio não permitiu a operação.')
      .replace(/^Error:\s*/i, '')
      .replace(/^Erro:\s*/i, '');

    return res.status(400).json({
      error: true,
      code: 'DB_RULE_VIOLATION',
      message
    });
  }

  // Registro duplicado (UNIQUE constraint)
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: true,
      code: 'DUPLICATE_ENTRY',
      message: 'Já existe um registro com esses dados identificadores únicos no sistema.'
    });
  }

  // Registro referenciado inexistente (Foreign Key)
  if (
    err.code === 'ER_NO_REFERENCED_ROW_2' ||
    err.code === 'ER_NO_REFERENCED_ROW'
  ) {
    return res.status(400).json({
      error: true,
      code: 'FOREIGN_KEY_VIOLATION',
      message: 'Um dos registros referenciados não foi encontrado na base de dados.'
    });
  }

  // Tentativa de excluir registro que ainda possui dependências
  if (
    err.code === 'ER_ROW_IS_REFERENCED_2' ||
    err.code === 'ER_ROW_IS_REFERENCED'
  ) {
    return res.status(409).json({
      error: true,
      code: 'RECORD_IN_USE',
      message: 'Não é possível excluir este registro porque existem outros registros vinculados a ele.'
    });
  }

  // Erros de conexão ou indisponibilidade do MySQL
  const databaseConnectionErrors = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'PROTOCOL_CONNECTION_LOST',
    'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
    'ER_CON_COUNT_ERROR'
  ];

  if (databaseConnectionErrors.includes(err.code)) {
    return res.status(503).json({
      error: true,
      code: 'DATABASE_UNAVAILABLE',
      message: 'O serviço de banco de dados está temporariamente indisponível.'
    });
  }

  // Erros de validação e autenticação definidos pela aplicação
  const statusCode = Number(err.statusCode) || 500;

  if (statusCode >= 400 && statusCode < 500) {
    return res.status(statusCode).json({
      error: true,
      code: err.errorCode || 'REQUEST_ERROR',
      message: err.message || 'Não foi possível processar a requisição.'
    });
  }

  // Erros internos: não expor detalhes técnicos ao cliente
  return res.status(500).json({
    error: true,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.'
  });
}

module.exports = errorMiddleware;
