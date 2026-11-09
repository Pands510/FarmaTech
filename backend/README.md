# FarmaTech ERP — Camada de Back-end (2ª Unidade)

Sistema Integrado de Gestão Farmacêutica (ERP) desenvolvido em **Node.js com Express e MySQL 8.0**, estruturado sob a Arquitetura em Três Camadas (Controllers/Routes, Services, Repositories) com controle de acesso baseado em papéis (**RBAC**), autenticação **JWT**, transações financeiras **ACID**, documentação interativa **Swagger/OpenAPI** e integração direta com Triggers, Functions, Procedures e Views do banco de dados relacional.

---

## 🏛️ Arquitetura do Sistema

O projeto segue estritamente a especificação de engenharia de software da disciplina de Banco de Dados Avançado:

```
backend/
├── .env                          # Variáveis de ambiente
├── .env.example                  # Template das configurações
├── package.json                  # Dependências e scripts
├── server.js                     # Ponto de inicialização do servidor
├── Banco de dados/               # Scripts SQL e especificações do projeto
│   └── banco_farmatech_completo.sql
└── src/
    ├── app.js                    # Configuração do Express, CORS, Swagger e Middlewares
    ├── config/
    │   └── database.js           # Pool de conexões assíncrono com mysql2/promise
    ├── middlewares/
    │   ├── auth.middleware.js       # Validação de token JWT no header Authorization
    │   ├── permission.middleware.js # Guarda RBAC por Cargo/Perfil
    │   └── error.middleware.js      # Captura de erros e SIGNAL SQLSTATE '45000' de Triggers
    ├── routes/
    │   └── index.js              # Centralizador e roteador mestre da API
    └── modules/                  # Módulos desacoplados de negócio
        ├── auth/                 # Login e perfil de colaborador (SHA-256 e JWT)
        ├── dashboard/            # KPIs, gráficos e consumo das views analíticas
        ├── products/             # Catálogo, grupos e cálculo de saldo por fn_estoque_disponivel
        ├── inventory/            # Lotes FIFO, entrada por NF e baixa manual por perda/vencimento
        ├── sales/                # PDV Checkout (ACID), busca de clientes e histórico
        ├── cashier/              # Turnos de caixa e fechamento com Stored Procedure sp_fechar_caixa
        └── prescriptions/        # Validação farmacêutica de receitas controladas e médicos
```

---

## ⚙️ Pré-requisitos e Instalação

1. **Node.js** (v18 ou superior instalado).
2. **MySQL 8.0+** em execução (porta padrão 3306).

### Passo 1: Importar o Banco de Dados
No MySQL Workbench, DBeaver ou terminal MySQL, execute o arquivo:
```sql
SOURCE c:/Users/caick/OneDrive/Documentos/.projetos/FarmaTech/backend/Banco de dados/banco_farmatech_completo.sql;
```
*O script criará o banco `erp_farmacia`, tabelas, views, triggers, stored procedures e fará a carga de dados de teste.*

### Passo 2: Configurar o arquivo `.env`
No diretório `backend`, verifique se o arquivo `.env` contém as credenciais do seu MySQL local:
```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_do_mysql
DB_NAME=erp_farmacia

JWT_SECRET=farmatech_jwt_secret_token_secure_key_2026_erp
JWT_EXPIRES_IN=8h
```

### Passo 3: Instalar as Dependências e Iniciar
```bash
cd backend
npm install
npm run dev
# ou para produção:
npm start
```

---

## 📖 Documentação Interativa Swagger (OpenAPI)

Com o servidor em execução, acesse no navegador:
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

Na interface do Swagger, você e seu colega do Frontend podem testar todos os endpoints, inspecionar schemas de request/response e autenticar com o botão **Authorize** informando o token JWT.

---

## 👥 Credenciais de Teste para Login (Carga Inicial do Banco)

| Matrícula | Senha | Nome | Cargo | Perfil | Permissões |
|---|---|---|---|---|---|
| `MAT001` | `senha123` | Carlos Gerente | GERENTE | Gerente | Acesso Completo (Dashboard, PDV, Estoque, Caixa, Relatórios) |
| `MAT002` | `senha123` | Ana Farmaceutica | FARMACEUTICO | Farmacêutico | Receitas Médicas, PDV, Consulta Estoque |

---

## 🔌 Matriz de Endpoints para Integração com o Frontend

### 1. Autenticação (`/api/auth`)
- `POST /api/auth/login`: Autentica matrícula e senha, compara hash SHA-256 e emite o token JWT com RBAC.
- `GET /api/auth/me`: Retorna perfil do operador logado e suas permissões.

