
import React, { useCallback, useEffect, useState } from 'react';
import purchasesService from '../../services/purchases.service';
import inventoryService from '../../services/inventory.service';

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
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.2rem',
    marginBottom: '1rem'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem'
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
  button: {
    border: 0,
    borderRadius: '8px',
    padding: '0.7rem 1rem',
    cursor: 'pointer',
    fontWeight: 600
  },
  primary: { background: '#b91c1c', color: '#fff' },
  secondary: { background: '#edf2f7', color: '#334155' },
  danger: { background: '#fee2e2', color: '#991b1b' },
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
  },
  muted: { color: '#718096', fontSize: '0.9rem' }
};

function getErrorMessage(error) {
  return (
    error?.userMessage ||
    error?.response?.data?.message ||
    error?.message ||
    'Não foi possível concluir a operação.'
  );
}

function formatCurrency(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return '-';

  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDate(value) {
  if (!value) return '-';

  const parts = String(value).slice(0, 10).split('-');

  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function emptyItem() {
  return {
    id_produto: '',
    quantidade: '1',
    preco_unitario: ''
  };
}

function emptyLot(productId = '') {
  return {
    id_produto: String(productId),
    numero_lote: '',
    data_validade: '',
    quantidade: '',
    data_fabricacao: '',
    preco_custo_lote: ''
  };
}

function validarQuantidadesRecebidas(itens, lotes) {
  const compradas = new Map();
  const recebidas = new Map();

  for (const item of itens) {
    const id = Number(item.id_produto);

    compradas.set(
      id,
      (compradas.get(id) || 0) + Number(item.quantidade)
    );
  }

  for (const lote of lotes) {
    const id = Number(lote.id_produto);

    recebidas.set(
      id,
      (recebidas.get(id) || 0) + Number(lote.quantidade)
    );
  }

  for (const [id, quantidadeComprada] of compradas) {
    const quantidadeRecebida = recebidas.get(id) || 0;

    if (Math.abs(quantidadeComprada - quantidadeRecebida) > 1e-9) {
      return {
        valido: false,
        mensagem:
          `O produto ${id} possui quantidade comprada de ` +
          `${quantidadeComprada}, mas recebida de ${quantidadeRecebida}.`
      };
    }
  }

  return { valido: true };
}

export default function Purchases() {
  const [compras, setCompras] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [novaCompra, setNovaCompra] = useState({
    id_fornecedor: '',
    numero_nf: '',
    itens: [emptyItem()]
  });

  const [compraSelecionada, setCompraSelecionada] = useState(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  const [mostrarRecebimento, setMostrarRecebimento] = useState(false);
  const [lotes, setLotes] = useState([]);
  const [recebendo, setRecebendo] = useState(false);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro('');

    const resultados = await Promise.allSettled([
      purchasesService.listPurchases(),
      inventoryService.getSuppliers(),
      inventoryService.listProducts()
    ]);

    const [comprasResult, fornecedoresResult, produtosResult] = resultados;

    if (comprasResult.status === 'fulfilled') {
      setCompras(
        Array.isArray(comprasResult.value) ? comprasResult.value : []
      );
    } else {
      setErro(getErrorMessage(comprasResult.reason));
    }

    if (fornecedoresResult.status === 'fulfilled') {
      setFornecedores(
        Array.isArray(fornecedoresResult.value)
          ? fornecedoresResult.value
          : []
      );
    } else {
      setErro((current) =>
        current || `Não foi possível carregar fornecedores: ${
          getErrorMessage(fornecedoresResult.reason)
        }`
      );
    }

    if (produtosResult.status === 'fulfilled') {
      setProdutos(
        Array.isArray(produtosResult.value) ? produtosResult.value : []
      );
    } else {
      setErro((current) =>
        current || `Não foi possível carregar produtos: ${
          getErrorMessage(produtosResult.reason)
        }`
      );
    }

    setCarregando(false);
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const atualizarItem = (index, field, value) => {
    setNovaCompra((current) => ({
      ...current,
      itens: current.itens.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item
      )
    }));
  };

  const adicionarItem = () => {
    setNovaCompra((current) => ({
      ...current,
      itens: [...current.itens, emptyItem()]
    }));
  };

  const removerItem = (index) => {
    setNovaCompra((current) => ({
      ...current,
      itens: current.itens.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const registrarCompra = async (event) => {
    event.preventDefault();
    setErro('');
    setMensagem('');

    const itensInvalidos = novaCompra.itens.some((item) => {
      return (
        !item.id_produto ||
        !Number.isSafeInteger(Number(item.quantidade)) ||
        Number(item.quantidade) <= 0 ||
        item.preco_unitario === '' ||
        !Number.isFinite(Number(item.preco_unitario)) ||
        Number(item.preco_unitario) < 0
      );
    });

    if (!novaCompra.id_fornecedor || !novaCompra.numero_nf.trim()) {
      setErro('Informe o fornecedor e o número da nota fiscal.');
      return;
    }

    if (itensInvalidos) {
      setErro('Verifique os produtos, quantidades e preços dos itens.');
      return;
    }

    setSalvando(true);

    try {
      await purchasesService.createPurchase({
        id_fornecedor: Number(novaCompra.id_fornecedor),
        numero_nf: novaCompra.numero_nf.trim(),
        itens: novaCompra.itens.map((item) => ({
          id_produto: Number(item.id_produto),
          quantidade: Number(item.quantidade),
          preco_unitario: Number(item.preco_unitario)
        }))
      });

      setMensagem('Compra registrada com sucesso. Ela está pendente de recebimento.');
      setNovaCompra({
        id_fornecedor: '',
        numero_nf: '',
        itens: [emptyItem()]
      });
      setMostrarFormulario(false);

      await carregarDados();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  };

  const consultarCompra = async (id) => {
    setErro('');
    setMensagem('');
    setCarregandoDetalhes(true);
    setCompraSelecionada(null);
    setMostrarRecebimento(false);

    try {
      const response = await purchasesService.getPurchaseById(id);
      setCompraSelecionada(response);
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const iniciarRecebimento = () => {
    const itens = compraSelecionada?.itens;

    if (!Array.isArray(itens) || itens.length === 0) {
      setErro(
        'Não foi possível identificar os itens desta compra. Confira o retorno do backend.'
      );
      return;
    }

    setLotes(
      itens.map((item) => emptyLot(item.id_produto))
    );

    setMostrarRecebimento(true);
    setErro('');
  };

  const atualizarLote = (index, field, value) => {
    setLotes((current) =>
      current.map((lote, loteIndex) =>
        loteIndex === index
          ? { ...lote, [field]: value }
          : lote
      )
    );
  };

  const confirmarRecebimento = async (event) => {
    event.preventDefault();

    if (!compraSelecionada?.id_compra) return;

    const lotesInvalidos = lotes.some((lote) => {
      return (
        !lote.id_produto ||
        !lote.numero_lote.trim() ||
        !lote.data_validade ||
        !Number.isSafeInteger(Number(lote.quantidade)) ||
        Number(lote.quantidade) <= 0 ||
        (lote.data_fabricacao &&
          lote.data_fabricacao > lote.data_validade) ||
        (lote.preco_custo_lote !== '' &&
          (!Number.isFinite(Number(lote.preco_custo_lote)) ||
            Number(lote.preco_custo_lote) < 0))
      );
    });

    if (lotesInvalidos) {
      setErro('Preencha corretamente os dados de todos os lotes.');
      return;
    }

    setRecebendo(true);
    setErro('');
    setMensagem('');

    try {
      await purchasesService.receivePurchase(
        compraSelecionada.id_compra,
        {
          lotes: lotes.map((lote) => ({
            id_produto: Number(lote.id_produto),
            numero_lote: lote.numero_lote.trim(),
            data_validade: lote.data_validade,
            quantidade: Number(lote.quantidade),
            ...(lote.data_fabricacao
              ? { data_fabricacao: lote.data_fabricacao }
              : {}),
            ...(lote.preco_custo_lote !== ''
              ? { preco_custo_lote: Number(lote.preco_custo_lote) }
              : {})
          }))
        }
      );

      setMensagem('Recebimento registrado com sucesso.');
      setMostrarRecebimento(false);

      await consultarCompra(compraSelecionada.id_compra);
      await carregarDados();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setRecebendo(false);
    }
  };

  const statusCompra = (status) => {
    const recebida = status === 'RECEBIDA';

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0.3rem 0.6rem',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: recebida ? '#166534' : '#92400e',
          background: recebida ? '#dcfce7' : '#fef3c7'
        }}
      >
        {status || 'STATUS NÃO INFORMADO'}
      </span>
    );
  };

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.title}>Compras e Notas Fiscais</h2>
          <p style={styles.subtitle}>
            Registro de compras, recebimento de mercadorias e lotes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            style={{ ...styles.button, ...styles.secondary }}
            onClick={carregarDados}
            disabled={carregando}
          >
            Atualizar
          </button>

          <button
            type="button"
            style={{ ...styles.button, ...styles.primary }}
            onClick={() => {
              setMostrarFormulario((current) => !current);
              setCompraSelecionada(null);
              setMostrarRecebimento(false);
              setErro('');
            }}
          >
            {mostrarFormulario ? 'Fechar formulário' : 'Nova compra'}
          </button>
        </div>
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

      {mostrarFormulario && (
        <section style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Registrar nova compra</h3>

          <form onSubmit={registrarCompra}>
            <div style={styles.grid}>
              <label style={styles.label}>
                Fornecedor
                <select
                  style={styles.input}
                  value={novaCompra.id_fornecedor}
                  onChange={(event) =>
                    setNovaCompra((current) => ({
                      ...current,
                      id_fornecedor: event.target.value
                    }))
                  }
                  required
                >
                  <option value="">Selecione um fornecedor</option>
                  {fornecedores.map((fornecedor) => (
                    <option
                      key={fornecedor.id_fornecedor}
                      value={fornecedor.id_fornecedor}
                    >
                      {fornecedor.nome || fornecedor.razao_social ||
                        `Fornecedor #${fornecedor.id_fornecedor}`}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.label}>
                Número da nota fiscal
                <input
                  style={styles.input}
                  value={novaCompra.numero_nf}
                  onChange={(event) =>
                    setNovaCompra((current) => ({
                      ...current,
                      numero_nf: event.target.value
                    }))
                  }
                  placeholder="Número da NF"
                  required
                />
              </label>
            </div>

            <h4>Itens da compra</h4>

            {novaCompra.itens.map((item, index) => (
              <div
                key={index}
                style={{
                  ...styles.grid,
                  padding: '1rem',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  marginBottom: '0.8rem'
                }}
              >
                <label style={styles.label}>
                  Produto
                  <select
                    style={styles.input}
                    value={item.id_produto}
                    onChange={(event) =>
                      atualizarItem(index, 'id_produto', event.target.value)
                    }
                    required
                  >
                    <option value="">Selecione um produto</option>
                    {produtos.map((produto) => (
                      <option
                        key={produto.id_produto}
                        value={produto.id_produto}
                      >
                        {produto.descricao}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={styles.label}>
                  Quantidade
                  <input
                    style={styles.input}
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantidade}
                    onChange={(event) =>
                      atualizarItem(index, 'quantidade', event.target.value)
                    }
                    required
                  />
                </label>

                <label style={styles.label}>
                  Preço unitário (R$)
                  <input
                    style={styles.input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.preco_unitario}
                    onChange={(event) =>
                      atualizarItem(index, 'preco_unitario', event.target.value)
                    }
                    required
                  />
                </label>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    type="button"
                    style={{ ...styles.button, ...styles.danger }}
                    onClick={() => removerItem(index)}
                    disabled={novaCompra.itens.length === 1}
                  >
                    Remover item
                  </button>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                style={{ ...styles.button, ...styles.secondary }}
                onClick={adicionarItem}
              >
                Adicionar produto
              </button>

              <button
                type="submit"
                style={{ ...styles.button, ...styles.primary }}
                disabled={salvando}
              >
                {salvando ? 'Registrando...' : 'Registrar compra'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Histórico de compras</h3>

        {carregando ? (
          <p>Carregando compras...</p>
        ) : compras.length === 0 ? (
          <p style={styles.muted}>Nenhuma compra encontrada.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.cell}>Código</th>
                  <th style={styles.cell}>Fornecedor</th>
                  <th style={styles.cell}>Nota fiscal</th>
                  <th style={styles.cell}>Status</th>
                  <th style={styles.cell}>Ações</th>
                </tr>
              </thead>

              <tbody>
                {compras.map((compra) => (
                  <tr key={compra.id_compra}>
                    <td style={styles.cell}>#{compra.id_compra}</td>
                    <td style={styles.cell}>
                      {compra.fornecedor_nome ||
                        `Fornecedor #${compra.id_fornecedor}`}
                    </td>
                    <td style={styles.cell}>
                      {compra.numero_nf || '-'}
                    </td>
                    <td style={styles.cell}>
                      {statusCompra(compra.status_compra)}
                    </td>
                    <td style={styles.cell}>
                      <button
                        type="button"
                        style={{ ...styles.button, ...styles.secondary }}
                        onClick={() => consultarCompra(compra.id_compra)}
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

      {carregandoDetalhes && (
        <section style={styles.card}>
          <p>Carregando detalhes da compra...</p>
        </section>
      )}

      {compraSelecionada && (
        <section style={styles.card}>
          <div style={styles.header}>
            <div>
              <h3 style={{ margin: 0 }}>
                Compra #{compraSelecionada.id_compra}
              </h3>
              <p style={styles.subtitle}>
                Nota fiscal: {compraSelecionada.numero_nf || '-'}
              </p>
            </div>

            {statusCompra(compraSelecionada.status)}
          </div>

          <h4>Itens registrados</h4>

          {!compraSelecionada.itens?.length ? (
            <p style={styles.muted}>
              Nenhum item foi retornado nos detalhes desta compra.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.cell}>Produto</th>
                    <th style={styles.cell}>Quantidade</th>
                    <th style={styles.cell}>Preço unitário</th>
                  </tr>
                </thead>
                <tbody>
                  {compraSelecionada.itens.map((item, index) => (
                    <tr key={item.id_produto || index}>
                      <td style={styles.cell}>
                        {item.produto_descricao || item.descricao ||
                          `Produto #${item.id_produto}`}
                      </td>
                      <td style={styles.cell}>{item.quantidade}</td>
                      <td style={styles.cell}>
                        {formatCurrency(item.preco_unitario)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(compraSelecionada.lotes_gerados) &&
            compraSelecionada.lotes_gerados.length > 0 && (
              <>
                <h4>Lotes recebidos</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.cell}>Produto</th>
                        <th style={styles.cell}>Número do lote</th>
                        <th style={styles.cell}>Validade</th>
                        <th style={styles.cell}>Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compraSelecionada.lotes_gerados.map((lote, index) => (
                        <tr key={lote.id_lote || index}>
                          <td style={styles.cell}>
                            {lote.produto_descricao ||
                              `Produto #${lote.id_produto}`}
                          </td>
                          <td style={styles.cell}>{lote.numero_lote}</td>
                          <td style={styles.cell}>
                            {formatDate(lote.data_validade)}
                          </td>
                          <td style={styles.cell}>{lote.quantidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

          {compraSelecionada.status === 'PENDENTE' && (
            <button
              type="button"
              style={{
                ...styles.button,
                ...styles.primary,
                marginTop: '1rem'
              }}
              onClick={iniciarRecebimento}
            >
              Receber mercadorias
            </button>
          )}

          {mostrarRecebimento && (
            <form
              onSubmit={confirmarRecebimento}
              style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: '#f8fafc',
                borderRadius: '10px'
              }}
            >
              <h4 style={{ marginTop: 0 }}>Recebimento de mercadorias</h4>
              <p style={styles.muted}>
                Informe os dados dos lotes recebidos para cada produto.
              </p>

              {lotes.map((lote, index) => {
                const produto = produtos.find(
                  (item) =>
                    Number(item.id_produto) === Number(lote.id_produto)
                );

                return (
                  <div
                    key={index}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      padding: '1rem 0'
                    }}
                  >
                    <strong>
                      {produto?.descricao || `Produto #${lote.id_produto}`}
                    </strong>

                    <div style={styles.grid}>
                      <label style={styles.label}>
                        Número do lote
                        <input
                          style={styles.input}
                          value={lote.numero_lote}
                          onChange={(event) =>
                            atualizarLote(index, 'numero_lote', event.target.value)
                          }
                          required
                        />
                      </label>

                      <label style={styles.label}>
                        Quantidade recebida
                        <input
                          style={styles.input}
                          type="number"
                          min="1"
                          step="1"
                          value={lote.quantidade}
                          onChange={(event) =>
                            atualizarLote(index, 'quantidade', event.target.value)
                          }
                          required
                        />
                      </label>

                      <label style={styles.label}>
                        Data de validade
                        <input
                          style={styles.input}
                          type="date"
                          value={lote.data_validade}
                          onChange={(event) =>
                            atualizarLote(index, 'data_validade', event.target.value)
                          }
                          required
                        />
                      </label>

                      <label style={styles.label}>
                        Data de fabricação (opcional)
                        <input
                          style={styles.input}
                          type="date"
                          value={lote.data_fabricacao}
                          onChange={(event) =>
                            atualizarLote(index, 'data_fabricacao', event.target.value)
                          }
                        />
                      </label>

                      <label style={styles.label}>
                        Custo do lote (opcional)
                        <input
                          style={styles.input}
                          type="number"
                          min="0"
                          step="0.01"
                          value={lote.preco_custo_lote}
                          onChange={(event) =>
                            atualizarLote(index, 'preco_custo_lote', event.target.value)
                          }
                        />
                      </label>
                    </div>
                  </div>
                );
              })}

              <div
                style={{
                  display: 'flex',
                  gap: '0.7rem',
                  flexWrap: 'wrap',
                  marginTop: '1rem'
                }}
              >
                <button
                  type="submit"
                  style={{ ...styles.button, ...styles.primary }}
                  disabled={recebendo}
                >
                  {recebendo ? 'Registrando recebimento...' : 'Confirmar recebimento'}
                </button>

                <button
                  type="button"
                  style={{ ...styles.button, ...styles.secondary }}
                  onClick={() => setMostrarRecebimento(false)}
                  disabled={recebendo}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </main>
  );
}
