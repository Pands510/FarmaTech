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

// Segurança e utilitários
app.use(helmet({
  contentSecurityPolicy: false // Permite Swagger UI carregar seus assets sem restrição
}));
app.use(cors({
  origin: '*', // Permite que qualquer frontend local (Vite, React, Angular, Vue) acesse a API
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração Swagger / OpenAPI
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FarmaTech ERP - API REST',
      version: '1.0.0',
      description: 'Documentação da API RESTful do ERP Farmacêutico FarmaTech para a 2ª Unidade de Banco de Dados Avançado.',
      contact: {
        name: 'Equipe FarmaTech'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local de Desenvolvimento'
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
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'FarmaTech ERP - Swagger Docs'
}));

// Rota inicial amigável
app.get('/', (req, res) => {
  res.status(200).json({
    message: '🚀 API RESTful do FarmaTech ERP está em execução!',
    documentacao_swagger: '/api-docs',
    health_check: '/api/health',
    versao: '1.0.0'
  });
});

// Montagem das rotas da API
app.use('/api', routes);

// Rota 404 para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    error: true,
    code: 'ROUTE_NOT_FOUND',
    message: `A rota '${req.method} ${req.originalUrl}' não foi encontrada nesta API.`
  });
});

// Middleware Global de Tratamento de Erros
app.use(errorMiddleware);

module.exports = app;
