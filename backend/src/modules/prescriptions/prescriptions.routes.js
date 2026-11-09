const express = require('express');
const router = express.Router();
const prescriptionsController = require('./prescriptions.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/permission.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * /api/receitas/pendentes:
 *   get:
 *     summary: Lista receitas ativas e pendências para validação do farmacêutico
 *     tags: [Receituário Farmacêutico]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fila de receitas
 */
router.get('/pendentes', authorize(['FARMACEUTICO', 'GERENTE']), prescriptionsController.getPending);

/**
 * @swagger
 * /api/receitas:
 *   get:
 *     summary: Lista receitas com status de validade
 *     tags: [Receituário Farmacêutico]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_cliente
 *         schema:
 *           type: integer
 *       - in: query
 *         name: apenas_validas
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de receitas
 */
router.get('/', prescriptionsController.list);

/**
 * @swagger
 * /api/receitas/{id}:
 *   get:
 *     summary: Detalhes da receita e medicamentos prescritos
 *     tags: [Receituário Farmacêutico]
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
 *         description: Detalhes da receita
 */
router.get('/:id', prescriptionsController.getById);

/**
 * @swagger
 * /api/receitas:
 *   post:
 *     summary: Cadastra receita médica vinculando paciente, médico e medicamentos
 *     tags: [Receituário Farmacêutico]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_cliente, nome_prescritor, crm_prescritor, data_prescricao, validade_receita]
 *             properties:
 *               id_cliente:
 *                 type: integer
 *               id_medico:
 *                 type: integer
 *                 nullable: true
 *               nome_prescritor:
 *                 type: string
 *               crm_prescritor:
 *                 type: string
 *               data_prescricao:
 *                 type: string
 *                 format: date
 *               validade_receita:
 *                 type: string
 *                 format: date
 *               observacoes:
 *                 type: string
 *               itens:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id_produto:
 *                       type: integer
 *                     quantidade:
 *                       type: integer
 *                     posologia:
 *                       type: string
 *     responses:
 *       201:
 *         description: Receita cadastrada
 */
router.post('/', authorize(['FARMACEUTICO', 'GERENTE', 'ATENDENTE']), prescriptionsController.create);

/**
 * @swagger
 * /api/receitas/{id}/aprovar:
 *   post:
 *     summary: Farmacêutico aprova a receita liberando para venda no PDV
 *     tags: [Receituário Farmacêutico]
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
 *         description: Receita aprovada
 */
router.post('/:id/aprovar', authorize(['FARMACEUTICO', 'GERENTE']), prescriptionsController.approve);

/**
 * @swagger
 * /api/medicos/busca:
 *   get:
 *     summary: Busca médicos cadastrados por CRM e UF
 *     tags: [Médicos / Prescritores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: crm
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: uf
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Médicos localizados
 */
router.get('/medicos/busca', prescriptionsController.searchDoctors);

/**
 * @swagger
 * /api/medicos:
 *   post:
 *     summary: Cadastra um novo médico prescritor
 *     tags: [Médicos / Prescritores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, crm, uf_crm]
 *             properties:
 *               nome:
 *                 type: string
 *               crm:
 *                 type: string
 *               uf_crm:
 *                 type: string
 *                 example: SP
 *               especialidade:
 *                 type: string
 *     responses:
 *       201:
 *         description: Médico cadastrado
 */
router.post('/medicos', authorize(['FARMACEUTICO', 'GERENTE', 'ATENDENTE']), prescriptionsController.createDoctor);

module.exports = router;
