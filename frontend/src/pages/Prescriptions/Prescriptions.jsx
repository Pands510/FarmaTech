
import React, { useCallback, useEffect, useState } from 'react';
import prescriptionsService from '../../services/prescriptions.service';

const styles = {
  page: {
    padding: '2rem',
    color: '#263238',
    fontFamily: 'Inter, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  title: { margin: 0, fontSize: '1.6rem' },
  subtitle: { color: '#718096', marginTop: '0.4rem' },
  button: {
    border: 0,
    borderRadius: '8px',
    padding: '0.7rem 1rem',
    cursor: 'pointer',
    fontWeight: 600
  },
  primary: { background: '#b91c1c', color: '#fff' },
  secondary: {
    background: '#edf2f7',
    color: '#334155'
  },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.2rem',
    marginBottom: '1rem'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(320px, 1.4fr)',
    gap: '1rem',
    alignItems: 'start'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.7rem',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    marginTop: '0.35rem'
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '0.8rem'
  },
  muted: { color: '#718096', fontSize: '0.9rem' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem'
  },
  cell: {
    padding: '0.8rem',
    borderBottom: '1px solid #edf2f7',
    textAlign: 'left',
    verticalAlign: 'middle'
  }
};

function formatDate(value) {
  if (!value) return '-';

  const datePart = String(value).slice(0, 10);
  const parts = datePart.split('-');

  if (parts.length !== 3) return datePart;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getErrorMessage(error) {
  return (
    error?.userMessage ||
    error?.response?.data?.message ||
    error?.message ||
    'Não foi possível concluir a operação.'
  );
}

function StatusValidity({ status }) {
  const vencida = status === 'VENCIDA';

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.3rem 0.6rem',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: 700,
        color: vencida ? '#991b1b' : '#166534',
        background: vencida ? '#fee2e2' : '#dcfce7'
      }}
    >
      {status || 'NÃO INFORMADO'}
    </span>
  );
}

