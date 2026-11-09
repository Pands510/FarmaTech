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
 *     summary: Lista produtos do catálogo com saldo vendável calculado via fn_estoque_disponivel
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
 *         description: Catálogo de produtos retornado com sucesso
 */
router.get('/', productsController.list);

/**
 * @swagger
 * /api/produtos/categorias:
 *   get:
 *     summary: Retorna a árvore de grupos e subgrupos farmacêuticos
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
 *     summary: Retorna a ficha técnica detalhada de um produto
 *     tags: [Produtos]
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
 *         description: Produto encontrado
 *       404:
 *         description: Produto não localizado
 */
router.get('/:id', productsController.getById);

/**
 * @swagger
 * /api/produtos/{id}/lotes-fifo:
 *   get:
 *     summary: Retorna os lotes ativos do produto ordenados por validade (Curva FIFO para PDV)
 *     tags: [Produtos]
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
 *         description: Lotes ordenados para prioridade de saída
 */
router.get('/:id/lotes-fifo', productsController.getLotesFifo);

/**
 * @swagger
 * /api/produtos:
 *   post:
 *     summary: Cadastra um novo produto na ficha técnica (Gerente ou Estoquista)
 *     tags: [Produtos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Produto cadastrado com sucesso
 */
router.post('/', authorize(['GERENTE', 'ESTOQUISTA']), productsController.create);

/**
 * @swagger
 * /api/produtos/{id}:
 *   put:
 *     summary: Atualiza os dados de um produto (dispara trigger de auditoria trg_log_preco_produto se alterar preço)
 *     tags: [Produtos]
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
 *         description: Produto atualizado com sucesso
 */
router.put('/:id', authorize(['GERENTE', 'ESTOQUISTA']), productsController.update);

/**
 * @swagger
 * /api/produtos/{id}/inativar:
 *   patch:
 *     summary: Inativação lógica do produto (preserva histórico e auditoria)
 *     tags: [Produtos]
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
 *         description: Produto inativado
 */
router.patch('/:id/inativar', authorize(['GERENTE']), productsController.inactivate);
router.delete('/:id', authorize(['GERENTE']), productsController.inactivate);

module.exports = router;
