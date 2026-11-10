import React, { useCallback, useEffect, useMemo, useState } from 'react';
import salesService from '../../services/sales.service';
import inventoryService from '../../services/inventory.service';
import cashierService from '../../services/cashier.service';

const styles = {
  page: {
    padding: '2rem',
    color: '#252525',
    maxWidth: '1500px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  title: { margin: 0, fontSize: '1.7rem' },
  subtitle: { color: '#777', marginTop: '0.4rem' },
  panel: {
    background: '#fff',
    border: '1px solid #e5e5e5',
    borderRadius: '10px',
    padding: '1.25rem',
    marginBottom: '1.25rem'
  },
  sectionTitle: { margin: '0 0 1rem', fontSize: '1.1rem' },
  input: {
    width: '100%',
    padding: '0.7rem',
    border: '1px solid #ccc',
    borderRadius: '6px',
    fontSize: '0.95rem',
    boxSizing: 'border-box'
  },
  button: {
    padding: '0.7rem 1rem',
    border: 0,
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600
  },
  primary: { background: '#b4232f', color: '#fff' },
  secondary: { background: '#eee', color: '#333' },
  disabled: { opacity: 0.5, cursor: 'not-allowed' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)',
    gap: '1.25rem',
    alignItems: 'start'
  },
  muted: { color: '#777', fontSize: '0.9rem' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  cell: {
    padding: '0.75rem',
    borderBottom: '1px solid #eee',
    textAlign: 'left',
    verticalAlign: 'middle'
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '0.4rem'
  },
  field: { marginBottom: '1rem' },
  total: { fontSize: '1.4rem', fontWeight: 700 },
  alert: {
    padding: '0.85rem',
    borderRadius: '6px',
    background: '#fff4e5',
    color: '#8a4b08',
    marginBottom: '1rem'
  },
  success: {
    padding: '1rem',
    borderRadius: '6px',
    background: '#e9f7ef',
    color: '#176b3a',
    marginBottom: '1rem'
  },
  error: {
    padding: '0.85rem',
    borderRadius: '6px',
    background: '#fdecec',
    color: '#a61b1b',
    marginBottom: '1rem'
  }
};

function moeda(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '—';

  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function dataFormatada(valor) {
  if (!valor) return '—';

  const data = String(valor).slice(0, 10);
  const partes = data.split('-');

  if (partes.length !== 3) return valor;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export default function POS() {
  const [caixa, setCaixa] = useState(null);
  const [carregandoCaixa, setCarregandoCaixa] = useState(true);

  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [buscandoProdutos, setBuscandoProdutos] = useState(false);

  const [carrinho, setCarrinho] = useState([]);
  const [carregandoLotes, setCarregandoLotes] = useState(null);

  const [buscaCliente, setBuscaCliente] = useState('');
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [buscandoClientes, setBuscandoClientes] = useState(false);

  const [desconto, setDesconto] = useState('0');
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [valorPagamento, setValorPagamento] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [bandeiraCartao, setBandeiraCartao] = useState('');
  const [autorizacao, setAutorizacao] = useState('');

  const [finalizando, setFinalizando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');
  const [vendaConcluida, setVendaConcluida] = useState(null);

  const carregarCaixa = useCallback(async () => {
    setCarregandoCaixa(true);

    try {
      const resposta = await cashierService.getStatus();
      setCaixa(resposta?.possui_caixa_aberto ? resposta.caixa : null);
    } catch (error) {
      setMensagemErro(
        error.userMessage || 'Não foi possível consultar o caixa atual.'
      );
    } finally {
      setCarregandoCaixa(false);
    }
  }, []);

  useEffect(() => {
    carregarCaixa();
  }, [carregarCaixa]);

  const buscarProdutos = useCallback(async (termo = '') => {
    setBuscandoProdutos(true);
    setMensagemErro('');

    try {
      const resposta = await inventoryService.listProducts({
        busca: termo.trim(),
        status: 'ATIVO'
      });

      setProdutos(Array.isArray(resposta) ? resposta : []);
    } catch (error) {
      setProdutos([]);
      setMensagemErro(
        error.userMessage || 'Não foi possível consultar os produtos.'
      );
    } finally {
      setBuscandoProdutos(false);
    }
  }, []);

  useEffect(() => {
    buscarProdutos('');
  }, [buscarProdutos]);

  const buscarClientes = async (termo) => {
    setBuscaCliente(termo);
    setClienteSelecionado(null);

    if (termo.trim().length < 2) {
      setClientes([]);
      return;
    }

    setBuscandoClientes(true);

    try {
      const resposta = await salesService.searchCustomers(termo.trim());
      setClientes(Array.isArray(resposta) ? resposta : []);
    } catch (error) {
      setClientes([]);
      setMensagemErro(
        error.userMessage || 'Não foi possível consultar os clientes.'
      );
    } finally {
      setBuscandoClientes(false);
    }
  };

  const adicionarProduto = async (produto) => {
    setMensagemErro('');
    setVendaConcluida(null);

    if (!caixa) {
      setMensagemErro('Abra um caixa antes de registrar vendas.');
      return;
    }

    if (Number(produto.estoque_disponivel) <= 0) {
      setMensagemErro('Este produto não possui estoque disponível.');
      return;
    }

    setCarregandoLotes(produto.id_produto);

    try {
      const resposta = await inventoryService.getLotesFifo(
        produto.id_produto
      );

      const lotes = Array.isArray(resposta) ? resposta : [];

      if (lotes.length === 0) {
        setMensagemErro(
          `Nenhum lote válido e disponível encontrado para ${produto.descricao}.`
        );
        return;
      }

      const loteDisponivel = lotes.find(
        (lote) => Number(lote.quantidade) > 0
      );

      if (!loteDisponivel) {
        setMensagemErro('Não existe quantidade disponível nos lotes.');
        return;
      }

      setCarrinho((atual) => {
        const existente = atual.find(
          (item) =>
            item.id_produto === produto.id_produto &&
            item.id_lote === loteDisponivel.id_lote
        );

        if (existente) {
          if (
            Number(existente.quantidade) + 1 >
            Number(loteDisponivel.quantidade)
          ) {
            setMensagemErro('Quantidade superior à disponível neste lote.');
            return atual;
          }

          return atual.map((item) =>
            item.id_produto === produto.id_produto &&
            item.id_lote === loteDisponivel.id_lote
              ? { ...item, quantidade: item.quantidade + 1 }
              : item
          );
        }

        return [
          ...atual,
          {
            id_produto: produto.id_produto,
            descricao: produto.descricao,
            codigo_barras: produto.codigo_barras,
            id_lote: loteDisponivel.id_lote,
            numero_lote: loteDisponivel.numero_lote,
            data_validade: loteDisponivel.data_validade,
            quantidade_disponivel: Number(loteDisponivel.quantidade),
            quantidade: 1,
            preco_unitario: Number(produto.preco_venda)
          }
        ];
      });
    } catch (error) {
      setMensagemErro(
        error.userMessage || 'Não foi possível consultar os lotes do produto.'
      );
    } finally {
      setCarregandoLotes(null);
    }
  };

  const alterarQuantidade = (id_produto, id_lote, quantidade) => {
    const valor = Number(quantidade);

    if (!Number.isInteger(valor) || valor < 1) return;

    setCarrinho((atual) =>
      atual.map((item) => {
        if (
          item.id_produto !== id_produto ||
          item.id_lote !== id_lote
        ) {
          return item;
        }

        if (valor > item.quantidade_disponivel) {
          setMensagemErro(
            `Quantidade máxima para o lote ${item.numero_lote}: ${item.quantidade_disponivel}.`
          );
          return item;
        }

        return { ...item, quantidade: valor };
      })
    );
  };

  const removerItem = (id_produto, id_lote) => {
    setCarrinho((atual) =>
      atual.filter(
        (item) =>
          item.id_produto !== id_produto ||
          item.id_lote !== id_lote
      )
    );
  };

  const subtotal = useMemo(
    () =>
      carrinho.reduce(
        (total, item) =>
          total + item.quantidade * item.preco_unitario,
        0
      ),
    [carrinho]
  );

  const percentualDesconto = Math.min(
    100,
    Math.max(0, Number(desconto) || 0)
  );

  const valorDesconto = subtotal * (percentualDesconto / 100);
  const totalVenda = Math.max(0, subtotal - valorDesconto);

  const totalPago = Number(valorPagamento) || 0;
  const troco = Math.max(0, totalPago - totalVenda);

  const finalizarVenda = async () => {
    setMensagemErro('');
    setVendaConcluida(null);

    if (!caixa?.id_caixa) {
      setMensagemErro('Não existe caixa aberto para este operador.');
      return;
    }

    if (carrinho.length === 0) {
      setMensagemErro('Adicione pelo menos um produto ao carrinho.');
      return;
    }

    if (totalVenda <= 0) {
      setMensagemErro('O valor total da venda deve ser maior que zero.');
      return;
    }

    if (totalPago < totalVenda) {
      setMensagemErro('O valor informado não cobre o total da venda.');
      return;
    }

    const pagamento = {
      forma_pagamento: formaPagamento.trim(),
      valor: totalPago
    };

    if (!pagamento.forma_pagamento) {
      setMensagemErro('Informe a forma de pagamento.');
      return;
    }

    if (
      ['CARTAO_CREDITO', 'CARTAO_DEBITO'].includes(
        pagamento.forma_pagamento
      )
    ) {
      pagamento.parcelas = Number(parcelas) || 1;

      if (bandeiraCartao.trim()) {
        pagamento.bandeira_cartao = bandeiraCartao.trim();
      }

      if (autorizacao.trim()) {
        pagamento.autorizacao = autorizacao.trim();
      }
    }

    const dadosVenda = {
      id_caixa: caixa.id_caixa,
      ...(clienteSelecionado
        ? { id_cliente: clienteSelecionado.id_cliente }
        : {}),
      desconto_percentual: percentualDesconto,
      desconto_valor: Number(valorDesconto.toFixed(2)),
      itens: carrinho.map((item) => ({
        id_produto: item.id_produto,
        id_lote: item.id_lote,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario
      })),
      pagamentos: [pagamento]
    };

    setFinalizando(true);

    try {
      const resposta = await salesService.checkout(dadosVenda);

      setVendaConcluida(resposta);
      setCarrinho([]);
      setClienteSelecionado(null);
      setBuscaCliente('');
      setClientes([]);
      setDesconto('0');
      setValorPagamento('');
      setParcelas('1');
      setBandeiraCartao('');
      setAutorizacao('');

      await buscarProdutos(buscaProduto);
      await carregarCaixa();
    } catch (error) {
      setMensagemErro(
        error.userMessage || 'Não foi possível concluir a venda.'
      );
    } finally {
      setFinalizando(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Ponto de Venda</h1>
          <p style={styles.subtitle}>
            Registro de vendas, consulta de produtos e controle de lotes.
          </p>
        </div>

        <div>
          {carregandoCaixa ? (
            <span style={styles.muted}>Consultando caixa...</span>
          ) : caixa ? (
            <span style={{ color: '#176b3a', fontWeight: 700 }}>
              Caixa aberto #{caixa.id_caixa}
            </span>
          ) : (
            <span style={{ color: '#a61b1b', fontWeight: 700 }}>
              Nenhum caixa aberto
            </span>
          )}
        </div>
      </header>

      {mensagemErro && (
        <div style={styles.error}>
          {mensagemErro}
          <button
            type="button"
            onClick={() => setMensagemErro('')}
            style={{ ...styles.button, ...styles.secondary, marginLeft: '1rem' }}
          >
            Fechar
          </button>
        </div>
      )}

      {vendaConcluida && (
        <div style={styles.success}>
          <strong>Venda concluída com sucesso!</strong>
          <p>
            Número: {vendaConcluida.numero_venda || vendaConcluida.id_venda}
          </p>
          <p>Valor líquido: {moeda(vendaConcluida.valor_liquido)}</p>
          <p>Total pago: {moeda(vendaConcluida.total_pago)}</p>
          <p>Troco: {moeda(vendaConcluida.troco)}</p>
        </div>
      )}

      {!carregandoCaixa && !caixa && (
        <div style={styles.alert}>
          É necessário abrir um caixa na tela de Gestão de Caixa antes de
          realizar uma venda.
        </div>
      )}

      <div style={styles.grid}>
        <main>
          <section style={styles.panel}>
            <h2 style={styles.sectionTitle}>Produtos</h2>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                buscarProdutos(buscaProduto);
              }}
              style={{
                display: 'flex',
                gap: '0.6rem',
                marginBottom: '1rem'
              }}
            >
              <input
                style={styles.input}
                value={buscaProduto}
                onChange={(event) => setBuscaProduto(event.target.value)}
                placeholder="Descrição ou código de barras..."
              />

              <button
                type="submit"
                style={{ ...styles.button, ...styles.primary }}
                disabled={buscandoProdutos}
              >
                Buscar
              </button>
            </form>

            {buscandoProdutos ? (
              <p style={styles.muted}>Buscando produtos...</p>
            ) : produtos.length === 0 ? (
              <p style={styles.muted}>Nenhum produto encontrado.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.cell}>Produto</th>
                      <th style={styles.cell}>Código</th>
                      <th style={styles.cell}>Estoque</th>
                      <th style={styles.cell}>Preço</th>
                      <th style={styles.cell}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtos.map((produto) => (
                      <tr key={produto.id_produto}>
                        <td style={styles.cell}>{produto.descricao}</td>
                        <td style={styles.cell}>
                          {produto.codigo_barras || '—'}
                        </td>
                        <td style={styles.cell}>
                          {produto.estoque_disponivel}
                        </td>
                        <td style={styles.cell}>
                          {moeda(produto.preco_venda)}
                        </td>
                        <td style={styles.cell}>
                          <button
                            type="button"
                            style={{
                              ...styles.button,
                              ...styles.primary,
                              ...(carregandoLotes === produto.id_produto
                                ? styles.disabled
                                : {})
                            }}
                            disabled={
                              !caixa ||
                              Number(produto.estoque_disponivel) <= 0 ||
                              carregandoLotes === produto.id_produto
                            }
                            onClick={() => adicionarProduto(produto)}
                          >
                            {carregandoLotes === produto.id_produto
                              ? 'Carregando...'
                              : 'Adicionar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={styles.panel}>
            <h2 style={styles.sectionTitle}>
              Carrinho ({carrinho.length} itens)
            </h2>

            {carrinho.length === 0 ? (
              <p style={styles.muted}>
                Nenhum produto adicionado à venda.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.cell}>Produto / Lote</th>
                      <th style={styles.cell}>Validade</th>
                      <th style={styles.cell}>Quantidade</th>
                      <th style={styles.cell}>Preço unitário</th>
                      <th style={styles.cell}>Subtotal</th>
                      <th style={styles.cell}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carrinho.map((item) => (
                      <tr key={`${item.id_produto}-${item.id_lote}`}>
                        <td style={styles.cell}>
                          <strong>{item.descricao}</strong>
                          <br />
                          <small style={styles.muted}>
                            Lote: {item.numero_lote}
                          </small>
                        </td>
                        <td style={styles.cell}>
                          {dataFormatada(item.data_validade)}
                        </td>
                        <td style={styles.cell}>
                          <input
                            type="number"
                            min="1"
                            max={item.quantidade_disponivel}
                            value={item.quantidade}
                            onChange={(event) =>
                              alterarQuantidade(
                                item.id_produto,
                                item.id_lote,
                                event.target.value
                              )
                            }
                            style={{ ...styles.input, width: '75px' }}
                          />
                          <small style={styles.muted}>
                            / {item.quantidade_disponivel}
                          </small>
                        </td>
                        <td style={styles.cell}>
                          {moeda(item.preco_unitario)}
                        </td>
                        <td style={styles.cell}>
                          {moeda(item.quantidade * item.preco_unitario)}
                        </td>
                        <td style={styles.cell}>
                          <button
                            type="button"
                            style={{ ...styles.button, ...styles.secondary }}
                            onClick={() =>
                              removerItem(item.id_produto, item.id_lote)
                            }
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>

        <aside>
          <section style={styles.panel}>
            <h2 style={styles.sectionTitle}>Cliente</h2>

            {clienteSelecionado ? (
              <div>
                <strong>{clienteSelecionado.nome}</strong>
                <p style={styles.muted}>
                  CPF: {clienteSelecionado.cpf || 'Não informado'}
                </p>
                <button
                  type="button"
                  style={{ ...styles.button, ...styles.secondary }}
                  onClick={() => {
                    setClienteSelecionado(null);
                    setBuscaCliente('');
                    setClientes([]);
                  }}
                >
                  Remover cliente
                </button>
              </div>
            ) : (
              <>
                <div style={styles.field}>
                  <label style={styles.label}>Buscar cliente</label>
                  <input
                    style={styles.input}
                    value={buscaCliente}
                    onChange={(event) => buscarClientes(event.target.value)}
                    placeholder="Nome ou CPF..."
                  />
                </div>

                {buscandoClientes && (
                  <p style={styles.muted}>Buscando clientes...</p>
                )}

                {clientes.map((cliente) => (
                  <button
                    type="button"
                    key={cliente.id_cliente}
                    onClick={() => {
                      setClienteSelecionado(cliente);
                      setBuscaCliente('');
                      setClientes([]);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.7rem',
                      textAlign: 'left',
                      border: '1px solid #eee',
                      background: '#fff',
                      cursor: 'pointer',
                      borderRadius: '5px',
                      marginBottom: '0.4rem'
                    }}
                  >
                    <strong>{cliente.nome}</strong>
                    <br />
                    <small style={styles.muted}>
                      {cliente.cpf || 'CPF não informado'}
                    </small>
                  </button>
                ))}
              </>
            )}
          </section>

          <section style={styles.panel}>
            <h2 style={styles.sectionTitle}>Pagamento</h2>

            <div style={styles.field}>
              <label style={styles.label}>Desconto (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                style={styles.input}
                value={desconto}
                onChange={(event) => setDesconto(event.target.value)}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Forma de pagamento</label>
              <input
                style={styles.input}
                value={formaPagamento}
                onChange={(event) => setFormaPagamento(event.target.value)}
                placeholder="Valor aceito pelo backend"
              />
              <small style={styles.muted}>
                Informe o identificador esperado pelo backend.
              </small>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Valor recebido</label>
              <input
                type="number"
                min="0"
                step="0.01"
                style={styles.input}
                value={valorPagamento}
                onChange={(event) => setValorPagamento(event.target.value)}
                placeholder="0,00"
              />
            </div>

            {['CARTAO_CREDITO', 'CARTAO_DEBITO'].includes(
              formaPagamento.trim()
            ) && (
              <>
                <div style={styles.field}>
                  <label style={styles.label}>Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    style={styles.input}
                    value={parcelas}
                    onChange={(event) => setParcelas(event.target.value)}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Bandeira do cartão</label>
                  <input
                    style={styles.input}
                    value={bandeiraCartao}
                    onChange={(event) =>
                      setBandeiraCartao(event.target.value)
                    }
                    placeholder="Ex.: Visa"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Autorização</label>
                  <input
                    style={styles.input}
                    value={autorizacao}
                    onChange={(event) => setAutorizacao(event.target.value)}
                  />
                </div>
              </>
            )}

            <hr style={{ border: 0, borderTop: '1px solid #eee' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span>
              <strong>{moeda(subtotal)}</strong>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '0.6rem'
              }}
            >
              <span>Desconto</span>
              <strong>{moeda(valorDesconto)}</strong>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1rem'
              }}
            >
              <span>Total</span>
              <span style={styles.total}>{moeda(totalVenda)}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '0.6rem'
              }}
            >
              <span>Troco estimado</span>
              <strong>{moeda(troco)}</strong>
            </div>

            <button
              type="button"
              onClick={finalizarVenda}
              disabled={
                finalizando ||
                !caixa ||
                carrinho.length === 0 ||
                totalPago < totalVenda ||
                totalVenda <= 0
              }
              style={{
                ...styles.button,
                ...styles.primary,
                width: '100%',
                marginTop: '1.25rem',
                ...(finalizando || !caixa || carrinho.length === 0
                  ? styles.disabled
                  : {})
              }}
            >
              {finalizando ? 'Finalizando venda...' : 'Finalizar venda'}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
