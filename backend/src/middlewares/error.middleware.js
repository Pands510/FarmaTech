/**
 * Middleware global de captura e formatação de erros.
 * Garante respostas consistentes: { error: true, code: '...', message: '...' }
 */
function errorMiddleware(err, req, res, next) {
  console.error('[Error Middleware]', {
    message: err.message,
    code: err.code,
    sqlState: err.sqlState,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Erros emitidos por Triggers ou Procedures do MySQL via SIGNAL SQLSTATE '45000'
  if (err.sqlState === '45000') {
    return res.status(400).json({
      error: true,
      code: 'DB_RULE_VIOLATION',
      message: err.message.replace(/^Error:\s*/i, '').replace(/^Erro:\s*/i, '')
    });
  }

  // Erro de registro duplicado (UNIQUE constraint)
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: true,
      code: 'DUPLICATE_ENTRY',
      message: 'Já existe um registro com esses dados identificadores únicos no sistema.'
    });
  }

  // Erro de integridade de chave estrangeira (FK inexistente)
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return res.status(400).json({
      error: true,
      code: 'FOREIGN_KEY_VIOLATION',
      message: 'Registro referenciado não foi encontrado na base de dados.'
    });
  }

  // Erro customizado com statusCode definido
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno no servidor.';
  const code = err.errorCode || 'INTERNAL_SERVER_ERROR';

  return res.status(statusCode).json({
    error: true,
    code,
    message
  });
}

module.exports = errorMiddleware;
