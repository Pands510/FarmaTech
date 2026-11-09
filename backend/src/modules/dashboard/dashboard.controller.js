const dashboardService = require('./dashboard.service');

class DashboardController {
  async getKpis(req, res, next) {
    try {
      const data = await dashboardService.getKpis();
      return res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async getLowStockAlerts(req, res, next) {
    try {
      const data = await dashboardService.getLowStockAlerts();
      return res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async getExpiringProducts(req, res, next) {
    try {
      const data = await dashboardService.getExpiringProducts();
      return res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async getWeeklySales(req, res, next) {
    try {
      const data = await dashboardService.getWeeklySales();
      return res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async getSalesByCategory(req, res, next) {
    try {
      const data = await dashboardService.getSalesByCategory();
      return res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new DashboardController();
