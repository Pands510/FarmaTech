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
 *     summary: Finaliza uma venda no PDV
 *     description: Executa o checkout em uma transação, registrando a venda, os itens e os pagamentos. A baixa de estoque depende das regras implementadas no banco de dados.
 *     tags: [Vendas / PDV]
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
 *               - itens
 *               - pagamentos
 *             properties:
 *               id_caixa:
 *                 type: integer
 *                 minimum: 1
 *               id_cliente:
 *                 type: integer
 *                 nullable: true
 *                 minimum: 1
 *               desconto_percentual:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 0
 *               desconto_valor:
 *                 type: number
 *                 minimum: 0
 *                 default: 0
 *               itens:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - id_produto
 *                     - id_lote
 *                     - quantidade
 *                     - preco_unitario
 *                   properties:
 *                     id_produto:
 *                       type: integer
 *                       minimum: 1
 *                     id_lote:
 *                       type: integer
 *                       minimum: 1
 *                     id_receita:
 *                       type: integer
 *                       nullable: true
 *                     quantidade:
 *                       type: number
 *                       exclusiveMinimum: 0
 *                     preco_unitario:
 *                       type: number
 *                       minimum: 0
 *                     desconto:
 *                       type: number
 *                       minimum: 0
 *                       default: 0
 *               pagamentos:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - forma_pagamento
 *                     - valor
 *                   properties:
 *                     forma_pagamento:
 *                       type: string
 *                       enum: [DINHEIRO, PIX]
 *                     valor:
 *                       type: number
 *                       exclusiveMinimum: 0
 *     responses:
 *       201:
 *         description: Venda finalizada com sucesso.
 *       400:
 *         description: Dados inválidos ou violação de regra de negócio.
 *       401:
 *         description: Token ausente ou inválido.
 *       403:
 *         description: Perfil sem permissão para realizar vendas.
 *       404:
 *         description: Caixa ou cliente não encontrado.
 *       409:
 *         description: Caixa fechado ou conflito com o estado atual da operação.
 *       500:
 *         description: Erro interno ao processar a venda.
 *       501:
 *         description: Forma de pagamento ainda não integrada.
 */
router.post(
  '/checkout',
  authorize(['ATENDENTE', 'CAIXA', 'FARMACEUTICO', 'GERENTE']),
  salesController.checkout
);

/**
 * @swagger
 * /api/vendas:
 *   get:
 *     summary: Lista o histórico de vendas com filtros
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
 *         description: Histórico de vendas.
 *       400:
 *         description: Filtros inválidos.
 *       401:
 *         description: Token ausente ou inválido.
 */
router.get('/', salesController.list);

/**
 * @swagger
 * /api/vendas/clientes:
 *   get:
 *     summary: Pesquisa clientes para utilização no PDV
 *     tags: [Vendas / PDV]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: busca
 *         schema:
 *           type: string
 *         description: Nome ou CPF do cliente.
 *     responses:
 *       200:
 *         description: Lista de clientes encontrados.
 *       400:
 *         description: Termo de pesquisa inválido.
 *       401:
 *         description: Token ausente ou inválido.
 */
router.get('/clientes', salesController.searchCustomers);

/**
 * @swagger
 * /api/vendas/clientes:
 *   post:
 *     summary: Cadastra um cliente pelo operador no balcão
 *     tags: [Vendas / PDV]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *             properties:
 *               nome:
 *                 type: string
 *               cpf:
 *                 type: string
 *               telefone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: Cliente cadastrado com sucesso.
 *       400:
 *         description: Dados inválidos.
 *       401:
 *         description: Token ausente ou inválido.
 *       409:
 *         description: Cliente já cadastrado.
 */
router.post('/clientes', salesController.createCustomer);

/**
 * @swagger
 * /api/vendas/{id}:
 *   get:
 *     summary: Consulta os detalhes de uma venda
 *     description: Retorna informações da venda, itens, lotes e pagamentos.
 *     tags: [Vendas / PDV]
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
 *         description: Detalhes da venda.
 *       400:
 *         description: Identificador inválido.
 *       401:
 *         description: Token ausente ou inválido.
 *       404:
 *         description: Venda não encontrada.
 */
router.get('/:id', salesController.getById);

module.exports = router;