const express = require('express');
const router = express.Router();
const purchasesController = require('./purchases.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/permission.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * /api/compras:
 *   get:
 *     summary: Lista ordens de compras e notas fiscais de fornecedores
 *     tags: [Compras & Fornecedores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDENTE, RECEBIDA, CANCELADA]
 *       - in: query
 *         name: id_fornecedor
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de compras
 */
router.get('/', purchasesController.list);

/**
 * @swagger
 * /api/compras/{id}:
 *   get:
 *     summary: Detalhes de uma compra, itens da NF e lotes gerados
 *     tags: [Compras & Fornecedores]
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
 *         description: Detalhes da compra
 */
router.get('/:id', purchasesController.getById);

/**
 * @swagger
 * /api/compras:
 *   post:
 *     summary: Registra novo pedido / NF de compra de fornecedor
 *     tags: [Compras & Fornecedores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_fornecedor, numero_nf, itens]
 *             properties:
 *               id_fornecedor:
 *                 type: integer
 *               numero_nf:
 *                 type: string
 *               itens:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id_produto, quantidade, preco_unitario]
 *                   properties:
 *                     id_produto:
 *                       type: integer
 *                     quantidade:
 *                       type: integer
 *                     preco_unitario:
 *                       type: number
 *     responses:
 *       201:
 *         description: Compra criada
 */
router.post('/', authorize(['ESTOQUISTA', 'GERENTE']), purchasesController.create);

/**
 * @swagger
 * /api/compras/{id}/receber:
 *   post:
 *     summary: Entrada fiscal de estoque e instanciação de novos lotes com validade
 *     tags: [Compras & Fornecedores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lotes]
 *             properties:
 *               lotes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id_produto, numero_lote, data_validade, quantidade]
 *                   properties:
 *                     id_produto:
 *                       type: integer
 *                     numero_lote:
 *                       type: string
 *                     data_fabricacao:
 *                       type: string
 *                       format: date
 *                     data_validade:
 *                       type: string
 *                       format: date
 *                     quantidade:
 *                       type: integer
 *                     preco_custo_lote:
 *                       type: number
 *     responses:
 *       200:
 *         description: Mercadoria recebida e lotes ativados no estoque
 */
router.post('/:id/receber', authorize(['ESTOQUISTA', 'GERENTE']), purchasesController.receive);

module.exports = router;
