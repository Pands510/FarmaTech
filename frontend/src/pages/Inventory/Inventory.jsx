
import React, { useCallback, useEffect, useState } from 'react';

import inventoryService from '../../services/inventory.service';
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

function money(value) {
  const parsed = Number(value);
  return currencyFormatter.format(Number.isFinite(parsed) ? parsed : 0);
}

function formatDate(value) {
  if (!value) return '-';

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString('pt-BR');
}

// Aceita tanto arrays diretos quanto respostas envelopadas.
function extractRows(response, keys = []) {
  if (Array.isArray(response)) return response;

  if (!response || typeof response !== 'object') return [];

  for (const key of keys) {
    if (Array.isArray(response[key])) return response[key];
  }

  return [];
}

const initialEntry = {
  id_produto: '',
  id_fornecedor: '',
  numero_lote: '',
  data_fabricacao: '',
  data_validade: '',
  quantidade: '',
  preco_custo_lote: '',
  motivo: ''
};

const initialDischarge = {
  id_produto: '',
  id_lote: '',
  quantidade: '',
  motivo: '',
  observacao: ''
};

export default function Inventory() {
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [movimentos, setMovimentos] = useState([]);

  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [categorias, setCategorias] = useState([]);

  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [lotes, setLotes] = useState([]);

  const [modalEntrada, setModalEntrada] = useState(false);
  const [modalBaixa, setModalBaixa] = useState(false);

  const [entrada, setEntrada] = useState(initialEntry);
  const [baixa, setBaixa] = useState(initialDischarge);

  const [filtroMovimento, setFiltroMovimento] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [carregandoLotes, setCarregandoLotes] = useState(false);
  const [operando, setOperando] = useState(false);

  const [erro, setErro] = useState('');
  const [erroMovimentos, setErroMovimentos] = useState('');
  const [mensagem, setMensagem] = useState('');

  const carregarProdutos = useCallback(async () => {
    const response = await inventoryService.listProducts({
      busca: busca.trim() || undefined,
      categoria: filtroCategoria || undefined
    });

    setProdutos(
      extractRows(response, ['produtos', 'data', 'results'])
    );
  }, [busca, filtroCategoria]);

  const carregarFornecedores = useCallback(async () => {
    const response = await inventoryService.getSuppliers();

    setFornecedores(
      extractRows(response, ['fornecedores', 'data'])
    );
  }, []);

  const carregarCategorias = useCallback(async () => {
    const response = await inventoryService.getCategories();

    setCategorias(
      extractRows(response, ['categorias', 'data'])
    );
  }, []);

  const carregarMovimentos = useCallback(async () => {
    try {
      setErroMovimentos('');

      const response = await inventoryService.getMovements({
        id_produto: filtroMovimento || undefined,
        limite: 50
      });

      setMovimentos(
        extractRows(response, ['movimentos', 'data'])
      );
    } catch (error) {
      setErroMovimentos(
        error.userMessage || 'Não foi possível carregar as movimentações.'
      );
    }
  }, [filtroMovimento]);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro('');

    try {
      await Promise.all([
        carregarProdutos(),
        carregarFornecedores(),
        carregarCategorias()
      ]);
    } catch (error) {
      setErro(
        error.userMessage ||
        'Não foi possível carregar os dados do estoque.'
      );
    } finally {
      setCarregando(false);
    }

    await carregarMovimentos();
  }, [
    carregarProdutos,
    carregarFornecedores,
    carregarCategorias,
    carregarMovimentos
  ]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  async function selecionarProduto(produto) {
    setProdutoSelecionado(produto);
    setCarregandoLotes(true);
    setLotes([]);
    setErro('');

    try {
      const response = await inventoryService.getLotesFifo(
        produto.id_produto
      );

      setLotes(
        extractRows(response, ['lotes', 'data'])
      );
    } catch (error) {
      setErro(
        error.userMessage ||
        'Não foi possível consultar os lotes deste produto.'
      );
    } finally {
      setCarregandoLotes(false);
    }
  }

  function abrirEntrada(produto = null) {
    setErro('');
    setMensagem('');

    setEntrada({
      ...initialEntry,
      id_produto: produto?.id_produto
        ? String(produto.id_produto)
        : ''
    });

    setModalEntrada(true);
  }

  function abrirBaixa(produto = null, lote = null) {
    setErro('');
    setMensagem('');

    setBaixa({
      ...initialDischarge,
      id_produto: produto?.id_produto
        ? String(produto.id_produto)
        : '',
      id_lote: lote?.id_lote
        ? String(lote.id_lote)
        : ''
    });

    setModalBaixa(true);
  }

  async function handleEntrada(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');

    if (
      !entrada.id_produto ||
      !entrada.id_fornecedor ||
      !entrada.numero_lote.trim() ||
      !entrada.data_validade ||
      !entrada.quantidade
    ) {
      setErro('Preencha todos os campos obrigatórios da entrada.');
      return;
    }

    if (
      entrada.data_fabricacao &&
      entrada.data_fabricacao >= entrada.data_validade
    ) {
      setErro('A fabricação deve ocorrer antes da validade.');
      return;
    }

    const quantidade = Number(entrada.quantidade);
    const custo = entrada.preco_custo_lote === ''
      ? undefined
      : Number(entrada.preco_custo_lote);

    if (!Number.isSafeInteger(quantidade) || quantidade <= 0) {
      setErro('A quantidade deve ser um número inteiro positivo.');
      return;
    }

    if (
      custo !== undefined &&
      (!Number.isFinite(custo) || custo < 0)
    ) {
      setErro('Informe um preço de custo válido.');
      return;
    }

    try {
      setOperando(true);

      await inventoryService.registerBatchEntry({
        id_produto: Number(entrada.id_produto),
        id_fornecedor: Number(entrada.id_fornecedor),
        numero_lote: entrada.numero_lote.trim(),
        data_validade: entrada.data_validade,
        quantidade,
        ...(entrada.data_fabricacao && {
          data_fabricacao: entrada.data_fabricacao
        }),
        ...(custo !== undefined && {
          preco_custo_lote: custo
        }),
        ...(entrada.motivo.trim() && {
          motivo: entrada.motivo.trim()
        })
      });

      setModalEntrada(false);
      setEntrada(initialEntry);
      setMensagem('Entrada de estoque registrada com sucesso.');

      await carregarProdutos();
      await carregarMovimentos();

      if (produtoSelecionado?.id_produto === Number(entrada.id_produto)) {
        await selecionarProduto(produtoSelecionado);
      }
    } catch (error) {
      setErro(
        error.userMessage || 'Não foi possível registrar a entrada.'
      );
    } finally {
      setOperando(false);
    }
  }

  async function handleBaixa(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');

    const quantidade = Number(baixa.quantidade);

    if (
      !baixa.id_produto ||
      !baixa.id_lote ||
      !baixa.motivo.trim()
    ) {
      setErro('Informe o produto, o lote e o motivo da baixa.');
      return;
    }

    if (!Number.isSafeInteger(quantidade) || quantidade <= 0) {
      setErro('A quantidade deve ser um número inteiro positivo.');
      return;
    }

    try {
      setOperando(true);

      const resultado = await inventoryService.manualDischarge({
        id_produto: Number(baixa.id_produto),
        id_lote: Number(baixa.id_lote),
        quantidade,
        motivo: baixa.motivo.trim(),
        ...(baixa.observacao.trim() && {
          observacao: baixa.observacao.trim()
        })
      });

      setModalBaixa(false);
      setBaixa(initialDischarge);

      setMensagem(
        `Baixa registrada. Saldo restante do lote: ${
          resultado.saldo_restante_lote ?? '-'
        }.`
      );

      await carregarProdutos();
      await carregarMovimentos();

      if (produtoSelecionado?.id_produto === Number(baixa.id_produto)) {
        await selecionarProduto(produtoSelecionado);
      }
    } catch (error) {
      setErro(
        error.userMessage || 'Não foi possível registrar a baixa.'
      );
    } finally {
      setOperando(false);
    }
  }

  function atualizarEntrada(campo, valor) {
    setEntrada(previous => ({
      ...previous,
      [campo]: valor
    }));
  }

  function atualizarBaixa(campo, valor) {
    setBaixa(previous => ({
      ...previous,
      [campo]: valor
    }));
  }

  function nomeProduto(produto) {
    return produto.descricao || produto.nome || 'Produto sem descrição';
  }

  if (carregando) {
    return (
      <main style={styles.container}>
        <p>Carregando estoque...</p>
      </main>
    );
  }

  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestão de Estoque</h1>
          <p style={styles.subtitle}>
            Controle de produtos, lotes e movimentações.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={() => abrirEntrada()}
            style={styles.primaryButton}
          >
            + Registrar entrada
          </button>

          <button
            type="button"
            onClick={carregarDados}
            style={styles.secondaryButton}
          >
            Atualizar
          </button>
        </div>
      </header>

      {erro && (
        <div role="alert" style={styles.errorBox}>
          {erro}
        </div>
      )}

      {mensagem && (
        <div role="status" style={styles.successBox}>
          {mensagem}
        </div>
      )}

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Produtos cadastrados</h2>
            <p style={styles.description}>
              Consulte o estoque e selecione um produto para visualizar seus lotes.
            </p>
          </div>
        </div>

        <div style={styles.filters}>
          <input
            type="search"
            value={busca}
            onChange={event => setBusca(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') carregarProdutos();
            }}
            placeholder="Pesquisar produto..."
            style={styles.input}
          />

          <select
            value={filtroCategoria}
            onChange={event => setFiltroCategoria(event.target.value)}
            style={styles.input}
          >
            <option value="">Todas as categorias</option>

            {categorias.map((categoria, index) => {
              const value = typeof categoria === 'object'
                ? categoria.id_categoria ?? categoria.nome ?? categoria.categoria
                : categoria;

              const label = typeof categoria === 'object'
                ? categoria.nome ?? categoria.categoria ?? String(value)
                : categoria;

              return (
                <option key={index} value={value}>
                  {label}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            onClick={carregarProdutos}
            style={styles.secondaryButton}
          >
            Pesquisar
          </button>
        </div>

        {produtos.length === 0 ? (
          <p style={styles.emptyMessage}>
            Nenhum produto encontrado.
          </p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Produto</th>
                  <th style={styles.th}>Categoria</th>
                  <th style={styles.th}>Preço de venda</th>
                  <th style={styles.th}>Estoque</th>
                  <th style={styles.th}>Estoque mínimo</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Ações</th>
                </tr>
              </thead>

              <tbody>
                {produtos.map(produto => (
                  <tr key={produto.id_produto}>
                    <td style={styles.td}>
                      <strong>{nomeProduto(produto)}</strong>
                      {produto.codigo_barras && (
                        <small style={styles.secondaryText}>
                          {produto.codigo_barras}
                        </small>
                      )}
                    </td>

                    <td style={styles.td}>
                      {produto.categoria || produto.nome_categoria || '-'}
                    </td>

                    <td style={styles.td}>
                      {money(produto.preco_venda)}
                    </td>

                    <td style={styles.td}>
                      <strong
                        style={
                          Number(produto.estoque_atual) <=
                          Number(produto.estoque_minimo)
                            ? styles.dangerText
                            : {}
                        }
                      >
                        {Number(produto.estoque_atual) || 0}
                      </strong>
                    </td>

                    <td style={styles.td}>
                      {Number(produto.estoque_minimo) || 0}
                    </td>

                    <td style={styles.td}>
                      {produto.ativo === false ||
                      produto.status === 'INATIVO'
                        ? 'Inativo'
                        : 'Ativo'}
                    </td>

                    <td style={styles.td}>
                      <div style={styles.actionGroup}>
                        <button
                          type="button"
                          onClick={() => selecionarProduto(produto)}
                          style={styles.smallButton}
                        >
                          Lotes
                        </button>

                        <button
                          type="button"
                          onClick={() => abrirEntrada(produto)}
                          style={styles.smallButton}
                        >
                          Entrada
                        </button>

                        <button
                          type="button"
                          onClick={() => abrirBaixa(produto)}
                          style={styles.smallDangerButton}
                        >
                          Baixa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {produtoSelecionado && (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Lotes FIFO</h2>
              <p style={styles.description}>
                {nomeProduto(produtoSelecionado)} — lotes disponíveis
                ordenados conforme a consulta FIFO do backend.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setProdutoSelecionado(null)}
              style={styles.secondaryButton}
            >
              Fechar detalhes
            </button>
          </div>

          {carregandoLotes ? (
            <p>Consultando lotes...</p>
          ) : lotes.length === 0 ? (
            <p style={styles.emptyMessage}>
              Nenhum lote disponível para este produto.
            </p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Lote</th>
                    <th style={styles.th}>Fabricação</th>
                    <th style={styles.th}>Validade</th>
                    <th style={styles.th}>Quantidade</th>
                    <th style={styles.th}>Custo</th>
                    <th style={styles.th}>Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {lotes.map(lote => (
                    <tr key={lote.id_lote}>
                      <td style={styles.td}>
                        {lote.numero_lote || '-'}
                      </td>

                      <td style={styles.td}>
                        {formatDate(lote.data_fabricacao)}
                      </td>

                      <td style={styles.td}>
                        {formatDate(lote.data_validade)}
                      </td>

                      <td style={styles.td}>
                        {Number(lote.quantidade) || 0}
                      </td>

                      <td style={styles.td}>
                        {money(lote.preco_custo_lote)}
                      </td>

                      <td style={styles.td}>
                        <button
                          type="button"
                          onClick={() => abrirBaixa(produtoSelecionado, lote)}
                          style={styles.smallDangerButton}
                        >
                          Baixa manual
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Movimentações de estoque</h2>
            <p style={styles.description}>
              Últimas 50 movimentações registradas.
            </p>
          </div>

          <select
            value={filtroMovimento}
            onChange={event => setFiltroMovimento(event.target.value)}
            style={styles.input}
          >
            <option value="">Todos os produtos</option>

            {produtos.map(produto => (
              <option
                key={produto.id_produto}
                value={produto.id_produto}
              >
                {nomeProduto(produto)}
              </option>
            ))}
          </select>
        </div>

        {erroMovimentos && (
          <div role="alert" style={styles.errorBox}>
            {erroMovimentos}
          </div>
        )}

        {!erroMovimentos && movimentos.length === 0 ? (
          <p style={styles.emptyMessage}>
            Nenhuma movimentação encontrada.
          </p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Data</th>
                  <th style={styles.th}>Produto</th>
                  <th style={styles.th}>Lote</th>
                  <th style={styles.th}>Tipo</th>
                  <th style={styles.th}>Quantidade</th>
                  <th style={styles.th}>Responsável</th>
                  <th style={styles.th}>Motivo</th>
                </tr>
              </thead>

              <tbody>
                {movimentos.map(item => (
                  <tr key={item.id_movimento}>
                    <td style={styles.td}>
                      {formatDate(item.data_movimentacao)}
                    </td>

                    <td style={styles.td}>
                      {item.produto_descricao || '-'}
                    </td>

                    <td style={styles.td}>
                      {item.numero_lote || '-'}
                    </td>

                    <td style={styles.td}>
                      {item.tipo_movimento || '-'}
                    </td>

                    <td style={styles.td}>
                      {Number(item.quantidade_movimentada) || 0}
                    </td>

                    <td style={styles.td}>
                      {item.funcionario_nome || '-'}
                    </td>

                    <td style={styles.td}>
                      {item.motivo || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalEntrada && (
        <div style={styles.modalOverlay}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="entradaTitle"
            style={styles.modal}
          >
            <h2 id="entradaTitle" style={styles.sectionTitle}>
              Registrar entrada de estoque
            </h2>

            <form onSubmit={handleEntrada}>
              <label style={styles.label}>Produto *</label>
              <select
                required
                value={entrada.id_produto}
                onChange={event => atualizarEntrada('id_produto', event.target.value)}
                style={styles.input}
              >
                <option value="">Selecione um produto</option>

                {produtos.map(produto => (
                  <option
                    key={produto.id_produto}
                    value={produto.id_produto}
                  >
                    {nomeProduto(produto)}
                  </option>
                ))}
              </select>

              <label style={styles.label}>Fornecedor *</label>
              <select
                required
                value={entrada.id_fornecedor}
                onChange={event => atualizarEntrada('id_fornecedor', event.target.value)}
                style={styles.input}
              >
                <option value="">Selecione um fornecedor</option>

                {fornecedores.map(fornecedor => (
                  <option
                    key={fornecedor.id_fornecedor}
                    value={fornecedor.id_fornecedor}
                  >
                    {fornecedor.nome_fantasia ||
                      fornecedor.razao_social}
                  </option>
                ))}
              </select>

              <label style={styles.label}>Número do lote *</label>
              <input
                required
                maxLength={50}
                value={entrada.numero_lote}
                onChange={event => atualizarEntrada('numero_lote', event.target.value)}
                style={styles.input}
              />

              <label style={styles.label}>Data de fabricação</label>
              <input
                type="date"
                value={entrada.data_fabricacao}
                onChange={event => atualizarEntrada('data_fabricacao', event.target.value)}
                style={styles.input}
              />

              <label style={styles.label}>Data de validade *</label>
              <input
                type="date"
                required
                value={entrada.data_validade}
                onChange={event => atualizarEntrada('data_validade', event.target.value)}
                style={styles.input}
              />

              <label style={styles.label}>Quantidade *</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={entrada.quantidade}
                onChange={event => atualizarEntrada('quantidade', event.target.value)}
                style={styles.input}
              />

              <label style={styles.label}>Preço de custo do lote (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={entrada.preco_custo_lote}
                onChange={event => atualizarEntrada('preco_custo_lote', event.target.value)}
                style={styles.input}
              />

              <label style={styles.label}>Motivo (opcional)</label>
              <input
                value={entrada.motivo}
                onChange={event => atualizarEntrada('motivo', event.target.value)}
                style={styles.input}
              />

              <div style={styles.modalActions}>
                <button
                  type="button"
                  disabled={operando}
                  onClick={() => setModalEntrada(false)}
                  style={styles.secondaryButton}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={operando}
                  style={styles.primaryButton}
                >
                  {operando ? 'Registrando...' : 'Confirmar entrada'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modalBaixa && (
        <div style={styles.modalOverlay}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="baixaTitle"
            style={styles.modal}
          >
            <h2 id="baixaTitle" style={styles.sectionTitle}>
              Baixa manual de estoque
            </h2>

            <form onSubmit={handleBaixa}>
              <label style={styles.label}>Produto *</label>
              <select
                required
                value={baixa.id_produto}
                onChange={event => {
                  atualizarBaixa('id_produto', event.target.value);
                  atualizarBaixa('id_lote', '');
                }}
                style={styles.input}
              >
                <option value="">Selecione um produto</option>

                {produtos.map(produto => (
                  <option
                    key={produto.id_produto}
                    value={produto.id_produto}
                  >
                    {nomeProduto(produto)}
                  </option>
                ))}
              </select>

              <label style={styles.label}>Lote *</label>
              <select
                required
                value={baixa.id_lote}
                onChange={event => atualizarBaixa('id_lote', event.target.value)}
                style={styles.input}
              >
                <option value="">Selecione um lote</option>

                {produtoSelecionado?.id_produto === Number(baixa.id_produto)
                  ? lotes.map(lote => (
                      <option
                        key={lote.id_lote}
                        value={lote.id_lote}
                      >
                        {lote.numero_lote} — saldo: {lote.quantidade}
                      </option>
                    ))
                  : null}
              </select>

              <label style={styles.label}>Quantidade *</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={baixa.quantidade}
                onChange={event => atualizarBaixa('quantidade', event.target.value)}
                style={styles.input}
              />

              <label style={styles.label}>Motivo *</label>
              <input
                required
                value={baixa.motivo}
                onChange={event => atualizarBaixa('motivo', event.target.value)}
                placeholder="Informe o motivo da baixa"
                style={styles.input}
              />

              <label style={styles.label}>Observação</label>
              <textarea
                value={baixa.observacao}
                onChange={event => atualizarBaixa('observacao', event.target.value)}
                rows={3}
                style={styles.input}
              />

              <div style={styles.modalActions}>
                <button
                  type="button"
                  disabled={operando}
                  onClick={() => setModalBaixa(false)}
                  style={styles.secondaryButton}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={operando}
                  style={styles.dangerButton}
                >
                  {operando ? 'Registrando...' : 'Confirmar baixa'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
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

  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap'
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

  card: {
    padding: '1.5rem',
    marginBottom: '1.5rem',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px'
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '1.25rem'
  },

  sectionTitle: {
    margin: 0,
    marginBottom: '0.5rem',
    color: '#0A2540',
    fontSize: '1.2rem'
  },

  description: {
    margin: 0,
    color: '#64748B',
    fontSize: '0.9rem',
    lineHeight: 1.5
  },

  filters: {
    display: 'grid',
    gridTemplateColumns: 'minmax(180px, 2fr) minmax(160px, 1fr) auto',
    gap: '0.75rem',
    marginBottom: '1.25rem'
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.8rem',
    marginBottom: '0.8rem',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    background: '#FFFFFF',
    color: '#334155',
    fontSize: '0.9rem'
  },

  label: {
    display: 'block',
    marginBottom: '0.4rem',
    color: '#334155',
    fontWeight: '600',
    fontSize: '0.85rem'
  },

  primaryButton: {
    padding: '0.8rem 1rem',
    border: 'none',
    borderRadius: '6px',
    background: '#0A2540',
    color: '#FFFFFF',
    fontWeight: '600',
    cursor: 'pointer'
  },

  secondaryButton: {
    padding: '0.75rem 1rem',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    background: '#FFFFFF',
    color: '#334155',
    fontWeight: '600',
    cursor: 'pointer'
  },

  dangerButton: {
    padding: '0.8rem 1rem',
    border: 'none',
    borderRadius: '6px',
    background: '#B91C1C',
    color: '#FFFFFF',
    fontWeight: '600',
    cursor: 'pointer'
  },

  smallButton: {
    padding: '0.4rem 0.6rem',
    border: '1px solid #CBD5E1',
    borderRadius: '5px',
    background: '#FFFFFF',
    color: '#0A2540',
    cursor: 'pointer',
    fontSize: '0.78rem'
  },

  smallDangerButton: {
    padding: '0.4rem 0.6rem',
    border: '1px solid #FECACA',
    borderRadius: '5px',
    background: '#FEF2F2',
    color: '#B91C1C',
    cursor: 'pointer',
    fontSize: '0.78rem'
  },

  actionGroup: {
    display: 'flex',
    gap: '0.4rem',
    flexWrap: 'wrap'
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
    borderBottom: '1px solid #E2E8F0',
    verticalAlign: 'middle'
  },

  secondaryText: {
    display: 'block',
    marginTop: '0.25rem',
    color: '#94A3B8',
    fontSize: '0.75rem'
  },

  dangerText: {
    color: '#B91C1C'
  },

  emptyMessage: {
    padding: '1.5rem',
    color: '#64748B',
    textAlign: 'center'
  },

  errorBox: {
    padding: '1rem',
    marginBottom: '1.25rem',
    borderRadius: '6px',
    background: '#FEF2F2',
    color: '#B91C1C'
  },

  successBox: {
    padding: '1rem',
    marginBottom: '1.25rem',
    borderRadius: '6px',
    background: '#F0FDF4',
    color: '#166534'
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
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '2rem',
    background: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.2)'
  },

  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    flexWrap: 'wrap',
    marginTop: '1rem'
  }
};
