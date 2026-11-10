
const express = require('express');
const router = express.Router();

// Módulos
const authRoutes = require('../modules/auth/auth.routes');
const dashboardRoutes = require('../modules/dashboard/dashboard.routes');
const productsRoutes = require('../modules/products/products.routes');
const inventoryRoutes = require('../modules/inventory/inventory.routes');
const salesRoutes = require('../modules/sales/sales.routes');
const cashierRoutes = require('../modules/cashier/cashier.routes');
const prescriptionsRoutes = require('../modules/prescriptions/prescriptions.routes');
const purchasesRoutes = require('../modules/purchases/purchases.routes');
const auditRoutes = require('../modules/audit/audit.routes');

// Middlewares
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');

// Controllers compartilhados
const prescriptionsController = require('../modules/prescriptions/prescriptions.controller');

/**
 * Health Check
 *
 * Verifica se a aplicação está respondendo.
 * Não verifica a disponibilidade do banco de dados.
 */
router.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'UP',
    system: 'FarmaTech ERP - Back-end API',
    timestamp: new Date().toISOString()
  });
});

// Rotas principais
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/produtos', productsRoutes);
router.use('/estoque', inventoryRoutes);
router.use('/vendas', salesRoutes);
router.use('/caixa', cashierRoutes);
router.use('/receitas', prescriptionsRoutes);
router.use('/compras', purchasesRoutes);
router.use('/relatorios', auditRoutes);

// Rotas compartilhadas de médicos
router.get(
  '/medicos/busca',
  authMiddleware,
  prescriptionsController.searchDoctors
);

router.post(
  '/medicos',
  authMiddleware,
  authorize(['FARMACEUTICO', 'GERENTE', 'ATENDENTE']),
  prescriptionsController.createDoctor
);

module.exports = router;
