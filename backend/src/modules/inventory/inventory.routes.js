
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
 *     summary: Registra entrada física de um novo lote
 *     tags: [Estoque]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_produto
 *               - id_fornecedor
 *               - numero_lote
 *               - data_validade
 *               - quantidade
 *             properties:
 *               id_produto:
 *                 type: integer
 *               id_fornecedor:
 *                 type: integer
 *               id_compra:
 *                 type: integer
 *                 nullable: true
 *               numero_lote:
 *                 type: string
 *               data_fabricacao:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               data_validade:
 *                 type: string
 *                 format: date
 *               quantidade:
 *                 type: integer
 *                 minimum: 1
 *               preco_custo_lote:
 *                 type: number
 *                 minimum: 0
 *               motivo:
 *                 type: string
 *     responses:
 *       201:
 *         description: Lote criado e movimentação registrada
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão
 */
router.post(
  '/entrada',
  authorize(['GERENTE', 'ESTOQUISTA']),
  inventoryController.entry
);

/**
 * @swagger
 * /api/estoque/baixa-manual:
 *   post:
 *     summary: Realiza baixa manual de estoque
 *     tags: [Estoque]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_produto
 *               - id_lote
 *               - quantidade
 *               - motivo
 *             properties:
 *               id_produto:
 *                 type: integer
 *               id_lote:
 *                 type: integer
 *               quantidade:
 *                 type: integer
 *                 minimum: 1
 *               motivo:
 *                 type: string
 *               observacao:
 *                 type: string
 *     responses:
 *       200:
 *         description: Baixa efetuada com sucesso
 *       400:
 *         description: Dados inválidos ou saldo insuficiente
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Lote não encontrado
 */
router.post(
  '/baixa-manual',
  authorize(['GERENTE', 'ESTOQUISTA']),
  inventoryController.manualDischarge
);

/**
 * @swagger
 * /api/estoque/movimentos:
 *   get:
 *     summary: Consulta histórico de movimentações do estoque
 *     tags: [Estoque]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_produto
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
 *         description: Histórico de movimentações
 *       400:
 *         description: Filtros inválidos
 *       401:
 *         description: Não autenticado
 */
router.get('/movimentos', inventoryController.movements);

/**
 * @swagger
 * /api/estoque/fornecedores:
 *   get:
 *     summary: Lista fornecedores ativos
 *     tags: [Estoque]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de fornecedores
 *       401:
 *         description: Não autenticado
 */
router.get('/fornecedores', inventoryController.suppliers);

module.exports = router;
