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
 *     summary: Lista ordens de compra e notas fiscais de fornecedores
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
 *           minimum: 1
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 50
 *     responses:
 *       200:
 *         description: Lista de compras
 *       401:
 *         description: Não autenticado
 */
router.get('/', purchasesController.list);

/**
 * @swagger
 * /api/compras/{id}:
 *   get:
 *     summary: Consulta detalhes de uma compra, itens da NF e lotes gerados
 *     tags: [Compras & Fornecedores]
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
 *         description: Detalhes da compra
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Compra não encontrada
 */
router.get('/:id', purchasesController.getById);

/**
 * @swagger
 * /api/compras:
 *   post:
 *     summary: Registra uma nova ordem de compra de fornecedor
 *     tags: [Compras & Fornecedores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_fornecedor
 *               - numero_nf
 *               - itens
 *             properties:
 *               id_fornecedor:
 *                 type: integer
 *                 minimum: 1
 *               numero_nf:
 *                 type: string
 *               itens:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - id_produto
 *                     - quantidade
 *                     - preco_unitario
 *                   properties:
 *                     id_produto:
 *                       type: integer
 *                       minimum: 1
 *                     quantidade:
 *                       type: integer
 *                       minimum: 1
 *                     preco_unitario:
 *                       type: number
 *                       minimum: 0
 *     responses:
 *       201:
 *         description: Compra criada com status PENDENTE
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Permissão insuficiente
 */
router.post(
  '/',
  authorize(['ESTOQUISTA', 'GERENTE']),
  purchasesController.create
);

/**
 * @swagger
 * /api/compras/{id}/receber:
 *   post:
 *     summary: Recebe mercadorias e registra os respectivos lotes no estoque
 *     description: >
 *       A soma das quantidades recebidas por produto deve corresponder
 *       à quantidade registrada na ordem de compra. Cada lote deve
 *       possuir número e data de validade.
 *     tags: [Compras & Fornecedores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lotes
 *             properties:
 *               lotes:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - id_produto
 *                     - numero_lote
 *                     - data_validade
 *                     - quantidade
 *                   properties:
 *                     id_produto:
 *                       type: integer
 *                       minimum: 1
 *                     numero_lote:
 *                       type: string
 *                     data_fabricacao:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     data_validade:
 *                       type: string
 *                       format: date
 *                     quantidade:
 *                       type: integer
 *                       minimum: 1
 *                     preco_custo_lote:
 *                       type: number
 *                       minimum: 0
 *     responses:
 *       200:
 *         description: Mercadorias recebidas e lotes registrados
 *       400:
 *         description: Dados inválidos ou divergência nas quantidades
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Permissão insuficiente
 *       404:
 *         description: Compra não encontrada
 *       409:
 *         description: Compra não está pendente
 */
router.post(
  '/:id/receber',
  authorize(['ESTOQUISTA', 'GERENTE']),
  purchasesController.receive
);

module.exports = router;