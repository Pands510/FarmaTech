
const express = require('express');
const router = express.Router();

const authController = require('./auth.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autenticação de colaborador
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - matricula
 *               - senha
 *             properties:
 *               matricula:
 *                 type: string
 *                 example: MAT001
 *               senha:
 *                 type: string
 *                 format: password
 *                 example: senha-ficticia
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       400:
 *         description: Dados obrigatórios ausentes ou inválidos
 *       401:
 *         description: Credenciais inválidas
 *       403:
 *         description: Funcionário inativo
 *       500:
 *         description: Erro interno ou de configuração
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obtém os dados do colaborador autenticado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil do usuário autenticado
 *       401:
 *         description: Token ausente, inválido ou expirado
 *       403:
 *         description: Funcionário inativo
 *       404:
 *         description: Funcionário não localizado
 */
router.get('/me', authMiddleware, authController.me);

module.exports = router;
