const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/permission.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * /api/dashboard/kpis:
 *   get:
 *     summary: Retorna os principais indicadores de desempenho (KPIs) diários
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KPIs calculados com sucesso
 */
router.get('/kpis', dashboardController.getKpis);

/**
 * @swagger
 * /api/dashboard/alertas-estoque:
 *   get:
 *     summary: Lista produtos com saldo abaixo do estoque mínimo (vw_alerta_estoque_baixo)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de reposição sugerida
 */
router.get('/alertas-estoque', dashboardController.getLowStockAlerts);

/**
 * @swagger
 * /api/dashboard/produtos-vencendo:
 *   get:
 *     summary: Lista lotes que vencem nos próximos 30 dias (vw_produtos_vencendo)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lotes próximos ao vencimento
 */
router.get('/produtos-vencendo', dashboardController.getExpiringProducts);

/**
 * @swagger
 * /api/dashboard/vendas-grafico:
 *   get:
 *     summary: Dados consolidados dos últimos 7 dias para gráfico de faturamento
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Faturamento diário dos últimos 7 dias
 */
router.get('/vendas-grafico', dashboardController.getWeeklySales);

/**
 * @swagger
 * /api/dashboard/vendas-por-categoria:
 *   get:
 *     summary: Faturamento consolidado por grupo e categoria de produto
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Distribuição de vendas por categoria
 */
router.get('/vendas-por-categoria', dashboardController.getSalesByCategory);

module.exports = router;
