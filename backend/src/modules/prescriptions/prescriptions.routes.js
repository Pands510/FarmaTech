
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
 *     summary: Lista receitas válidas cadastradas recentemente
 *     tags: [Receituário Farmacêutico]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fila de receitas
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Permissão insuficiente
 */
router.get(
  '/pendentes',
  authorize(['FARMACEUTICO', 'GERENTE']),
  prescriptionsController.getPending
);

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
 *           minimum: 1
 *       - in: query
 *         name: apenas_validas
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 50
 *     responses:
 *       200:
 *         description: Lista de receitas
 *       400:
 *         description: Parâmetros inválidos
 *       401:
 *         description: Não autenticado
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
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Detalhes da receita
 *       400:
 *         description: Identificador inválido
 *       404:
 *         description: Receita não encontrada
 */
router.get('/:id', prescriptionsController.getById);

/**
 * @swagger
 * /api/receitas:
 *   post:
 *     summary: Cadastra receita médica
 *     tags: [Receituário Farmacêutico]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_cliente
 *               - nome_prescritor
 *               - crm_prescritor
 *               - data_prescricao
 *               - validade_receita
 *             properties:
 *               id_cliente:
 *                 type: integer
 *                 minimum: 1
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
 *                   required: [id_produto, quantidade]
 *                   properties:
 *                     id_produto:
 *                       type: integer
 *                       minimum: 1
 *                     quantidade:
 *                       type: integer
 *                       minimum: 1
 *                     posologia:
 *                       type: string
 *     responses:
 *       201:
 *         description: Receita cadastrada
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Permissão insuficiente
 */
router.post(
  '/',
  authorize(['FARMACEUTICO', 'GERENTE', 'ATENDENTE']),
  prescriptionsController.create
);

/**
 * @swagger
 * /api/receitas/{id}/aprovar:
 *   post:
 *     summary: Aprova receita para utilização no PDV
 *     tags: [Receituário Farmacêutico]
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
 *         description: Receita aprovada
 *       400:
 *         description: Receita inválida para aprovação
 *       403:
 *         description: Permissão insuficiente
 *       404:
 *         description: Receita não encontrada
 */
router.post(
  '/:id/aprovar',
  authorize(['FARMACEUTICO', 'GERENTE']),
  prescriptionsController.approve
);

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
 *           minLength: 2
 *           maxLength: 2
 *     responses:
 *       200:
 *         description: Médicos localizados
 *       400:
 *         description: Parâmetros inválidos
 */
router.get('/medicos/busca', prescriptionsController.searchDoctors);

/**
 * @swagger
 * /api/medicos:
 *   post:
 *     summary: Cadastra médico prescritor
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
 *                 minLength: 2
 *                 maxLength: 2
 *               especialidade:
 *                 type: string
 *     responses:
 *       201:
 *         description: Médico cadastrado
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Permissão insuficiente
 */
router.post(
  '/medicos',
  authorize(['FARMACEUTICO', 'GERENTE', 'ATENDENTE']),
  prescriptionsController.createDoctor
);

module.exports = router;