### 2. Dashboard Executivo (`/api/dashboard`)
- `GET /api/dashboard/kpis`: Faturamento do dia, total de vendas, ticket médio, caixas abertos e total de alertas.
- `GET /api/dashboard/alertas-estoque`: Consome `vw_alerta_estoque_baixo` com itens abaixo do estoque mínimo.
- `GET /api/dashboard/produtos-vencendo`: Consome `vw_produtos_vencendo` com lotes nos próximos 30 dias (Qualidade).
- `GET /api/dashboard/vendas-grafico`: Consolidado dos últimos 7 dias para o gráfico de barras.
- `GET /api/dashboard/vendas-por-categoria`: Faturamento por grupo de medicamento para o gráfico de pizza.

### 3. Ponto de Venda / PDV (`/api/vendas`)
- `POST /api/vendas/checkout`: Checkout atômico (ACID). Insere venda, itens e pagamentos, dispara `trg_valida_estoque_venda` (bloqueia se lote vencido ou faltar receita) e `trg_baixa_estoque_venda` (baixa FIFO e log).
- `GET /api/vendas`: Histórico de vendas com filtros por data, status e caixa.
- `GET /api/vendas/:id`: Detalhamento completo da venda, itens, receita associada e pagamentos.
- `GET /api/vendas/clientes`: Busca clientes por nome ou CPF para identificação no PDV.
- `POST /api/vendas/clientes`: Cadastro rápido de novo cliente.

### 4. Gestão de Estoque & Lotes FIFO (`/api/produtos` e `/api/estoque`)
- `GET /api/produtos`: Catálogo geral com saldo vendável calculado em tempo real via `fn_estoque_disponivel(id_produto)`.
- `GET /api/produtos/categorias`: Lista grupos e subgrupos farmacêuticos.
- `GET /api/produtos/:id`: Ficha técnica do produto.
- `GET /api/produtos/:id/lotes-fifo`: Lotes ativos ordenados por prioridade de saída FIFO (`data_validade ASC`).
- `POST /api/produtos`: Cadastro de novos produtos no catálogo.
- `PUT /api/produtos/:id`: Atualização de produtos (dispara trigger `trg_log_preco_produto` para auditoria).
- `PATCH /api/produtos/:id/inativar`: Inativação lógica do produto mantendo integridade histórica.
- `POST /api/estoque/entrada`: Entrada física de novos lotes com histórico em `Movimentos_Estoque`.
- `POST /api/estoque/baixa-manual`: Baixa física por perda, quebra, vencimento ou recolhimento legal Anvisa.
- `GET /api/estoque/movimentos`: Histórico de movimentações de estoque.
- `GET /api/estoque/fornecedores`: Lista fornecedores ativos para entradas.

### 5. Validação Farmacêutica de Receitas (`/api/receitas` e `/api/medicos`)
- `GET /api/receitas/pendentes`: Fila de prescrições ativas para aprovação do farmacêutico.
- `GET /api/receitas`: Lista receitas com cálculo de dias restantes para vencer.
- `GET /api/receitas/:id`: Ficha detalhada da prescrição e medicamentos associados.
- `POST /api/receitas`: Cadastro de receita médica vinculando paciente, médico e produtos.
- `POST /api/receitas/:id/aprovar`: Validação técnica e liberação da receita para o checkout.
- `GET /api/medicos/busca`: Autocomplete de médicos prescritores por CRM e UF.
- `POST /api/medicos`: Cadastro de novos médicos credenciados.

### 6. Sessão de Caixa e Fechamento (`/api/caixa`)
- `GET /api/caixa/status-atual`: Inspeciona se o operador possui sessão de caixa aberta.
- `POST /api/caixa/abrir`: Abertura de turno com fundo de troco.
- `POST /api/caixa/fechar`: Executa a Stored Procedure `sp_fechar_caixa` com reconciliação contábil (Dinheiro Físico vs Total Sistema vs Diferença).
- `GET /api/caixa/:id/resumo`: Totalizadores do turno por forma de pagamento (Dinheiro, Crédito, Débito, Pix).
- `GET /api/caixa/historico`: Histórico de turnos de caixas anteriores.

---

## 🤝 Instruções para o Desenvolvedor do Front-end

1. **Configuração do Cliente HTTP (Axios / Fetch)**:
   Adicione um interceptor para enviar o cabeçalho `Authorization: Bearer <token>` gravado no `localStorage`:
   ```javascript
   import axios from 'axios';

   const api = axios.create({
     baseURL: 'http://localhost:3000/api'
   });

   api.interceptors.request.use((config) => {
     const token = localStorage.getItem('farmatech_token');
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });

   export default api;
   ```

2. **Tratamento de Mensagens de Regra do Banco de Dados**:
   Quando uma regra for acionada pelo MySQL (ex: lote vencido ou falta de receita médica), a API responderá com status `400` e o formato padronizado:
   ```json
   {
     "error": true,
     "code": "DB_RULE_VIOLATION",
     "message": "Venda bloqueada. O produto deste lote está VENCIDO."
   }
   ```
   Basta exibir `error.response.data.message` em um Toast ou alerta vermelho na interface!
