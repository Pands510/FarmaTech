# FarmaTech ERP — Camada de Front-end (3ª Unidade)

Estrutura base e arquitetura de pastas preparada para o desenvolvimento da interface web do **FarmaTech ERP** utilizando **React + Vite**.

A estrutura já vem com roteamento configurado (`react-router-dom`), cliente HTTP pré-configurado com interceptor de autenticação JWT (`axios`), serviços de API mapeados para todos os endpoints do back-end, variáveis CSS do Design System e os prompts de IA prontos para geração visual.

---

## 📁 Estrutura de Pastas Organizada

```text
frontend/
├── public/                       # Arquivos estáticos e favicon
├── src/
│   ├── assets/                   # Imagens, logotipos e ícones
│   ├── components/
│   │   ├── common/               # Componentes atômicos reutilizáveis (Botões, Inputs, Modais, Toasts)
│   │   └── layout/               # Estruturas de layout (Sidebar, Topbar, Header)
│   ├── context/                  # Contextos globais do React (ex: AuthContext)
│   ├── hooks/                    # Custom hooks reutilizáveis
│   ├── pages/                    # 🎯 Telas do sistema para você codificar
│   │   ├── Auth/Login.jsx        # Tela de Autenticação (Login)
│   │   ├── Dashboard/            # Tela 1: Dashboard Executivo & KPIs
│   │   ├── POS/                  # Tela 2: Ponto de Venda (PDV / Frente de Caixa)
│   │   ├── Prescriptions/        # Tela 3: Balcão Farmacêutico (Validação de Receitas)
│   │   ├── Inventory/            # Tela 4: Gestão de Estoque e Lotes FIFO
│   │   ├── Cashier/              # Tela 5: Sessão de Caixa e Fechamento
│   │   └── Purchases/            # Tela 6: Compras e Notas Fiscais
│   ├── routes/
│   │   └── AppRoutes.jsx         # Configuração central de rotas com React Router
│   ├── services/                 # 🚀 Serviços de integração com o Back-end já prontos
│   │   ├── api.js                # Cliente Axios com injeção automática de Token JWT
│   │   ├── auth.service.js       # Login e dados do usuário
│   │   ├── dashboard.service.js  # KPIs, alertas de reposição e validades
│   │   ├── sales.service.js      # Checkout de PDV e busca de clientes
│   │   ├── inventory.service.js  # Catálogo, lotes FIFO e baixas de estoque
│   │   ├── cashier.service.js    # Abertura e fechamento de turno
│   │   └── prescriptions.service.js # Fila de receitas e consulta de médicos
│   ├── styles/
│   │   └── variables.css         # Cores do Design System e tipografia
│   ├── utils/
│   │   └── formatters.js         # Formatadores de moeda (R$) e datas brasileiras
│   ├── App.jsx                   # Componente raiz da aplicação
│   └── main.jsx                  # Ponto de entrada React 18
├── .env                          # URL do Back-end: VITE_API_URL=http://localhost:3000/api
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

---

## 🚀 Como Iniciar o Projeto

1. Certifique-se de que o **Back-end** já está rodando em `http://localhost:3000`.
2. No terminal, entre na pasta do front-end:
   ```bash
   cd c:\Users\caick\OneDrive\Documentos\.projetos\FarmaTech\frontend
   ```
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Inicie o servidor de desenvolvimento Vite:
   ```bash
   npm run dev
   ```
5. O sistema abrirá automaticamente em `http://localhost:5173`.

---

## 🎨 Design System e Paleta de Cores (Definido na Especificação)

As variáveis CSS já estão criadas em `src/styles/variables.css`:

| Elemento | Nome / Código Hex | Uso Recomendado |
|---|---|---|
| **Navy Principal** | `#0A2540` | Topbar, Sidebar, cabeçalhos executivos |
| **Azul Safira** | `#1E40AF` | Botões principais, links ativos e destaques |
| **Verde Esmeralda** | `#059669` / `#10B981` | Finalização de venda, receita válida, aprovação |
| **Vermelho Carmim** | `#DC2626` | Medicamento vencido, falta de receita, lote esgotado |
| **Âmbar** | `#D97706` | Alerta de estoque baixo, vencimento em até 30 dias |
| **Fundo da Tela** | `#F8FAFC` | Fundo geral da aplicação (Off-white) |
| **Cards e Tabelas** | `#FFFFFF` | Superfícies com sombras suaves |

---

## 🔌 Como Consumir o Back-end nos Seus Componentes

Você não precisa escrever chamadas `fetch` ou configurar headers manualmente. Basta importar o serviço correspondente da pasta `src/services`:

### Exemplo 1: Carregar KPIs no Dashboard
```jsx
import { useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboard.service';
import { formatCurrency } from '../../utils/formatters';

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    dashboardService.getKpis()
      .then(data => setKpis(data))
      .catch(err => console.error(err.userMessage));
  }, []);

  return (
    <div>
      <h3>Faturamento Hoje: {kpis ? formatCurrency(kpis.faturamento_diario) : 'Carregando...'}</h3>
      <p>Total de Vendas: {kpis?.total_vendas_dia}</p>
    </div>
  );
}
```

