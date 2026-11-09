const express = require('express');
const router = express.Router();
const salesController = require('./sales.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/permission.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * /api/vendas/checkout:
 *   post:
 *     summary: Finaliza a venda no PDV em transação ACID disparando triggers de estoque e receitas
 *     tags: [Vendas / PDV]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_caixa, itens, pagamentos]
 *             properties:
 *               id_caixa:
 *                 type: integer
 *               id_cliente:
 *                 type: integer
 *                 nullable: true
 *               desconto_valor:
 *                 type: number
 *               itens:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id_produto, id_lote, quantidade, preco_unitario]
 *                   properties:
 *                     id_produto:
 *                       type: integer
 *                     id_lote:
 *                       type: integer
 *                     id_receita:
 *                       type: integer
 *                       nullable: true
 *                     quantidade:
 *                       type: integer
 *                     preco_unitario:
 *                       type: number
 *                     desconto:
 *                       type: number
 *               pagamentos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [forma_pagamento, valor]
 *                   properties:
 *                     forma_pagamento:
 *                       type: string
 *                       enum: [DINHEIRO, DEBITO, CREDITO, PIX, BOLETO, CONVENIO]
 *                     valor:
 *                       type: number
 *                     parcelas:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Venda finalizada com sucesso
 *       400:
 *         description: Violação de regra de negócio (ex. trigger do MySQL por estoque insuficiente ou falta de receita)
 */
router.post('/checkout', authorize(['ATENDENTE', 'CAIXA', 'FARMACEUTICO', 'GERENTE']), salesController.checkout);

/**
 * @swagger
 * /api/vendas:
 *   get:
 *     summary: Lista histórico de vendas com filtros
 *     tags: [Vendas / PDV]
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
 *       - in: query
 *         name: status_venda
 *         schema:
 *           type: string
 *           enum: [ABERTA, FINALIZADA, CANCELADA, DEVOLVIDA]
 *       - in: query
 *         name: id_caixa
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Histórico de vendas
 */
router.get('/', salesController.list);

/**
 * @swagger
 * /api/vendas/clientes:
 *   get:
 *     summary: Consulta clientes para preenchimento de ficha de venda ou balcão
 *     tags: [Vendas / PDV]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: busca
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de clientes
 */
router.get('/clientes', salesController.searchCustomers);

/**
 * @swagger
 * /api/vendas/clientes:
 *   post:
 *     summary: Cadastro rápido de cliente pelo operador no balcão
 *     tags: [Vendas / PDV]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome]
 *             properties:
 *               nome:
 *                 type: string
 *               cpf:
 *                 type: string
 *               telefone:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cliente cadastrado
 */
router.post('/clientes', salesController.createCustomer);

/**
 * @swagger
 * /api/vendas/{id}:
 *   get:
 *     summary: Detalhes completos de uma venda (itens, lotes, pagamentos e receita)
 *     tags: [Vendas / PDV]
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
 *         description: Detalhes da venda
 *       404:
 *         description: Venda não encontrada
 */
router.get('/:id', salesController.getById);

module.exports = router;
