
import React, { useCallback, useEffect, useState } from 'react';

import cashierService from '../../services/cashier.service';
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short'
});

function formatCurrency(value) {
  const number = Number(value);

  return currencyFormatter.format(
    Number.isFinite(number) ? number : 0
  );
}

function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return dateTimeFormatter.format(date);
}

function parseMoney(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return NaN;
  }

  return Number(value.trim().replace(',', '.'));
}

const paymentLabels = {
  DINHEIRO: 'Dinheiro',
  DEBITO: 'Cartão de débito',
  CREDITO: 'Cartão de crédito',
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CONVENIO: 'Convênio'
};

const initialStatus = {
  possui_caixa_aberto: false,
  caixa: null,
  resumo_atual: null
};

export default function Cashier() {
  const [status, setStatus] = useState(initialStatus);
  const [historico, setHistorico] = useState([]);

  const [valorAbertura, setValorAbertura] = useState('');
  const [valorContado, setValorContado] = useState('');

  const [modalFechamento, setModalFechamento] = useState(false);
  const [resultadoFechamento, setResultadoFechamento] = useState(null);

  const [carregando, setCarregando] = useState(true);
  const [operacaoEmAndamento, setOperacaoEmAndamento] = useState(false);

  const [erro, setErro] = useState('');
  const [erroHistorico, setErroHistorico] = useState('');

  const caixaAberto = status.possui_caixa_aberto;
  const caixa = status.caixa;
  const resumo = status.resumo_atual;

  const carregarDados = useCallback(async () => {
    setErro('');
    setErroHistorico('');

    try {
      const statusResponse = await cashierService.getStatus();

      setStatus({
        ...initialStatus,
        ...statusResponse
      });
    } catch (error) {
      setErro(
        error.userMessage ||
        'Não foi possível consultar a situação do caixa.'
      );

      setCarregando(false);
      return;
    }

    try {
      const historyResponse = await cashierService.getHistory();

      setHistorico(
        Array.isArray(historyResponse)
          ? historyResponse
          : historyResponse?.historico || []
      );
    } catch (error) {
      setErroHistorico(
        error.userMessage ||
        'Não foi possível carregar o histórico de caixas.'
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  async function handleOpenCaixa(event) {
    event.preventDefault();
    setErro('');

    const valor = parseMoney(valorAbertura);

    if (!Number.isFinite(valor) || valor < 0) {
      setErro('Informe um valor de abertura válido e não negativo.');
      return;
    }

    try {
      setOperacaoEmAndamento(true);

      await cashierService.openCaixa(valor);

      setValorAbertura('');
      await carregarDados();
    } catch (error) {
      setErro(
        error.userMessage ||
        'Não foi possível abrir o caixa.'
      );
    } finally {
      setOperacaoEmAndamento(false);
    }
  }

  async function handleCloseCaixa(event) {
    event.preventDefault();
    setErro('');

    const valor = parseMoney(valorContado);

    if (!Number.isFinite(valor) || valor < 0) {
      setErro('Informe um valor contado válido e não negativo.');
      return;
    }

    if (!caixa?.id_caixa) {
      setErro('Não foi possível identificar o caixa aberto.');
      return;
    }

    try {
      setOperacaoEmAndamento(true);

      const resultado = await cashierService.closeCaixa(
        caixa.id_caixa,
        valor
      );

      setResultadoFechamento(resultado);
      setModalFechamento(false);
      setValorContado('');

      await carregarDados();
    } catch (error) {
      setErro(
        error.userMessage ||
        'Não foi possível fechar o caixa.'
      );
    } finally {
      setOperacaoEmAndamento(false);
    }
  }

  function getClosingSituation(situacao) {
    const situations = {
      FECHADO_SEM_DIVERGENCIA: 'Fechado sem divergência',
      SOBRA_DE_CAIXA: 'Sobra de caixa',
      FALTA_DE_CAIXA: 'Falta de caixa'
    };

    return situations[situacao] || situacao || 'Não informada';
  }

  if (carregando) {
    return (
      <main style={styles.container}>
        <p>Carregando informações do caixa...</p>
      </main>
    );
  }

  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Sessão de Caixa</h1>
          <p style={styles.subtitle}>
            Abertura, acompanhamento e fechamento de caixa.
          </p>
        </div>

        <button
          type="button"
          onClick={carregarDados}
          disabled={operacaoEmAndamento}
          style={styles.secondaryButton}
        >
          Atualizar
        </button>
      </header>

      {erro && (
        <div role="alert" style={styles.errorBox}>
          {erro}
        </div>
      )}

      {caixaAberto ? (
        <>
          <section style={styles.statusCard}>
            <div>
              <span style={styles.statusLabel}>Situação atual</span>
              <h2 style={styles.statusTitle}>Caixa aberto</h2>
              <p style={styles.mutedText}>
                Caixa #{caixa.id_caixa}
              </p>
            </div>

            <span style={styles.openBadge}>ABERTO</span>
          </section>

          <section style={styles.grid}>
            <article style={styles.metricCard}>
              <span style={styles.metricLabel}>Valor de abertura</span>
              <strong style={styles.metricValue}>
                {formatCurrency(caixa.valor_abertura)}
              </strong>
            </article>

            <article style={styles.metricCard}>
              <span style={styles.metricLabel}>Total de vendas</span>
              <strong style={styles.metricValue}>
                {formatCurrency(resumo?.total_vendas)}
              </strong>
            </article>

            <article style={styles.metricCard}>
              <span style={styles.metricLabel}>Quantidade de vendas</span>
              <strong style={styles.metricValue}>
                {Number(resumo?.quantidade_vendas) || 0}
              </strong>
            </article>

            <article style={styles.metricCard}>
              <span style={styles.metricLabel}>Abertura</span>
              <strong style={styles.metricValueSmall}>
                {formatDateTime(caixa.data_abertura)}
              </strong>
            </article>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Resumo por forma de pagamento</h2>

            <div style={styles.paymentList}>
              {Object.entries(paymentLabels).map(([key, label]) => (
                <div key={key} style={styles.paymentRow}>
                  <span>{label}</span>
                  <strong>
                    {formatCurrency(
                      resumo?.formas_pagamento?.[key]
                    )}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Dados da sessão</h2>

            <div style={styles.detailsGrid}>
              <div>
                <span style={styles.detailLabel}>Operador</span>
                <strong>
                  {caixa.funcionario_nome || 'Não informado'}
                </strong>
              </div>

              <div>
                <span style={styles.detailLabel}>Identificação</span>
                <strong>#{caixa.id_caixa}</strong>
              </div>

              <div>
                <span style={styles.detailLabel}>Status</span>
                <strong>{caixa.status_caixa || 'ABERTO'}</strong>
              </div>
            </div>
          </section>

          <section style={styles.closeSection}>
            <div>
              <h2 style={styles.sectionTitle}>Fechamento de caixa</h2>
              <p style={styles.mutedText}>
                Confira o dinheiro disponível fisicamente antes de
                iniciar o fechamento.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setErro('');
                setModalFechamento(true);
              }}
              disabled={operacaoEmAndamento}
              style={styles.dangerButton}
            >
              Fechar caixa
            </button>
          </section>
        </>
      ) : (
        <section style={styles.card}>
          <span style={styles.closedBadge}>SEM CAIXA ABERTO</span>

          <h2 style={styles.sectionTitle}>
            Nenhuma sessão de caixa ativa
          </h2>

          <p style={styles.mutedText}>
            Informe o valor inicial disponível no caixa para iniciar
            uma nova sessão.
          </p>

          {status.caixa_aberto_outro_operador && (
            <div style={styles.warningBox}>
              Existe um caixa aberto por outro operador.
              Consulte o responsável antes de iniciar uma nova operação.
            </div>
          )}

          <form onSubmit={handleOpenCaixa} style={styles.openForm}>
            <label htmlFor="valorAbertura" style={styles.label}>
              Valor de abertura (R$)
            </label>

            <input
              id="valorAbertura"
              type="number"
              min="0"
              step="0.01"
              value={valorAbertura}
              onChange={(event) => setValorAbertura(event.target.value)}
              placeholder="Ex.: 200,00"
              disabled={operacaoEmAndamento}
              required
              style={styles.input}
            />

            <button
              type="submit"
              disabled={operacaoEmAndamento}
              style={styles.primaryButton}
            >
              {operacaoEmAndamento ? 'Abrindo...' : 'Abrir caixa'}
            </button>
          </form>
        </section>
      )}

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Histórico de caixas</h2>

        {erroHistorico && (
          <div role="alert" style={styles.warningBox}>
            {erroHistorico}
          </div>
        )}

        {!erroHistorico && historico.length === 0 ? (
          <p style={styles.mutedText}>
            Nenhuma sessão anterior encontrada.
          </p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Caixa</th>
                  <th style={styles.th}>Operador</th>
                  <th style={styles.th}>Abertura</th>
                  <th style={styles.th}>Fechamento</th>
                  <th style={styles.th}>Abertura (R$)</th>
                  <th style={styles.th}>Vendas (R$)</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>

              <tbody>
                {historico.map((item) => (
                  <tr key={item.id_caixa}>
                    <td style={styles.td}>#{item.id_caixa}</td>
                    <td style={styles.td}>
                      {item.funcionario_nome || '-'}
                    </td>
                    <td style={styles.td}>
                      {formatDateTime(item.data_abertura)}
                    </td>
                    <td style={styles.td}>
                      {formatDateTime(item.data_fechamento)}
                    </td>
                    <td style={styles.td}>
                      {formatCurrency(item.valor_abertura)}
                    </td>
                    <td style={styles.td}>
                      {formatCurrency(item.total_vendas_sessao)}
                    </td>
                    <td style={styles.td}>
                      {item.status_caixa || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalFechamento && (
        <div
          style={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !operacaoEmAndamento) {
              setModalFechamento(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="closeModalTitle"
            style={styles.modal}
          >
            <h2 id="closeModalTitle" style={styles.sectionTitle}>
              Fechar sessão de caixa
            </h2>

            <p style={styles.mutedText}>
              Informe o valor total de dinheiro contado fisicamente.
              Não inclua cartões, PIX ou outras formas de pagamento.
            </p>

            <div style={styles.modalSummary}>
              <div>
                <span>Caixa</span>
                <strong>#{caixa?.id_caixa}</strong>
              </div>

              <div>
                <span>Vendas registradas</span>
                <strong>
                  {formatCurrency(resumo?.total_vendas)}
                </strong>
              </div>
            </div>

            <form onSubmit={handleCloseCaixa}>
              <label htmlFor="valorContado" style={styles.label}>
                Dinheiro contado (R$)
              </label>

              <input
                id="valorContado"
                type="number"
                min="0"
                step="0.01"
                value={valorContado}
                onChange={(event) => setValorContado(event.target.value)}
                placeholder="Ex.: 1250,00"
                disabled={operacaoEmAndamento}
                required
                style={styles.input}
                autoFocus
              />

              <p style={styles.helperText}>
                O sistema calculará a divergência conforme as regras
                de fechamento do backend.
              </p>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setModalFechamento(false)}
                  disabled={operacaoEmAndamento}
                  style={styles.secondaryButton}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={operacaoEmAndamento}
                  style={styles.dangerButton}
                >
                  {operacaoEmAndamento ? 'Fechando...' : 'Confirmar fechamento'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {resultadoFechamento && (
        <section style={styles.resultCard}>
          <h2 style={styles.sectionTitle}>
            Resultado do fechamento
          </h2>

          <div style={styles.resultGrid}>
            <div>
              <span style={styles.detailLabel}>Caixa</span>
              <strong>#{resultadoFechamento.id_caixa}</strong>
            </div>

            <div>
              <span style={styles.detailLabel}>Status</span>
              <strong>{resultadoFechamento.status}</strong>
            </div>

            <div>
              <span style={styles.detailLabel}>Total de vendas no sistema</span>
              <strong>
                {formatCurrency(resultadoFechamento.total_vendas_sistema)}
              </strong>
            </div>

            <div>
              <span style={styles.detailLabel}>Dinheiro informado</span>
              <strong>
                {formatCurrency(resultadoFechamento.valor_dinheiro_informado)}
              </strong>
            </div>

            <div>
              <span style={styles.detailLabel}>Diferença</span>
              <strong>
                {formatCurrency(resultadoFechamento.diferenca)}
              </strong>
            </div>

            <div>
              <span style={styles.detailLabel}>Situação</span>
              <strong>
                {getClosingSituation(resultadoFechamento.situacao)}
              </strong>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
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

  statusCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px'
  },

  statusLabel: {
    color: '#64748B',
    fontSize: '0.85rem'
  },

  statusTitle: {
    margin: '0.3rem 0',
    color: '#0A2540'
  },

  openBadge: {
    padding: '0.5rem 0.8rem',
    borderRadius: '20px',
    background: '#DCFCE7',
    color: '#166534',
    fontSize: '0.8rem',
    fontWeight: '700'
  },

  closedBadge: {
    display: 'inline-block',
    padding: '0.4rem 0.7rem',
    marginBottom: '1rem',
    borderRadius: '20px',
    background: '#F1F5F9',
    color: '#475569',
    fontSize: '0.75rem',
    fontWeight: '700'
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
  },

  metricCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.7rem',
    padding: '1.25rem',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px'
  },

  metricLabel: {
    color: '#64748B',
    fontSize: '0.85rem'
  },

  metricValue: {
    color: '#0A2540',
    fontSize: '1.5rem'
  },

  metricValueSmall: {
    color: '#0A2540',
    fontSize: '1rem'
  },

  card: {
    padding: '1.5rem',
    marginBottom: '1.5rem',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px'
  },

  sectionTitle: {
    marginTop: 0,
    marginBottom: '1rem',
    color: '#0A2540',
    fontSize: '1.2rem'
  },

  paymentList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '0.75rem'
  },

  paymentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    padding: '0.9rem',
    background: '#F8FAFC',
    borderRadius: '6px',
    fontSize: '0.9rem'
  },

  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1.5rem'
  },

  detailLabel: {
    display: 'block',
    marginBottom: '0.4rem',
    color: '#64748B',
    fontSize: '0.8rem'
  },

  closeSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    background: '#FFF7ED',
    border: '1px solid #FED7AA',
    borderRadius: '10px'
  },

  mutedText: {
    color: '#64748B',
    lineHeight: 1.5
  },

  openForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    maxWidth: '400px',
    marginTop: '1.5rem'
  },

  label: {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#334155',
    fontWeight: '600',
    fontSize: '0.9rem'
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.85rem',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    fontSize: '1rem'
  },

  primaryButton: {
    padding: '0.85rem 1.2rem',
    border: 'none',
    borderRadius: '6px',
    background: '#0A2540',
    color: '#FFFFFF',
    fontWeight: '600',
    cursor: 'pointer'
  },

  secondaryButton: {
    padding: '0.7rem 1rem',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    background: '#FFFFFF',
    color: '#334155',
    fontWeight: '600',
    cursor: 'pointer'
  },

  dangerButton: {
    padding: '0.85rem 1.2rem',
    border: 'none',
    borderRadius: '6px',
    background: '#B91C1C',
    color: '#FFFFFF',
    fontWeight: '600',
    cursor: 'pointer'
  },

  errorBox: {
    padding: '1rem',
    marginBottom: '1.5rem',
    borderRadius: '6px',
    background: '#FEF2F2',
    color: '#B91C1C'
  },

  warningBox: {
    padding: '1rem',
    marginTop: '1rem',
    borderRadius: '6px',
    background: '#FFF7ED',
    color: '#9A3412'
  },

  tableWrapper: {
    overflowX: 'auto'
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.85rem'
  },

  th: {
    padding: '0.85rem',
    background: '#F8FAFC',
    color: '#475569',
    borderBottom: '1px solid #E2E8F0',
    whiteSpace: 'nowrap'
  },

  td: {
    padding: '0.85rem',
    borderBottom: '1px solid #E2E8F0',
    whiteSpace: 'nowrap'
  },

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    background: 'rgba(15, 23, 42, 0.65)'
  },

  modal: {
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '2rem',
    background: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.2)'
  },

  modalSummary: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    padding: '1rem',
    margin: '1.5rem 0',
    background: '#F8FAFC',
    borderRadius: '8px'
  },

  helperText: {
    color: '#64748B',
    fontSize: '0.8rem',
    lineHeight: 1.5
  },

  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    flexWrap: 'wrap',
    marginTop: '1.5rem'
  },

  resultCard: {
    padding: '1.5rem',
    marginBottom: '1.5rem',
    background: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: '10px'
  },

  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1.25rem'
  }
};
