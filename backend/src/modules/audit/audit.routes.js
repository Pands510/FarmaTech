const express = require('express');
const router = express.Router();

const auditController = require('./audit.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/permission.middleware');

// Todas as rotas deste módulo exigem autenticação.
router.use(authMiddleware);

/**
 * @swagger
 * /api/relatorios/auditoria:
 *   get:
 *     summary: Consulta registros de auditoria
 *     description: Retorna registros de auditoria gerados pelos triggers do banco de dados.
 *     tags: [Governança & Auditoria (GRC)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tabela
 *         schema:
 *           type: string
 *         description: Filtra os registros pelo nome da tabela.
 *       - in: query
 *         name: operacao
 *         schema:
 *           type: string
 *           enum: [INSERT, UPDATE, DELETE]
 *         description: Filtra os registros pelo tipo de operação.
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 50
 *         description: Quantidade máxima de registros retornados.
 *     responses:
 *       200:
 *         description: Registros de auditoria retornados.
 *       400:
 *         description: Parâmetros inválidos.
 *       401:
 *         description: Token ausente ou inválido.
 *       403:
 *         description: Perfil sem permissão para consultar auditoria.
 *       500:
 *         description: Erro interno do servidor.
 */
router.get(
  '/auditoria',
  authorize(['GERENTE']),
  auditController.getLogs
);

/**
 * @swagger
 * /api/relatorios/vendas-consolidado:
 *   get:
 *     summary: Consulta relatório consolidado de vendas
 *     description: Retorna vendas com informações dos itens, pagamentos, operadores e clientes.
 *     tags: [Governança & Auditoria (GRC)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: data_inicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial do relatório (YYYY-MM-DD).
 *       - in: query
 *         name: data_fim
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final do relatório (YYYY-MM-DD).
 *     responses:
 *       200:
 *         description: Relatório de vendas retornado.
 *       400:
 *         description: Intervalo de datas inválido.
 *       401:
 *         description: Token ausente ou inválido.
 *       403:
 *         description: Perfil sem permissão para consultar o relatório.
 *       500:
 *         description: Erro interno do servidor.
 */
router.get(
  '/vendas-consolidado',
  authorize(['GERENTE']),
  auditController.getSalesReport
);

module.exports = router;