### Exemplo 2: Checkout no PDV com Tratamento de Erros de Trigger
```jsx
import { salesService } from '../../services/sales.service';

async function handleFinalizarVenda(dadosVenda) {
  try {
    const comprovante = await salesService.checkout(dadosVenda);
    alert('Venda aprovada com sucesso! Cupom: ' + comprovante.comprovante.numero_venda);
  } catch (error) {
    // Se o MySQL bloquear (ex: lote vencido ou remédio sem receita), a mensagem da regra vem pronta aqui:
    alert('Atenção: ' + error.userMessage);
  }
}
```

---

## 📋 Prompts Prontos para Gerar Ideias de Layout no Gemini

Se você quiser gerar conceitos visuais ou mockups de tela no Gemini, copie e cole os prompts abaixo:

### Prompt 1: Dashboard Executivo
> *A modern, ultra-clean executive web dashboard for a pharmacy ERP system named 'FarmaTech'. Top navigation bar with dark navy blue background (#0A2540), pharmacy logo, universal search bar, notification bell with red badge, and user profile 'Carlos - Manager'. Sidebar on the left with clean modern icons: Dashboard, POS / Sales, Inventory & Batches, Prescriptions, Cashier, Reports. Main area: 4 modern KPI cards at the top (Daily Revenue $12,450, Completed Sales 142, Low Stock Alerts 5, Expiring Batches 3). Below: a sleek bar chart showing weekly sales revenue, and two warning data tables: one titled 'Low Stock Alert' with orange warning badges, and another titled 'Batches Expiring in 30 Days' with pill badges. Medical white and off-white theme, subtle shadows, professional SaaS UI/UX design, Figma style, 4K resolution.*

### Prompt 2: Ponto de Venda (PDV / Caixa)
> *Modern Point of Sale (POS) interface for 'FarmaTech' pharmacy ERP. Clean two-column layout: on the left, an active order items table showing: barcode scanner input field, list of added medicines ('Dipirona 500mg' qty 2, 'Amoxicilina 500mg' with a blue 'Prescription Required' badge). Each row has unit price, quantity steppers (+/-), and subtotal. On the right pane: prominent Total Amount '$40.50' in bold green typography, customer lookup field ('Maria Silva'), and a highlighted button 'Attach Medical Prescription [Valid]'. At the bottom right, large action buttons: 'F2 - Add Discount', 'F4 - Cancel Item', and a large emerald green button 'F10 - Finalize Payment'. Clean medical aesthetics, high usability, UI/UX desktop web app, Tailwind CSS style.*

### Prompt 3: Validação de Receitas Médicas
> *A specialized medical web application screen for pharmacists in 'FarmaTech ERP'. Title: 'Controlled Prescription Validation'. Left side shows a queue of pending sales requiring pharmacist approval with status pills 'Pending Review'. Center shows detailed prescription card: Doctor Name 'Dr. Roberto Santos', Professional License 'CRM 123456-SP', Patient 'Maria Cliente', Medication 'Amoxicilina 500mg', Issue Date '2026-11-01', Expiration Date '2026-11-15' with a prominent green badge 'ACTIVE / VALID RECIPE (4 Days Left)'. Right side shows a scanned digital prescription preview window. Bottom action buttons: 'Approve & Release Sale' in solid green, and 'Reject Prescription' in outline red. Healthcare software UI, clean, elegant, compliant look.*

### Prompt 4: Gestão de Estoque e Lotes FIFO
> *Inventory and Batch Management screen for 'FarmaTech ERP'. Header with filter bar: Category, Manufacturer, Batch Expiry Filter, and search bar. Main data table listing pharmaceutical products. One row is expanded: 'Paracetamol 750mg', showing an inner nested table of active batches: Batch 'LOTE-2024-A' (Expiry: Dec 2027, Qty: 150, Status: Normal), Batch 'LOTE-2023-B' (Expiry: Dec 2026, Qty: 40, Status: 'Priority FIFO Exit' highlighted in blue), Batch 'LOTE-2022-C' (Expiry: Expired, Qty: 5, Status: 'Blocked / Expired' in red). Action buttons at top: '+ New Purchase Order', 'Export Inventory'. Modern data-dense enterprise SaaS table, clean design.*

### Prompt 5: Fechamento de Caixa
> *Cashier closing modal popup in 'FarmaTech ERP'. Modal title: 'Cash Register Closing - Shift #1'. Summary cards displaying totals: Cash: $450.00, Credit Card: $1,280.00, Debit: $620.00, Pix: $890.00. Input section for physical cash count: Operator enters '$450.00'. System reconciliation box: 'System Total: $3,240.00', 'Reported Cash: $450.00', 'Discrepancy: $0.00 (Balanced)' in bright green. Confirm buttons: 'Print Summary' and 'Close Register Permanently' in navy blue. Crisp, professional financial UI.*

---

## 🔑 Usuários para Teste de Login

Ao iniciar a tela de Login, utilize as credenciais de teste já cadastradas na base de dados:
- **Gerente:** Matrícula `MAT001` | Senha `senha123`
- **Farmacêutica:** Matrícula `MAT002` | Senha `senha123`
