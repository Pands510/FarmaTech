# FarmaTech ERP

Sistema integrado de gestão de farmácia (ERP), desenvolvido como projeto acadêmico, com o objetivo de centralizar e facilitar operações administrativas e comerciais de um estabelecimento farmacêutico.

O sistema utiliza uma arquitetura dividida entre frontend, backend e banco de dados relacional, permitindo a comunicação entre a interface do usuário e os serviços responsáveis pelas operações do sistema.

---

## 1. Tecnologias utilizadas

### Frontend
- React
- Vite
- JavaScript
- HTML5
- CSS3

### Backend
- Node.js
- Express
- JavaScript
- JWT (JSON Web Token)
- Swagger (documentação da API)

### Banco de dados
- MySQL 8.0+

---

## 2. Estrutura do projeto

O projeto está organizado em duas aplicações principais e um script de banco de dados.

```text
FarmaTech/
│
├── backend/
│   ├── src/
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── database/
│   └── erp_farmacia_schema.sql
│
├── docs/
│   └── screenshots/
│
├── README.md
└── .gitignore
```

*Observação: a estrutura acima representa a organização de referência. Os diretórios e arquivos devem corresponder à estrutura efetivamente presente no repositório.*

---

## 3. Requisitos para execução

Antes de executar o projeto, é necessário possuir:

- Node.js instalado.
- npm (gerenciador de pacotes do Node.js).
- MySQL Server 8.0 ou superior.
- MySQL Workbench (recomendado para administrar e importar o banco de dados).
- Navegador atualizado.

---

## 4. Configuração do banco de dados

O projeto utiliza o banco de dados `erp_farmacia`.

O script SQL disponibilizado no diretório `database/` é responsável pela criação e configuração da estrutura do banco, incluindo tabelas, relacionamentos, índices, views, procedures, triggers, perfis de acesso e registros de demonstração.

### 4.1. Importação do banco

1. Abra o MySQL Workbench.
2. Conecte-se ao servidor MySQL utilizando uma conta administrativa.
3. Abra o arquivo `erp_farmacia_schema.sql`.
4. Execute o script completo utilizando o botão de execução.
5. Verifique se o banco `erp_farmacia` foi criado.

Para conferir a criação, execute:

```sql
USE erp_farmacia;
SHOW TABLES;
```

O script disponibilizado cria a estrutura e insere dados de demonstração necessários para os testes iniciais.

**Importante:** a importação deve ser realizada em um ambiente de desenvolvimento. Não execute o script sobre uma base que contenha dados importantes sem antes verificar seu conteúdo e realizar um backup.

### 4.2. Usuário de conexão da aplicação

Recomenda-se utilizar um usuário específico para a aplicação, em vez de utilizar diretamente o usuário administrativo `root`.

Exemplo de configuração, executada por uma conta administrativa:

```sql
CREATE USER IF NOT EXISTS 'farmatech_app'@'localhost'
IDENTIFIED BY 'SUA_SENHA';

GRANT ALL PRIVILEGES ON erp_farmacia.*
TO 'farmatech_app'@'localhost';
```

Substitua `SUA_SENHA` pela senha definida localmente.

---

## 5. Configuração do backend

Acesse o diretório do backend:

```bash
cd backend
```

Instale as dependências:

```bash
npm install
```

Crie um arquivo chamado `.env` na raiz do diretório `backend`, utilizando o `.env.example` como referência.

Exemplo de configuração:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=farmatech_app
DB_PASSWORD=sua_senha_mysql
DB_NAME=erp_farmacia

