const dashboardRepository = require('./dashboard.repository');

class DashboardService {
  async getKpis() {
    return await dashboardRepository.getDailyKpis();
  }

  async getLowStockAlerts() {
    return await dashboardRepository.getLowStockAlerts();
  }

  async getExpiringProducts() {
    return await dashboardRepository.getExpiringProducts();
  }

  async getWeeklySales() {
    return await dashboardRepository.getWeeklySalesChart();
  }

  async getSalesByCategory() {
    return await dashboardRepository.getSalesByCategoryChart();
  }
}

module.exports = new DashboardService();
