const auditRepository = require('./audit.repository');

class AuditService {
  async getLogs(filters) {
    return await auditRepository.getAuditLogs(filters);
  }

  async getSalesReport(filters) {
    return await auditRepository.getSalesReport(filters);
  }
}

module.exports = new AuditService();
