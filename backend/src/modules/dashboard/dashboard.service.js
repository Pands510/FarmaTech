
const dashboardRepository = require('./dashboard.repository');

class DashboardService {
  async getKpis() {
    return dashboardRepository.getDailyKpis();
  }

  async getLowStockAlerts() {
    return dashboardRepository.getLowStockAlerts();
  }

  async getExpiringProducts() {
    return dashboardRepository.getExpiringProducts();
  }

  async getWeeklySales() {
    return dashboardRepository.getWeeklySalesChart();
  }

  async getSalesByCategory() {
    return dashboardRepository.getSalesByCategoryChart();
  }
}

module.exports = new DashboardService();
