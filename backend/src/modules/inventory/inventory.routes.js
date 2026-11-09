const express = require('express');
const router = express.Router();
const inventoryController = require('./inventory.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/permission.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * /api/estoque/entrada:
 *   post:
 *     summary: Registra entrada física de novo lote de produtos com histórico
 *     tags: [Estoque]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_produto, id_fornecedor, numero_lote, data_validade, quantidade]
 *             properties:
 *               id_produto:
 *                 type: integer
 *               id_fornecedor:
 *                 type: integer
 *               numero_lote:
 *                 type: string
 *               data_fabricacao:
 *                 type: string
 *                 format: date
 *               data_validade:
 *                 type: string
 *                 format: date
 *               quantidade:
 *                 type: integer
 *               preco_custo_lote:
 *                 type: number
 *     responses:
 *       201:
 *         description: Lote criado e movimentação registrada
 */
router.post('/entrada', authorize(['GERENTE', 'ESTOQUISTA']), inventoryController.entry);

/**
 * @swagger
 * /api/estoque/baixa-manual:
 *   post:
 *     summary: Retirada física de estoque por avaria, vencimento ou perda com auditoria
 *     tags: [Estoque]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_produto, id_lote, quantidade, motivo]
 *             properties:
 *               id_produto:
 *                 type: integer
 *               id_lote:
 *                 type: integer
 *               quantidade:
 *                 type: integer
 *               motivo:
 *                 type: string
 *                 example: VENCIMENTO
 *               observacao:
 *                 type: string
 *     responses:
 *       200:
 *         description: Baixa efetuada com sucesso
 */
router.post('/baixa-manual', authorize(['GERENTE', 'ESTOQUISTA']), inventoryController.manualDischarge);

/**
 * @swagger
 * /api/estoque/movimentos:
 *   get:
 *     summary: Retorna histórico de movimentações da tabela Movimentos_Estoque
 *     tags: [Estoque]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_produto
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Histórico de movimentações
 */
router.get('/movimentos', inventoryController.movements);

/**
 * @swagger
 * /api/estoque/fornecedores:
 *   get:
 *     summary: Lista fornecedores ativos cadastrados
 *     tags: [Estoque]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de fornecedores
 */
router.get('/fornecedores', inventoryController.suppliers);

module.exports = router;
