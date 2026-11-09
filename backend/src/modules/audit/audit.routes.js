const express = require('express');
const router = express.Router();
const auditController = require('./audit.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/permission.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * /api/relatorios/auditoria:
 *   get:
 *     summary: Consulta registros de auditoria imutável (Log_Auditoria) disparados por Triggers
 *     tags: [Governança & Auditoria (GRC)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tabela
 *         schema:
 *           type: string
 *       - in: query
 *         name: operacao
 *         schema:
 *           type: string
 *           enum: [INSERT, UPDATE, DELETE]
 *     responses:
 *       200:
 *         description: Logs de auditoria retornados
 */
router.get('/auditoria', authorize(['GERENTE']), auditController.getLogs);

/**
 * @swagger
 * /api/relatorios/vendas-consolidado:
 *   get:
 *     summary: Relatório consolidado e analítico de vendas com itens e pagamentos
 *     tags: [Governança & Auditoria (GRC)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: data_inicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: data_fim
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Relatório de vendas
 */
router.get('/vendas-consolidado', authorize(['GERENTE']), auditController.getSalesReport);

module.exports = router;