export default function Prescriptions() {
  const [receitas, setReceitas] = useState([]);
  const [receitaSelecionada, setReceitaSelecionada] = useState(null);

  const [carregando, setCarregando] = useState(true);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const [crm, setCrm] = useState('');
  const [uf, setUf] = useState('');
  const [medicos, setMedicos] = useState([]);
  const [buscandoMedico, setBuscandoMedico] = useState(false);
  const [erroMedico, setErroMedico] = useState('');

  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [salvandoMedico, setSalvandoMedico] = useState(false);

  const [novoMedico, setNovoMedico] = useState({
    nome: '',
    crm: '',
    uf_crm: '',
    especialidade: ''
  });

  const carregarReceitas = useCallback(async () => {
    setCarregando(true);
    setErro('');
    setMensagem('');

    try {
      const response = await prescriptionsService.getPending();
      setReceitas(Array.isArray(response) ? response : []);
    } catch (error) {
      setErro(getErrorMessage(error));
      setReceitas([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarReceitas();
  }, [carregarReceitas]);

  const abrirDetalhes = async (id) => {
    setCarregandoDetalhes(true);
    setErro('');
    setReceitaSelecionada(null);

    try {
      const response = await prescriptionsService.getById(id);
      setReceitaSelecionada(response);
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const buscarMedico = async (event) => {
    event.preventDefault();

    if (!crm.trim()) {
      setErroMedico('Informe o CRM para realizar a busca.');
      return;
    }

    setBuscandoMedico(true);
    setErroMedico('');
    setMedicos([]);

    try {
      const response = await prescriptionsService.searchDoctors(
        crm.trim(),
        uf.trim().toUpperCase() || undefined
      );

      setMedicos(Array.isArray(response) ? response : []);

      if (!response?.length) {
        setErroMedico(
          'Nenhum médico encontrado no cadastro local. Isso não significa que o CRM seja inválido.'
        );
      }
    } catch (error) {
      setErroMedico(getErrorMessage(error));
    } finally {
      setBuscandoMedico(false);
    }
  };

  const atualizarCampoMedico = (event) => {
    const { name, value } = event.target;

    setNovoMedico((current) => ({
      ...current,
      [name]: name === 'uf_crm' ? value.toUpperCase() : value
    }));
  };

  const cadastrarMedico = async (event) => {
    event.preventDefault();
    setSalvandoMedico(true);
    setErroMedico('');

    try {
      const response = await prescriptionsService.createDoctor({
        nome: novoMedico.nome.trim(),
        crm: novoMedico.crm.trim(),
        uf_crm: novoMedico.uf_crm.trim().toUpperCase(),
        especialidade: novoMedico.especialidade.trim() || null
      });

      setMedicos((current) => [response, ...current]);
      setMostrarCadastro(false);
      setNovoMedico({
        nome: '',
        crm: '',
        uf_crm: '',
        especialidade: ''
      });
      setMensagem('Médico cadastrado com sucesso.');
    } catch (error) {
      setErroMedico(getErrorMessage(error));
    } finally {
      setSalvandoMedico(false);
    }
  };

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.title}>Balcão Farmacêutico</h2>
          <p style={styles.subtitle}>
            Consulta de prescrições e cadastro de médicos prescritores.
          </p>
        </div>

        <button
          type="button"
          style={{ ...styles.button, ...styles.secondary }}
          onClick={carregarReceitas}
          disabled={carregando}
        >
          {carregando ? 'Atualizando...' : 'Atualizar fila'}
        </button>
      </header>

      {erro && (
        <div
          role="alert"
          style={{
            ...styles.card,
            color: '#991b1b',
            background: '#fef2f2',
            borderColor: '#fecaca'
          }}
        >
          {erro}
        </div>
      )}

      {mensagem && (
        <div
          role="status"
          style={{
            ...styles.card,
            color: '#166534',
            background: '#f0fdf4',
            borderColor: '#bbf7d0'
          }}
        >
          {mensagem}
        </div>
      )}

      <section style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Fila de prescrições</h3>
        <p style={styles.muted}>
          {receitas.length} receita(s) válida(s) retornada(s) pelo backend.
        </p>

        {carregando ? (
          <p>Carregando prescrições...</p>
        ) : receitas.length === 0 ? (
          <p style={styles.muted}>
            Nenhuma receita válida encontrada.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {[
                    'Paciente',
                    'Prescritor',
                    'CRM',
                    'Data',
                    'Validade',
                    'Medicamentos',
                    'Detalhes'
                  ].map((heading) => (
                    <th key={heading} style={styles.cell}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {receitas.map((receita) => (
                  <tr key={receita.id_receita}>
                    <td style={styles.cell}>
                      {receita.cliente_nome || '-'}
                    </td>
                    <td style={styles.cell}>
                      {receita.nome_prescritor || '-'}
                    </td>
                    <td style={styles.cell}>
                      {receita.crm_prescritor || '-'}
                    </td>
                    <td style={styles.cell}>
                      {formatDate(receita.data_prescricao)}
                    </td>
                    <td style={styles.cell}>
                      <div>{formatDate(receita.validade_receita)}</div>
                      <StatusValidity status="VALIDA" />
                      <div style={styles.muted}>
                        {receita.dias_restantes} dia(s) restantes
                      </div>
                    </td>
                    <td style={styles.cell}>
                      {receita.medicamentos || '-'}
                    </td>
                    <td style={styles.cell}>
                      <button
                        type="button"
                        style={{ ...styles.button, ...styles.secondary }}
                        onClick={() => abrirDetalhes(receita.id_receita)}
                      >
                        Consultar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={styles.grid}>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Consultar CRM</h3>
          <p style={styles.muted}>
            Pesquisa médicos cadastrados no banco local do FarmaTech.
          </p>

          <form onSubmit={buscarMedico}>
            <label style={styles.label}>
              CRM
              <input
                style={styles.input}
                value={crm}
                onChange={(event) => setCrm(event.target.value)}
                placeholder="Número do CRM"
                required
              />
            </label>

            <label style={styles.label}>
              UF
              <input
                style={styles.input}
                value={uf}
                onChange={(event) => setUf(event.target.value.toUpperCase())}
                placeholder="Ex.: BA"
                maxLength={2}
              />
            </label>

            <button
              type="submit"
              style={{ ...styles.button, ...styles.primary }}
              disabled={buscandoMedico}
            >
              {buscandoMedico ? 'Buscando...' : 'Buscar médico'}
            </button>
          </form>

          {erroMedico && (
            <p role="status" style={{ color: '#b45309', fontSize: '0.85rem' }}>
              {erroMedico}
            </p>
          )}

          {medicos.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4>Resultados encontrados</h4>

              {medicos.map((medico) => (
                <div
                  key={medico.id_medico}
                  style={{
                    padding: '0.8rem 0',
                    borderBottom: '1px solid #edf2f7'
                  }}
                >
                  <strong>{medico.nome}</strong>
                  <div style={styles.muted}>
                    CRM {medico.crm}/{medico.uf_crm}
                  </div>
                  <div style={styles.muted}>
                    {medico.especialidade || 'Especialidade não informada'}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            style={{
              ...styles.button,
              ...styles.secondary,
              marginTop: '1rem'
            }}
            onClick={() => setMostrarCadastro((current) => !current)}
          >
            {mostrarCadastro ? 'Fechar cadastro' : 'Cadastrar médico'}
          </button>

          {mostrarCadastro && (
            <form onSubmit={cadastrarMedico} style={{ marginTop: '1rem' }}>
              <h4>Novo médico</h4>

              <label style={styles.label}>
                Nome completo
                <input
                  style={styles.input}
                  name="nome"
                  value={novoMedico.nome}
                  onChange={atualizarCampoMedico}
                  required
                />
              </label>

              <label style={styles.label}>
                CRM
                <input
                  style={styles.input}
                  name="crm"
                  value={novoMedico.crm}
                  onChange={atualizarCampoMedico}
                  required
                />
              </label>

              <label style={styles.label}>
                UF do CRM
                <input
                  style={styles.input}
                  name="uf_crm"
                  value={novoMedico.uf_crm}
                  onChange={atualizarCampoMedico}
                  maxLength={2}
                  required
                />
              </label>

              <label style={styles.label}>
                Especialidade
                <input
                  style={styles.input}
                  name="especialidade"
                  value={novoMedico.especialidade}
                  onChange={atualizarCampoMedico}
                />
              </label>

              <button
                type="submit"
                style={{ ...styles.button, ...styles.primary }}
                disabled={salvandoMedico}
              >
                {salvandoMedico ? 'Salvando...' : 'Salvar médico'}
              </button>
            </form>
          )}
        </div>

        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Detalhes da receita</h3>

          {carregandoDetalhes ? (
            <p>Carregando detalhes...</p>
          ) : !receitaSelecionada ? (
            <p style={styles.muted}>
              Selecione uma receita na fila para consultar seus detalhes.
            </p>
          ) : (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Receita #{receitaSelecionada.id_receita}</strong>
                <div style={styles.muted}>
                  Paciente: {receitaSelecionada.cliente_nome || '-'}
                </div>
                <div style={styles.muted}>
                  Prescritor: {receitaSelecionada.nome_prescritor || '-'}
                </div>
                <div style={styles.muted}>
                  CRM: {receitaSelecionada.crm_prescritor || '-'}
                </div>
                <div style={styles.muted}>
                  Data da prescrição:{' '}
                  {formatDate(receitaSelecionada.data_prescricao)}
                </div>
                <div style={styles.muted}>
                  Validade: {formatDate(receitaSelecionada.validade_receita)}
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <StatusValidity status={receitaSelecionada.status_validade} />
                </div>
              </div>

              <h4>Medicamentos prescritos</h4>

              {!receitaSelecionada.itens?.length ? (
                <p style={styles.muted}>
                  Nenhum item encontrado nesta receita.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.cell}>Medicamento</th>
                        <th style={styles.cell}>Quantidade</th>
                        <th style={styles.cell}>Posologia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receitaSelecionada.itens.map((item) => (
                        <tr key={item.id_receita_item}>
                          <td style={styles.cell}>
                            {item.produto_descricao}
                          </td>
                          <td style={styles.cell}>{item.quantidade}</td>
                          <td style={styles.cell}>
                            {item.posologia || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ marginTop: '1rem' }}>
                <strong>Observações</strong>
                <p style={styles.muted}>
                  {receitaSelecionada.observacoes || 'Nenhuma observação.'}
                </p>
              </div>

              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.9rem',
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: '8px',
                  color: '#9a3412',
                  fontSize: '0.85rem'
                }}
              >
                A aprovação ainda não está disponível: o backend não possui
                persistência de status para essa operação. A validade da
                receita não representa uma aprovação farmacêutica.
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
