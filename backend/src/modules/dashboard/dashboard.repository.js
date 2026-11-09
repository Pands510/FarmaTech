const { pool } = require('../../config/database');

class DashboardRepository {
  async getDailyKpis() {
    // 1. Vendas de Hoje
    const salesQuery = `
      SELECT 
        COALESCE(SUM(valor_liquido), 0) AS faturamento_hoje,
        COUNT(id_venda) AS total_vendas_hoje
      FROM Vendas
      WHERE DATE(data_hora) = CURDATE()
        AND status_venda = 'FINALIZADA';
    `;
    const [salesRows] = await pool.query(salesQuery);

    // 2. Alertas de Estoque Baixo da View
    const lowStockQuery = `
      SELECT COUNT(*) AS total_alertas_estoque
      FROM vw_alerta_estoque_baixo;
    `;
    const [lowStockRows] = await pool.query(lowStockQuery);

    // 3. Produtos Vencendo em 30 Dias da View
    const expiringQuery = `
      SELECT COUNT(*) AS total_produtos_vencendo
      FROM vw_produtos_vencendo;
    `;
    const [expiringRows] = await pool.query(expiringQuery);

    // 4. Saldo em Caixas Abertos
    const cashQuery = `
      SELECT 
        COALESCE(SUM(valor_abertura), 0) AS fundo_caixa_aberto,
        COUNT(id_caixa) AS caixas_abertos
      FROM Caixas
      WHERE status_caixa = 'ABERTO';
    `;
    const [cashRows] = await pool.query(cashQuery);

    const faturamento = Number(salesRows[0].faturamento_hoje);
    const totalVendas = Number(salesRows[0].total_vendas_hoje);
    const ticketMedio = totalVendas > 0 ? Number((faturamento / totalVendas).toFixed(2)) : 0;

    return {
      faturamento_diario: faturamento,
      total_vendas_dia: totalVendas,
      ticket_medio_dia: ticketMedio,
      alertas_estoque_baixo: Number(lowStockRows[0].total_alertas_estoque),
      produtos_vencendo_30d: Number(expiringRows[0].total_produtos_vencendo),
      caixas_abertos: Number(cashRows[0].caixas_abertos),
      fundo_troco_caixas: Number(cashRows[0].fundo_caixa_aberto)
    };
  }

  async getLowStockAlerts() {
    const query = `
      SELECT 
        id_produto,
        descricao,
        estoque_minimo,
        estoque_atual,
        reposicao_sugerida
      FROM vw_alerta_estoque_baixo
      ORDER BY reposicao_sugerida DESC;
    `;
    const [rows] = await pool.query(query);
    return rows;
  }

  async getExpiringProducts() {
    const query = `
      SELECT 
        id_produto,
        Produto AS produto,
        Lote AS lote,
        Validade AS validade,
        Dias_Para_Vencer AS dias_para_vencer,
        Qtd_Disponivel AS quantidade_disponivel
      FROM vw_produtos_vencendo
      ORDER BY Validade ASC;
    `;
    const [rows] = await pool.query(query);
    return rows;
  }

  async getWeeklySalesChart() {
    const query = `
      SELECT 
        DATE_FORMAT(d.dia, '%Y-%m-%d') AS data,
        DATE_FORMAT(d.dia, '%d/%m') AS data_formatada,
        DAYNAME(d.dia) AS dia_semana,
        COALESCE(SUM(v.valor_liquido), 0) AS total_faturamento,
        COUNT(v.id_venda) AS total_pedidos
      FROM (
        SELECT CURDATE() - INTERVAL (a.num) DAY AS dia
        FROM (
          SELECT 0 AS num UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL 
          SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
        ) a
      ) d
      LEFT JOIN Vendas v ON DATE(v.data_hora) = d.dia AND v.status_venda = 'FINALIZADA'
      GROUP BY d.dia
      ORDER BY d.dia ASC;
    `;
    const [rows] = await pool.query(query);
    return rows;
  }

  async getSalesByCategoryChart() {
    const query = `
      SELECT 
        g.nome AS categoria,
        COALESCE(SUM(vi.subtotal), 0) AS faturamento,
        COALESCE(SUM(vi.quantidade), 0) AS itens_vendidos
      FROM Grupos g
      LEFT JOIN Produtos p ON p.id_grupo = g.id_grupo
      LEFT JOIN Vendas_Itens vi ON vi.id_produto = p.id_produto
      LEFT JOIN Vendas v ON v.id_venda = vi.id_venda AND v.status_venda = 'FINALIZADA'
      GROUP BY g.id_grupo, g.nome
      ORDER BY faturamento DESC;
    `;
    const [rows] = await pool.query(query);
    return rows;
  }
}

module.exports = new DashboardRepository();
