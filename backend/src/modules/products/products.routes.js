
const express = require('express');
const router = express.Router();

const productsController = require('./products.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/permission.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * /api/produtos:
 *   get:
 *     summary: Lista produtos do catálogo com saldo disponível
 *     tags: [Produtos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: busca
 *         schema:
 *           type: string
 *         description: Busca por descrição, código de barras ou princípio ativo
 *       - in: query
 *         name: id_grupo
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ATIVO, INATIVO, DESCONTINUADO, BLOQUEADO]
 *       - in: query
 *         name: precisa_receita
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Catálogo retornado com sucesso
 *       401:
 *         description: Não autenticado
 */
router.get('/', productsController.list);

/**
 * @swagger
 * /api/produtos/categorias:
 *   get:
 *     summary: Retorna grupos e subgrupos farmacêuticos
 *     tags: [Produtos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categorias carregadas com sucesso
 */
router.get('/categorias', productsController.getCategories);

/**
 * @swagger
 * /api/produtos/{id}:
 *   get:
 *     summary: Retorna a ficha técnica de um produto
 *     tags: [Produtos]
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
 *         description: Produto encontrado
 *       404:
 *         description: Produto não localizado
 */
router.get('/:id', productsController.getById);

/**
 * @swagger
 * /api/produtos/{id}/lotes-fifo:
 *   get:
 *     summary: Retorna lotes disponíveis ordenados por validade (FEFO)
 *     tags: [Produtos]
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
 *         description: Lotes disponíveis retornados com sucesso
 *       404:
 *         description: Produto não localizado
 */
router.get('/:id/lotes-fifo', productsController.getLotesFifo);

/**
 * @swagger
 * /api/produtos:
 *   post:
 *     summary: Cadastra um novo produto
 *     tags: [Produtos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Produto cadastrado com sucesso
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Permissão insuficiente
 */
router.post(
  '/',
  authorize(['GERENTE', 'ESTOQUISTA']),
  productsController.create
);

/**
 * @swagger
 * /api/produtos/{id}:
 *   put:
 *     summary: Atualiza os dados de um produto
 *     tags: [Produtos]
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
 *         description: Produto atualizado com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Produto não localizado
 */
router.put(
  '/:id',
  authorize(['GERENTE', 'ESTOQUISTA']),
  productsController.update
);

/**
 * @swagger
 * /api/produtos/{id}/inativar:
 *   patch:
 *     summary: Realiza a inativação lógica de um produto
 *     description: Preserva o histórico de movimentações e auditoria.
 *     tags: [Produtos]
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
 *         description: Produto inativado
 *       404:
 *         description: Produto não localizado
 *       403:
 *         description: Permissão insuficiente
 */
router.patch(
  '/:id/inativar',
  authorize(['GERENTE']),
  productsController.inactivate
);

module.exports = router;