JWT_SECRET=sua_chave_secreta_jwt
JWT_EXPIRES_IN=8h
```

### Variáveis de ambiente

| Variável | Descrição |
|---|---|
| PORT | Porta utilizada pelo servidor HTTP |
| NODE_ENV | Ambiente de execução |
| DB_HOST | Endereço do servidor MySQL |
| DB_PORT | Porta do MySQL |
| DB_USER | Usuário de conexão com o banco |
| DB_PASSWORD | Senha do usuário MySQL |
| DB_NAME | Banco de dados utilizado |
| JWT_SECRET | Chave utilizada para assinatura dos tokens JWT |
| JWT_EXPIRES_IN | Tempo de validade dos tokens |

O valor de `JWT_SECRET` deve ser uma chave aleatória forte, com pelo menos 32 caracteres. Uma chave pode ser gerada localmente com Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Não compartilhe o arquivo `.env` nem envie suas credenciais ao repositório.

Após configurar o ambiente, inicie o backend:

```bash
npm run dev
```

Por padrão, o servidor estará disponível em:

```text
http://localhost:3000
```

---

## 6. Configuração do frontend

Abra outro terminal e acesse o diretório do frontend:

```bash
cd frontend
```

Instale as dependências:

```bash
npm install
```

Inicie a aplicação:

```bash
npm run dev
```

O Vite disponibilizará o endereço local da aplicação no terminal. Na configuração padrão, o endereço é:

```text
http://localhost:5173
```

Mantenha o backend e o frontend em execução simultaneamente para permitir a comunicação entre as aplicações.

---

## 7. Autenticação e credenciais de demonstração

O sistema possui autenticação por matrícula e senha, utilizando tokens JWT para identificar sessões autenticadas.

Para facilitar a avaliação, o banco de dados disponibiliza funcionários de demonstração inseridos durante a execução do script SQL.

### Contas disponíveis

| Funcionário | Matrícula | Senha |
|---|---|---|
| Carlos (Gerente) | MAT001 | senha123 |
| Ana (Farmacêutica) | MAT002 | senha123 |

**Essas credenciais são destinadas exclusivamente à demonstração e aos testes acadêmicos.**

As senhas dos funcionários são armazenadas no banco de dados em formato de hash SHA-256, conforme a implementação atual do projeto, e não como senhas em texto puro.

O processo de autenticação compara o hash da senha informada com o valor armazenado.

Em um ambiente de produção, recomenda-se substituir essa implementação por um algoritmo específico para armazenamento seguro de senhas, como Argon2id ou bcrypt, além de utilizar credenciais próprias e não manter contas de demonstração.

---

## 8. Documentação da API

O backend disponibiliza documentação interativa da API por meio do Swagger.

Com o servidor em execução, acesse:

[http://localhost:3000/api-docs](http://localhost:3000/api-docs)

A documentação permite consultar as rotas disponíveis, visualizar parâmetros, verificar respostas e realizar testes das operações documentadas.

### Verificação de funcionamento

O backend também disponibiliza uma rota de verificação de saúde da aplicação:

```text
GET http://localhost:3000/api/health
```

Essa rota permite verificar se o servidor está respondendo.

---

## 9. Segurança e arquivos de configuração

O projeto utiliza variáveis de ambiente para armazenar configurações sensíveis, como credenciais do banco de dados e a chave de assinatura JWT.

O arquivo `.env` deve permanecer local e não deve ser enviado ao GitHub.

O repositório disponibiliza um `.env.example`, contendo os nomes das variáveis necessárias e valores ilustrativos para orientar a configuração do ambiente.

O `.gitignore` também deve impedir o versionamento de arquivos como:

- `.env`
- `node_modules/`
- arquivos de log;
- arquivos temporários e configurações locais.

---

## 10. Dados de demonstração

O script SQL contém registros utilizados para facilitar a avaliação inicial do sistema, incluindo:

- Perfis de acesso;
- Funcionários;
- Pessoas;
- Clientes;
- Fornecedores;
- Produtos;
- Grupos e subgrupos de produtos;
- Lotes;
- Registros de vendas;
- Movimentações de estoque.

Esses dados permitem iniciar os testes sem a necessidade de cadastrar manualmente todos os registros.
