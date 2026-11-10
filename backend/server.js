
require('dotenv').config();

const app = require('./src/app');
const { pool, testConnection } = require('./src/config/database');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

let server;
let isShuttingDown = false;

async function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log('\n[Server] Encerrando aplicação graciosamente...');

  // Fecha o servidor HTTP, sem impedir o encerramento do banco
  // caso ocorra algum erro durante essa etapa.
  if (server) {
    try {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            return reject(err);
          }

          resolve();
        });
      });

      console.log('[Server] Servidor HTTP finalizado.');
    } catch (error) {
      console.error('[Shutdown] Erro ao encerrar servidor HTTP:', error);
      exitCode = 1;
    }
  }

  // O pool é encerrado independentemente do resultado do servidor HTTP.
  try {
    await pool.end();
    console.log('[Database] Pool MySQL encerrado.');
  } catch (error) {
    console.error('[Shutdown] Erro ao encerrar pool MySQL:', error);
    exitCode = 1;
  }

  process.exit(exitCode);
}

async function bootstrap() {
  console.log('====================================================');
  console.log('   Iniciando FarmaTech ERP - Camada de Back-end');
  console.log('====================================================');

  try {
    // Verifica a disponibilidade do MySQL antes de iniciar a API.
    await testConnection();

    // Evita iniciar o servidor caso um sinal de encerramento
    // tenha sido recebido enquanto a conexão era verificada.
    if (isShuttingDown) {
      return;
    }

    console.log('[Database] Conexão com MySQL estabelecida.');

    server = app.listen(PORT, HOST, () => {
      console.log(`[Server] Servidor HTTP ouvindo em ${HOST}:${PORT}`);
      console.log(`[Server] Porta: ${PORT}`);
      console.log(`[Server] Documentação Swagger: http://localhost:${PORT}/api-docs`);
      console.log(`[Server] Health Check: http://localhost:${PORT}/api/health`);
      console.log('====================================================');
    });

    server.on('error', (error) => {
      console.error('[Server] Erro no servidor HTTP:', error);
      shutdown(1);
    });

  } catch (error) {
    console.error('[Bootstrap] Não foi possível iniciar a aplicação:', error);

    // Se o encerramento já estiver em andamento, ele próprio
    // será responsável por liberar o pool.
    if (isShuttingDown) {
      return;
    }

    try {
      await pool.end();
    } catch (poolError) {
      console.error('[Database] Erro ao encerrar o pool:', poolError);
    }

    process.exit(1);
  }
}

// Encerramento por sinais do sistema operacional.
process.on('SIGINT', () => {
  console.log('[Server] Sinal SIGINT recebido.');
  shutdown(0);
});

process.on('SIGTERM', () => {
  console.log('[Server] Sinal SIGTERM recebido.');
  shutdown(0);
});

// Erros assíncronos não tratados.
process.on('unhandledRejection', (reason) => {
  console.error('[Process] Promise rejeitada sem tratamento:', reason);
  shutdown(1);
});

// Exceções não tratadas.
process.on('uncaughtException', (error) => {
  console.error('[Process] Exceção não tratada:', error);
  shutdown(1);
});

bootstrap();
