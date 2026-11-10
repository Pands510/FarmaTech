
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

// Configurações do ambiente
const isProduction = process.env.NODE_ENV === 'production';

const corsOrigins = (
  process.env.CORS_ORIGINS || 'http://localhost:5173'
)
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Configurações gerais de segurança
app.disable('x-powered-by');

app.use(helmet());

app.use(cors({
  origin(origin, callback) {
    // Permite requisições sem Origin, como chamadas entre servidores.
    if (!origin) {
      return callback(null, true);
    }

    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    const err = new Error('Origem não autorizada pelo CORS.');
    err.statusCode = 403;
    err.errorCode = 'CORS_ORIGIN_DENIED';

    return callback(err);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Logs HTTP
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Processamento de requisições
app.use(express.json({
  limit: '1mb'
}));

app.use(express.urlencoded({
  extended: true,
  limit: '1mb',
  parameterLimit: 100
}));

// Configuração Swagger / OpenAPI
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FarmaTech ERP - API REST',
      version: '1.0.0',
      description:
        'Documentação da API RESTful do ERP Farmacêutico FarmaTech para a 2ª Unidade de Banco de Dados Avançado.',
      contact: {
        name: 'Equipe FarmaTech'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: isProduction
          ? 'Servidor de Produção'
          : 'Servidor Local de Desenvolvimento'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: [
    path.join(__dirname, 'modules/**/*.routes.js'),
    path.join(__dirname, 'routes/*.js')
  ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Documentação Swagger
// Política específica para os recursos da interface Swagger.
app.use(
  '/api-docs',
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"]
      }
    }
  })
);

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'FarmaTech ERP - Swagger Docs'
  })
);

// Rota inicial
app.get('/', (req, res) => {
  return res.status(200).json({
    message: 'API RESTful do FarmaTech ERP está em execução!',
    documentacao_swagger: '/api-docs',
    health_check: '/api/health',
    versao: '1.0.0'
  });
});

// Montagem das rotas da API
app.use('/api', routes);

// Rota 404
app.use((req, res) => {
  return res.status(404).json({
    error: true,
    code: 'ROUTE_NOT_FOUND',
    message: 'A rota solicitada não foi encontrada nesta API.'
  });
});

// Middleware global de tratamento de erros
app.use(errorMiddleware);

module.exports = app;
