const express = require('express');
const router = express.Router();
const cashierController = require('./cashier.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/permission.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * /api/caixa/status-atual:
 *   get:
 *     summary: Inspeciona se o colaborador logado possui sessão de caixa aberta no dia
 *     tags: [Caixa]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status da sessão de caixa
 */
router.get('/status-atual', cashierController.getStatus);

/**
 * @swagger
 * /api/caixa/abrir:
 *   post:
 *     summary: Abertura de turno do caixa físico com fundo de troco
 *     tags: [Caixa]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               valor_abertura:
 *                 type: number
 *                 example: 150.00
 *     responses:
 *       201:
 *         description: Caixa aberto com sucesso
 */
router.post('/abrir', authorize(['CAIXA', 'ATENDENTE', 'GERENTE']), cashierController.open);

/**
 * @swagger
 * /api/caixa/fechar:
 *   post:
 *     summary: Fechamento de caixa executando a Stored Procedure sp_fechar_caixa
 *     tags: [Caixa]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_caixa, valor_informado_dinheiro]
 *             properties:
 *               id_caixa:
 *                 type: integer
 *                 example: 1
 *               valor_informado_dinheiro:
 *                 type: number
 *                 example: 450.00
 *     responses:
 *       200:
 *         description: Caixa encerrado com reconciliação contábil retornada pela Stored Procedure
 */
router.post('/fechar', authorize(['CAIXA', 'GERENTE']), cashierController.close);

/**
 * @swagger
 * /api/caixa/{id}/resumo:
 *   get:
 *     summary: Consulta o fechamento preliminar com totais por forma de pagamento
 *     tags: [Caixa]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Resumo financeiro do turno
 */
router.get('/:id/resumo', cashierController.getSummary);

/**
 * @swagger
 * /api/caixa/historico:
 *   get:
 *     summary: Lista histórico de turnos de caixas anteriores
 *     tags: [Caixa]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Histórico de caixas
 */
router.get('/historico', cashierController.getHistory);

module.exports = router;
