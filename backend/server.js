require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  console.log('====================================================');
  console.log('   Iniciando FarmaTech ERP - Camada de Back-end     ');
  console.log('====================================================');

  // Testa conexão com o MySQL
  await testConnection();

  const server = app.listen(PORT, () => {
    console.log(`[Server] Servidor HTTP ouvindo na porta ${PORT}`);
    console.log(`[Server] URL Base: http://localhost:${PORT}`);
    console.log(`[Server] Documentação Swagger: http://localhost:${PORT}/api-docs`);
    console.log(`[Server] Health Check: http://localhost:${PORT}/api/health`);
    console.log('====================================================');
  });

  // Tratamento de encerramento gracioso
  const shutdown = () => {
    console.log('\n[Server] Encerrando servidor graciosamente...');
    server.close(() => {
      console.log('[Server] Servidor HTTP finalizado.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();
