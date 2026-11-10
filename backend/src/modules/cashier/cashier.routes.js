const express = require('express');
const router = express.Router();

const cashierController = require('./cashier.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/permission.middleware');

// Todas as rotas exigem autenticação.
router.use(authMiddleware);

/**
 * @swagger
 * /api/caixa/status-atual:
 *   get:
 *     summary: Consulta o status do caixa do colaborador autenticado.
 *     tags: [Caixa]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status da sessão de caixa.
 *       401:
 *         description: Usuário não autenticado.
 */
router.get('/status-atual', cashierController.getStatus);

/**
 * @swagger
 * /api/caixa/abrir:
 *   post:
 *     summary: Abre uma sessão de caixa com fundo de troco.
 *     tags: [Caixa]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - valor_abertura
 *             properties:
 *               valor_abertura:
 *                 type: number
 *                 minimum: 0
 *                 example: 150.00
 *     responses:
 *       201:
 *         description: Caixa aberto com sucesso.
 *       400:
 *         description: Valor de abertura inválido.
 *       403:
 *         description: Perfil sem permissão.
 */
router.post(
  '/abrir',
  authorize(['CAIXA', 'ATENDENTE', 'GERENTE']),
  cashierController.open
);

/**
 * @swagger
 * /api/caixa/fechar:
 *   post:
 *     summary: Fecha uma sessão de caixa utilizando a procedure sp_fechar_caixa.
 *     tags: [Caixa]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_caixa
 *               - valor_informado_dinheiro
 *             properties:
 *               id_caixa:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *               valor_informado_dinheiro:
 *                 type: number
 *                 minimum: 0
 *                 example: 450.00
 *     responses:
 *       200:
 *         description: Caixa fechado com sucesso.
 *       400:
 *         description: Dados de fechamento inválidos.
 *       403:
 *         description: Perfil sem permissão para fechar este caixa.
 */
router.post(
  '/fechar',
  authorize(['CAIXA', 'GERENTE']),
  cashierController.close
);

/**
 * @swagger
 * /api/caixa/{id}/resumo:
 *   get:
 *     summary: Consulta o resumo financeiro de uma sessão de caixa.
 *     tags: [Caixa]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Resumo financeiro do caixa.
 *       403:
 *         description: Sem permissão para consultar este caixa.
 */
router.get(
  '/:id/resumo',
  authorize(['CAIXA', 'GERENTE']),
  cashierController.getSummary
);

/**
 * @swagger
 * /api/caixa/historico:
 *   get:
 *     summary: Consulta o histórico de sessões de caixa.
 *     tags: [Caixa]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 30
 *     responses:
 *       200:
 *         description: Histórico de caixas.
 *       403:
 *         description: Perfil sem permissão.
 */
router.get(
  '/historico',
  authorize(['CAIXA', 'GERENTE']),
  cashierController.getHistory
);

module.exports = router;