
import React, { useCallback, useEffect, useState } from 'react';

import { dashboardService } from '../../services/dashboard.service';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

function money(value) {
  const number = Number(value);
  return currencyFormatter.format(Number.isFinite(number) ? number : 0);
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [alertasEstoque, setAlertasEstoque] = useState([]);
  const [produtosVencendo, setProdutosVencendo] = useState([]);
  const [vendasSemana, setVendasSemana] = useState([]);
  const [vendasCategoria, setVendasCategoria] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregarDashboard = useCallback(async () => {
    setErro('');

    const requests = await Promise.allSettled([
      dashboardService.getKpis(),
      dashboardService.getLowStockAlerts(),
      dashboardService.getExpiringBatches(),
      dashboardService.getWeeklySales(),
      dashboardService.getSalesByCategory()
    ]);

    const [kpiResult, stockResult, expiringResult, weeklyResult, categoryResult] =
      requests;

    const failures = [];

    if (kpiResult.status === 'fulfilled') {
      setKpis(kpiResult.value);
    } else {
      failures.push('indicadores');
    }

    if (stockResult.status === 'fulfilled') {
      setAlertasEstoque(
        Array.isArray(stockResult.value) ? stockResult.value : []
      );
    } else {
      failures.push('alertas de estoque');
    }

    if (expiringResult.status === 'fulfilled') {
      setProdutosVencendo(
        Array.isArray(expiringResult.value) ? expiringResult.value : []
      );
    } else {
      failures.push('produtos próximos do vencimento');
    }

    if (weeklyResult.status === 'fulfilled') {
      setVendasSemana(
        Array.isArray(weeklyResult.value) ? weeklyResult.value : []
      );
    } else {
      failures.push('vendas semanais');
    }

    if (categoryResult.status === 'fulfilled') {
      setVendasCategoria(categoryResult.value);
    } else {
      failures.push('vendas por categoria');
    }

    if (failures.length > 0) {
      setErro(`Não foi possível carregar: ${failures.join(', ')}.`);
    }

    setCarregando(false);
  }, []);

  useEffect(() => {
    carregarDashboard();
  }, [carregarDashboard]);

  if (carregando) {
    return (
      <main style={styles.container}>
        <p>Carregando dashboard...</p>
      </main>
    );
  }

  const metricas = [
    {
      label: 'Faturamento diário',
      value: money(kpis?.faturamento_diario),
      description: 'Total vendido hoje',
      icon: 'R$'
    },
    {
      label: 'Vendas realizadas',
      value: number(kpis?.total_vendas_dia),
      description: 'Quantidade de vendas hoje',
      icon: '#'
    },
    {
      label: 'Ticket médio',
      value: money(kpis?.ticket_medio_dia),
      description: 'Valor médio por venda',
      icon: 'M'
    },
    {
      label: 'Alertas de estoque',
      value: number(kpis?.alertas_estoque_baixo),
      description: 'Produtos abaixo do mínimo',
      icon: '!'
    },
    {
      label: 'Produtos vencendo',
      value: number(kpis?.produtos_vencendo_30d),
      description: 'Próximos de vencer em 30 dias',
      icon: 'V'
    },
    {
      label: 'Caixas abertos',
      value: number(kpis?.caixas_abertos),
      description: 'Sessões atualmente abertas',
      icon: 'C'
    },
    {
      label: 'Fundo de troco',
      value: money(kpis?.fundo_troco_caixas),
      description: 'Valor inicial dos caixas abertos',
      icon: 'T'
    }
  ];

  const maiorFaturamento = Math.max(
    1,
    ...vendasSemana.map(item => number(item.total_faturamento))
  );

  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard Executivo</h1>
          <p style={styles.subtitle}>
            Visão geral da operação da FarmaTech.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCarregando(true);
            carregarDashboard();
          }}
          style={styles.refreshButton}
        >
          Atualizar dados
        </button>
      </header>

      {erro && (
        <div role="alert" style={styles.errorBox}>
          {erro}
        </div>
      )}

      <section>
        <h2 style={styles.sectionTitle}>Indicadores gerais</h2>

        <div style={styles.metricsGrid}>
          {metricas.map((item) => (
            <article key={item.label} style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span style={styles.metricIcon}>{item.icon}</span>
                <span style={styles.metricLabel}>{item.label}</span>
              </div>

              <strong style={styles.metricValue}>{item.value}</strong>

              <span style={styles.metricDescription}>
                {item.description}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Desempenho semanal</h2>
        <p style={styles.description}>
          Faturamento e quantidade de pedidos por dia.
        </p>

        {vendasSemana.length === 0 ? (
          <p style={styles.emptyMessage}>
            Nenhum dado de vendas disponível para o período.
          </p>
        ) : (
          <div style={styles.chart}>
            {vendasSemana.map((item, index) => {
              const faturamento = number(item.total_faturamento);
              const percentual = (faturamento / maiorFaturamento) * 100;

              return (
                <div
                  key={`${item.data || item.dia_semana}-${index}`}
                  style={styles.chartColumn}
                >
                  <strong style={styles.chartValue}>
                    {money(faturamento)}
                  </strong>

                  <div style={styles.barContainer}>
                    <div
                      title={money(faturamento)}
                      style={{
                        ...styles.bar,
                        height: `${Math.max(percentual, 2)}%`
                      }}
                    />
                  </div>

                  <span style={styles.chartDay}>
                    {item.dia_semana || item.data_formatada || item.data}
                  </span>

                  <span style={styles.chartOrders}>
                    {number(item.total_pedidos)} pedidos
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Vendas por categoria</h2>
        <p style={styles.description}>
          Distribuição do faturamento entre as categorias de produtos.
        </p>

        {Array.isArray(vendasCategoria) && vendasCategoria.length === 0 ? (
          <p style={styles.emptyMessage}>
            Nenhum dado de vendas por categoria disponível.
          </p>
        ) : (
          <p style={styles.warningMessage}>
            Dados recebidos da API. A visualização do gráfico será concluída
            após confirmarmos os nomes dos campos retornados pelo backend.
          </p>
        )}
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Alertas de estoque baixo</h2>

        {alertasEstoque.length === 0 ? (
          <p style={styles.emptyMessage}>
            Nenhum produto abaixo do estoque mínimo.
          </p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Produto</th>
                  <th style={styles.th}>Estoque atual</th>
                  <th style={styles.th}>Estoque mínimo</th>
                  <th style={styles.th}>Reposição sugerida</th>
                </tr>
              </thead>

              <tbody>
                {alertasEstoque.map(item => (
                  <tr key={item.id_produto}>
                    <td style={styles.td}>{item.descricao}</td>
                    <td style={styles.td}>
                      <strong style={styles.dangerText}>
                        {number(item.estoque_atual)}
                      </strong>
                    </td>
                    <td style={styles.td}>
                      {number(item.estoque_minimo)}
                    </td>
                    <td style={styles.td}>
                      {number(item.reposicao_sugerida)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Produtos próximos do vencimento</h2>

        {produtosVencendo.length === 0 ? (
          <p style={styles.emptyMessage}>
            Nenhum produto próximo do vencimento.
          </p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Produto</th>
                  <th style={styles.th}>Lote</th>
                  <th style={styles.th}>Validade</th>
                  <th style={styles.th}>Dias restantes</th>
                  <th style={styles.th}>Quantidade disponível</th>
                </tr>
              </thead>

              <tbody>
                {produtosVencendo.map((item, index) => (
                  <tr key={`${item.id_produto}-${item.lote}-${index}`}>
                    <td style={styles.td}>{item.produto}</td>
                    <td style={styles.td}>{item.lote}</td>
                    <td style={styles.td}>
                      {item.validade
                        ? new Date(`${item.validade}T00:00:00`).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td style={styles.td}>
                      <strong
                        style={
                          number(item.dias_para_vencer) <= 7
                            ? styles.dangerText
                            : styles.warningText
                        }
                      >
                        {number(item.dias_para_vencer)} dias
                      </strong>
                    </td>
                    <td style={styles.td}>
                      {number(item.quantidade_disponivel)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
    color: '#0F172A'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '2rem'
  },

  title: {
    margin: 0,
    color: '#0A2540',
    fontSize: '1.8rem'
  },

  subtitle: {
    color: '#64748B',
    marginBottom: 0
  },

  refreshButton: {
    padding: '0.75rem 1rem',
    border: 'none',
    borderRadius: '6px',
    background: '#0A2540',
    color: '#FFFFFF',
    fontWeight: '600',
    cursor: 'pointer'
  },

  sectionTitle: {
    marginTop: 0,
    marginBottom: '1rem',
    color: '#0A2540',
    fontSize: '1.2rem'
  },

  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },

  metricCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    padding: '1.25rem',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px'
  },

  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem'
  },

  metricIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    background: '#E0F2FE',
    color: '#0369A1',
    fontWeight: '700'
  },

  metricLabel: {
    color: '#64748B',
    fontSize: '0.85rem'
  },

  metricValue: {
    color: '#0A2540',
    fontSize: '1.5rem'
  },

  metricDescription: {
    color: '#94A3B8',
    fontSize: '0.8rem'
  },

  card: {
    padding: '1.5rem',
    marginBottom: '1.5rem',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px'
  },

  description: {
    marginTop: '-0.5rem',
    marginBottom: '1.5rem',
    color: '#64748B',
    fontSize: '0.9rem'
  },

  chart: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: '1rem',
    minHeight: '260px',
    padding: '1rem 0',
    overflowX: 'auto'
  },

  chartColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: '1 0 75px',
    height: '240px',
    gap: '0.5rem'
  },

  chartValue: {
    color: '#334155',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap'
  },

  barContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    width: '55%',
    height: '150px',
    background: '#F1F5F9',
    borderRadius: '6px 6px 0 0',
    overflow: 'hidden'
  },

  bar: {
    width: '100%',
    minHeight: '3px',
    background: '#0D9488',
    borderRadius: '6px 6px 0 0',
    transition: 'height 0.3s ease'
  },

  chartDay: {
    color: '#334155',
    fontSize: '0.8rem',
    fontWeight: '600'
  },

  chartOrders: {
    color: '#94A3B8',
    fontSize: '0.7rem',
    whiteSpace: 'nowrap'
  },

  tableWrapper: {
    width: '100%',
    overflowX: 'auto'
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.85rem'
  },

  th: {
    padding: '0.9rem',
    background: '#F8FAFC',
    color: '#475569',
    borderBottom: '1px solid #E2E8F0',
    whiteSpace: 'nowrap'
  },

  td: {
    padding: '0.9rem',
    borderBottom: '1px solid #E2E8F0'
  },

  dangerText: {
    color: '#B91C1C'
  },

  warningText: {
    color: '#B45309'
  },

  emptyMessage: {
    padding: '1rem',
    color: '#64748B',
    textAlign: 'center'
  },

  warningMessage: {
    padding: '1rem',
    background: '#FFF7ED',
    color: '#9A3412',
    borderRadius: '6px',
    lineHeight: 1.5
  },

  errorBox: {
    padding: '1rem',
    marginBottom: '1.5rem',
    borderRadius: '6px',
    background: '#FEF2F2',
    color: '#B91C1C'
  }
};

export default Dashboard;
