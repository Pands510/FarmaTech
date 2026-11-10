
const express = require('express');
const router = express.Router();

const dashboardController = require('./dashboard.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * /api/dashboard/kpis:
 *   get:
 *     summary: Retorna os principais indicadores diários
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KPIs calculados com sucesso
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/kpis', dashboardController.getKpis);

/**
 * @swagger
 * /api/dashboard/alertas-estoque:
 *   get:
 *     summary: Lista produtos abaixo do estoque mínimo
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de alertas de estoque
 *       401:
 *         description: Não autenticado
 */
router.get('/alertas-estoque', dashboardController.getLowStockAlerts);

/**
 * @swagger
 * /api/dashboard/produtos-vencendo:
 *   get:
 *     summary: Lista lotes próximos do vencimento
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de lotes próximos do vencimento
 *       401:
 *         description: Não autenticado
 */
router.get('/produtos-vencendo', dashboardController.getExpiringProducts);

/**
 * @swagger
 * /api/dashboard/vendas-grafico:
 *   get:
 *     summary: Retorna faturamento diário dos últimos sete dias
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do gráfico de vendas
 *       401:
 *         description: Não autenticado
 */
router.get('/vendas-grafico', dashboardController.getWeeklySales);

/**
 * @swagger
 * /api/dashboard/vendas-por-categoria:
 *   get:
 *     summary: Retorna vendas consolidadas por categoria
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Distribuição de vendas por categoria
 *       401:
 *         description: Não autenticado
 */
router.get('/vendas-por-categoria', dashboardController.getSalesByCategory);

module.exports = router;
