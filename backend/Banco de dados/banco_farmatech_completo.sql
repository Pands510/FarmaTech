-- =============================================================================
-- PROJETO FARMA TECH - SISTEMA INTEGRADO DE GESTÃO DE FARMÁCIA (ERP)
-- SCRIPT CONSOLIDADO E CORRIGIDO DE BANCO DE DADOS (MySQL 8.0+)
-- =============================================================================
-- Este arquivo unifica e aprimora os scripts v1, v2, v3, v4 e v5, corrigindo
-- falhas de integridade referencial, determinismo de funções, regras de negócio 
-- para medicamentos controlados (receituário) e controle de estoque mínimo.
--
-- ESTRUTURA DO ARQUIVO:
-- 1. Criação do Banco de Dados e Configurações Globais
-- 2. Criação das Tabelas DDL e Chaves Estrangeiras (Normalizadas)
-- 3. Criação de Índices de Alta Performance
-- 4. Criação de Views Estratégicas e Relatórios
-- 5. Criação de Funções e Procedimentos Armazenados (Stored Procedures)
-- 6. Criação de Triggers (Automações e Regras de Negócio)
-- 7. Governança, Segurança e Perfis de Acesso (RBAC)
-- 8. Carga Inicial de Testes e Validação Operacional
-- =============================================================================

DROP DATABASE IF EXISTS erp_farmacia;
CREATE DATABASE erp_farmacia
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;
USE erp_farmacia;

-- =============================================================================
-- SEÇÃO 1: TABELAS E ESTRUTURA DDL
-- =============================================================================

-- Perfis de Acesso da Aplicação
CREATE TABLE Perfis (
    id_perfil     INT AUTO_INCREMENT PRIMARY KEY,
    nome          VARCHAR(50) NOT NULL UNIQUE COMMENT 'CEO, DBA, Gerente, Farmaceutico, Atendente, Caixa, Estoquista',
    descricao     VARCHAR(255),
    data_criacao  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Perfis operacionais do sistema FarmaTech';

-- Pessoas (Generalização para Físicas e Jurídicas - 3FN)
CREATE TABLE Pessoas (
    id_pessoa        INT AUTO_INCREMENT PRIMARY KEY,
    tipo             ENUM('FISICA','JURIDICA') NOT NULL,
    nome             VARCHAR(150) COMMENT 'Nome completo para PF',
    razao_social     VARCHAR(150) COMMENT 'Razão social para PJ',
    nome_fantasia    VARCHAR(150) COMMENT 'Nome fantasia para PJ',
    status           ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
    data_cadastro    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_pessoa_tem_nome
        CHECK (nome IS NOT NULL OR razao_social IS NOT NULL)
) ENGINE=InnoDB COMMENT='Tabela base de entidades (PF e PJ)';

-- Contatos associados à Pessoa (1:N)
CREATE TABLE Contatos (
    id_contato  INT AUTO_INCREMENT PRIMARY KEY,
    id_pessoa   INT NOT NULL,
    tipo        ENUM('CELULAR','FIXO','EMAIL') NOT NULL,
    email       VARCHAR(150) UNIQUE,
    telefone    VARCHAR(20),
    principal   BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_contato_pessoa FOREIGN KEY (id_pessoa)
        REFERENCES Pessoas(id_pessoa) ON DELETE CASCADE,
    CONSTRAINT chk_contato_valor
        CHECK (email IS NOT NULL OR telefone IS NOT NULL)
) ENGINE=InnoDB;

-- Endereços associados à Pessoa (1:N)
CREATE TABLE Enderecos (
    id_endereco  INT AUTO_INCREMENT PRIMARY KEY,
    id_pessoa    INT NOT NULL,
    cep          CHAR(9) NOT NULL,
    logradouro   VARCHAR(150) NOT NULL,
    numero       VARCHAR(20)  NOT NULL,
    complemento  VARCHAR(100),
    bairro       VARCHAR(100) NOT NULL,
    cidade       VARCHAR(100) NOT NULL,
    estado       CHAR(2)      NOT NULL,
    principal    BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_endereco_pessoa FOREIGN KEY (id_pessoa)
        REFERENCES Pessoas(id_pessoa) ON DELETE CASCADE,
    CONSTRAINT chk_endereco_uf
        CHECK (estado IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
                          'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
                          'RS','RO','RR','SC','SP','SE','TO'))
) ENGINE=InnoDB;

-- Documentos de Pessoas (CPF, RG, CNPJ, etc.)
CREATE TABLE Documentos (
    id_documento     INT AUTO_INCREMENT PRIMARY KEY,
    id_pessoa        INT NOT NULL,
    tipo_documento   ENUM('CPF','RG','CNH','CNPJ','REGISTRO_PROFISSIONAL') NOT NULL,
    numero           VARCHAR(30) NOT NULL,
    orgao_emissor    VARCHAR(50),
    data_emissao     DATE,
    CONSTRAINT fk_documento_pessoa FOREIGN KEY (id_pessoa)
        REFERENCES Pessoas(id_pessoa) ON DELETE CASCADE,
    CONSTRAINT uq_documento UNIQUE (tipo_documento, numero)
) ENGINE=InnoDB;

-- Médicos / Prescritores (Entidade recomendada na proposta para normalização 3FN)
CREATE TABLE Medicos (
    id_medico         INT AUTO_INCREMENT PRIMARY KEY,
    id_pessoa         INT NOT NULL UNIQUE,
    crm               VARCHAR(30) NOT NULL,
    uf_crm            CHAR(2)     NOT NULL,
    especialidade     VARCHAR(100),
    CONSTRAINT fk_medico_pessoa FOREIGN KEY (id_pessoa)
        REFERENCES Pessoas(id_pessoa) ON DELETE RESTRICT,
    CONSTRAINT uq_medico_crm UNIQUE (crm, uf_crm)
) ENGINE=InnoDB COMMENT='Médicos credenciados para emissão de receitas';

-- Clientes
CREATE TABLE Clientes (
    id_cliente        INT AUTO_INCREMENT PRIMARY KEY,
    id_pessoa         INT NOT NULL UNIQUE,
    data_cadastro     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pontos_fidelidade INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_cliente_pessoa FOREIGN KEY (id_pessoa)
        REFERENCES Pessoas(id_pessoa) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Funcionários
CREATE TABLE Funcionarios (
    id_funcionario   INT AUTO_INCREMENT PRIMARY KEY,
    id_pessoa        INT NOT NULL UNIQUE,
    id_perfil        INT NOT NULL,
    cargo            ENUM('ADMINISTRADOR','GERENTE','FARMACEUTICO',
                          'ATENDENTE','ESTOQUISTA','CAIXA') NOT NULL,
    matricula        VARCHAR(20) NOT NULL UNIQUE,
    senha_hash       VARCHAR(255) NOT NULL,
    data_admissao    DATE NOT NULL,
    data_demissao    DATE,
    status_funcionario ENUM('ATIVO','FERIAS','ATESTADO','DESLIGADO')
                         NOT NULL DEFAULT 'ATIVO',
    ultimo_acesso    DATETIME,
    CONSTRAINT fk_funcionario_pessoa FOREIGN KEY (id_pessoa)
        REFERENCES Pessoas(id_pessoa) ON DELETE RESTRICT,
    CONSTRAINT fk_funcionario_perfil FOREIGN KEY (id_perfil)
        REFERENCES Perfis(id_perfil) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Fornecedores
CREATE TABLE Fornecedores (
    id_fornecedor       INT AUTO_INCREMENT PRIMARY KEY,
    id_pessoa           INT NOT NULL UNIQUE,
    inscricao_estadual  VARCHAR(30),
    CONSTRAINT fk_fornecedor_pessoa FOREIGN KEY (id_pessoa)
        REFERENCES Pessoas(id_pessoa) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Categorias de Produtos: Grupos e Subgrupos
CREATE TABLE Grupos (
    id_grupo INT AUTO_INCREMENT PRIMARY KEY,
    nome     VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE Subgrupos (
    id_subgrupo INT AUTO_INCREMENT PRIMARY KEY,
    id_grupo    INT NOT NULL,
    nome        VARCHAR(100) NOT NULL,
    CONSTRAINT fk_subgrupo_grupo FOREIGN KEY (id_grupo)
        REFERENCES Grupos(id_grupo) ON DELETE RESTRICT,
    CONSTRAINT uq_subgrupo UNIQUE (id_grupo, nome)
) ENGINE=InnoDB;

-- Cadastro Geral de Produtos
CREATE TABLE Produtos (
    id_produto        INT AUTO_INCREMENT PRIMARY KEY,
    descricao         VARCHAR(200) NOT NULL,
    e_medicamento     BOOLEAN NOT NULL DEFAULT FALSE,
    precisa_receita   BOOLEAN NOT NULL DEFAULT FALSE,
    id_grupo          INT NOT NULL,
    id_subgrupo       INT NOT NULL,
    marca             VARCHAR(100),
    fabricante        VARCHAR(150),
    codigo_barras     VARCHAR(50) UNIQUE,
    preco_custo       DECIMAL(10,2) NOT NULL DEFAULT 0,
    preco_venda       DECIMAL(10,2) NOT NULL,
    estoque_minimo    INT NOT NULL DEFAULT 5 COMMENT 'Alerta de reposição exigido na proposta',
    status_produto    ENUM('ATIVO','INATIVO','DESCONTINUADO','BLOQUEADO')
                        NOT NULL DEFAULT 'ATIVO',
    principio_ativo   VARCHAR(200),
    apresentacao      VARCHAR(100),
    dosagem           VARCHAR(50),
    registro_anvisa   VARCHAR(30),
    CONSTRAINT fk_produto_grupo    FOREIGN KEY (id_grupo)
        REFERENCES Grupos(id_grupo),
    CONSTRAINT fk_produto_subgrupo FOREIGN KEY (id_subgrupo)
        REFERENCES Subgrupos(id_subgrupo),
    CONSTRAINT chk_produto_precos CHECK (preco_venda >= 0 AND preco_custo >= 0),
    CONSTRAINT chk_produto_receita CHECK (NOT precisa_receita OR e_medicamento),
    CONSTRAINT chk_produto_estoque_min CHECK (estoque_minimo >= 0)
) ENGINE=InnoDB;

-- Compras de Fornecedores
CREATE TABLE Compras (
    id_compra      INT AUTO_INCREMENT PRIMARY KEY,
    id_fornecedor  INT NOT NULL,
    numero_nf      VARCHAR(50) NOT NULL,
    data_compra    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valor_total    DECIMAL(10,2) NOT NULL DEFAULT 0,
    status_compra  ENUM('PENDENTE','RECEBIDA','CANCELADA')
                     NOT NULL DEFAULT 'PENDENTE',
    CONSTRAINT fk_compra_fornecedor FOREIGN KEY (id_fornecedor)
        REFERENCES Fornecedores(id_fornecedor),
    CONSTRAINT uq_compra_nf UNIQUE (id_fornecedor, numero_nf)
) ENGINE=InnoDB;

CREATE TABLE Compras_Itens (
    id_compra_item INT AUTO_INCREMENT PRIMARY KEY,
    id_compra      INT NOT NULL,
    id_produto     INT NOT NULL,
    quantidade     INT NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    subtotal       DECIMAL(10,2) GENERATED ALWAYS AS
                     (quantidade * preco_unitario) STORED,
    CONSTRAINT fk_compra_item_compra  FOREIGN KEY (id_compra)
        REFERENCES Compras(id_compra) ON DELETE CASCADE,
    CONSTRAINT fk_compra_item_produto FOREIGN KEY (id_produto)
        REFERENCES Produtos(id_produto),
    CONSTRAINT chk_compra_item_qtd CHECK (quantidade > 0)
) ENGINE=InnoDB;

-- Lotes (Controle FIFO e Validade)
CREATE TABLE Lotes (
    id_lote          INT AUTO_INCREMENT PRIMARY KEY,
    id_produto       INT NOT NULL,
    id_fornecedor    INT NOT NULL,
    id_compra        INT,
    numero_lote      VARCHAR(50) NOT NULL,
    data_entrada     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fabricacao  DATE,
    data_validade    DATE NOT NULL,
    quantidade       INT NOT NULL DEFAULT 0,
    preco_custo_lote DECIMAL(10,2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_lote_produto    FOREIGN KEY (id_produto)
        REFERENCES Produtos(id_produto),
    CONSTRAINT fk_lote_fornecedor FOREIGN KEY (id_fornecedor)
        REFERENCES Fornecedores(id_fornecedor),
    CONSTRAINT fk_lote_compra     FOREIGN KEY (id_compra)
        REFERENCES Compras(id_compra),
    CONSTRAINT uq_lote UNIQUE (id_produto, numero_lote),
    CONSTRAINT uq_lote_produto_par UNIQUE (id_lote, id_produto) COMMENT 'Permite FK composta garantindo integridade',
    CONSTRAINT chk_lote_qtd CHECK (quantidade >= 0),
    CONSTRAINT chk_lote_validade CHECK (data_fabricacao IS NULL OR data_validade > data_fabricacao)
) ENGINE=InnoDB;

-- Caixas e Sessões Financeiras PDV
CREATE TABLE Caixas (
    id_caixa         INT AUTO_INCREMENT PRIMARY KEY,
    id_funcionario   INT NOT NULL,
    data_abertura    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fechamento  DATETIME,
    valor_abertura   DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_fechamento DECIMAL(10,2),
    status_caixa     ENUM('ABERTO','FECHADO') NOT NULL DEFAULT 'ABERTO',
    CONSTRAINT fk_caixa_funcionario FOREIGN KEY (id_funcionario)
        REFERENCES Funcionarios(id_funcionario)
) ENGINE=InnoDB;

-- Vendas do PDV
CREATE TABLE Vendas (
    id_venda             INT AUTO_INCREMENT PRIMARY KEY,
    numero_venda         VARCHAR(30) NOT NULL UNIQUE,
    id_cliente           INT,
    id_funcionario       INT NOT NULL,
    id_caixa             INT NOT NULL,
    data_hora            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valor_total          DECIMAL(10,2) NOT NULL DEFAULT 0,
    desconto_percentual  DECIMAL(5,2) NOT NULL DEFAULT 0,
    desconto_valor       DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_liquido        DECIMAL(10,2) GENERATED ALWAYS AS
                           (valor_total - desconto_valor) STORED,
    status_venda         ENUM('ABERTA','FINALIZADA','CANCELADA','DEVOLVIDA')
                           NOT NULL DEFAULT 'ABERTA',
    CONSTRAINT fk_venda_cliente     FOREIGN KEY (id_cliente)
        REFERENCES Clientes(id_cliente),
    CONSTRAINT fk_venda_funcionario FOREIGN KEY (id_funcionario)
        REFERENCES Funcionarios(id_funcionario),
    CONSTRAINT fk_venda_caixa       FOREIGN KEY (id_caixa)
        REFERENCES Caixas(id_caixa),
    CONSTRAINT chk_venda_desconto CHECK (
        desconto_percentual BETWEEN 0 AND 100 AND desconto_valor >= 0
    )
) ENGINE=InnoDB;

-- Receitas Médicas (Controle de Medicamentos Controlados)
CREATE TABLE Receitas (
    id_receita         INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente         INT NOT NULL,
    id_funcionario     INT NOT NULL COMMENT 'Farmacêutico responsável que validou',
    id_medico          INT COMMENT 'Médico cadastrado na base',
    nome_prescritor    VARCHAR(150) NOT NULL,
    crm_prescritor     VARCHAR(30) NOT NULL,
    data_prescricao    DATE NOT NULL,
    validade_receita   DATE NOT NULL,
    observacoes        TEXT,
    CONSTRAINT fk_receita_cliente     FOREIGN KEY (id_cliente)
        REFERENCES Clientes(id_cliente),
    CONSTRAINT fk_receita_funcionario FOREIGN KEY (id_funcionario)
        REFERENCES Funcionarios(id_funcionario),
    CONSTRAINT fk_receita_medico      FOREIGN KEY (id_medico)
        REFERENCES Medicos(id_medico),
    CONSTRAINT chk_receita_validade CHECK (validade_receita >= data_prescricao)
) ENGINE=InnoDB;

CREATE TABLE Receitas_Itens (
    id_receita_item INT AUTO_INCREMENT PRIMARY KEY,
    id_receita      INT NOT NULL,
    id_produto      INT NOT NULL,
    quantidade      INT NOT NULL,
    posologia       VARCHAR(255),
    CONSTRAINT fk_ri_receita FOREIGN KEY (id_receita)
        REFERENCES Receitas(id_receita) ON DELETE CASCADE,
    CONSTRAINT fk_ri_produto FOREIGN KEY (id_produto)
        REFERENCES Produtos(id_produto),
    CONSTRAINT chk_ri_qtd CHECK (quantidade > 0)
) ENGINE=InnoDB;

-- Itens da Venda (Com vínculo a Lote e Receita Médica opcional)
CREATE TABLE Vendas_Itens (
    id_item_venda   INT AUTO_INCREMENT PRIMARY KEY,
    id_venda        INT NOT NULL,
    id_produto      INT NOT NULL,
    id_lote         INT NOT NULL,
    id_receita      INT NULL COMMENT 'Obrigatório se produto exigir receita médica',
    quantidade      INT NOT NULL,
    preco_unitario  DECIMAL(10,2) NOT NULL,
    desconto        DECIMAL(10,2) NOT NULL DEFAULT 0,
    subtotal        DECIMAL(10,2) GENERATED ALWAYS AS
                      ((quantidade * preco_unitario) - desconto) STORED,
    CONSTRAINT fk_vi_venda    FOREIGN KEY (id_venda)
        REFERENCES Vendas(id_venda) ON DELETE CASCADE,
    CONSTRAINT fk_vi_produto  FOREIGN KEY (id_produto)
        REFERENCES Produtos(id_produto),
    CONSTRAINT fk_vi_lote     FOREIGN KEY (id_lote)
        REFERENCES Lotes(id_lote),
    CONSTRAINT fk_vi_lote_prod FOREIGN KEY (id_lote, id_produto)
        REFERENCES Lotes(id_lote, id_produto) ON UPDATE CASCADE,
    CONSTRAINT fk_vi_receita  FOREIGN KEY (id_receita)
        REFERENCES Receitas(id_receita),
    CONSTRAINT chk_vi_qtd     CHECK (quantidade > 0)
) ENGINE=InnoDB;

-- Pagamentos da Venda
CREATE TABLE Pagamentos (
    id_pagamento     INT AUTO_INCREMENT PRIMARY KEY,
    id_venda         INT NOT NULL,
    forma_pagamento  ENUM('DINHEIRO','DEBITO','CREDITO','PIX','BOLETO','CONVENIO')
                       NOT NULL,
    valor            DECIMAL(10,2) NOT NULL,
    parcelas         INT NOT NULL DEFAULT 1,
    bandeira_cartao  VARCHAR(30),
    autorizacao      VARCHAR(50) COMMENT 'NSU / código de autorização',
    data_pagamento   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status_pagamento ENUM('PENDENTE','APROVADO','RECUSADO','ESTORNADO')
                       NOT NULL DEFAULT 'PENDENTE',
    CONSTRAINT fk_pagamento_venda FOREIGN KEY (id_venda)
        REFERENCES Vendas(id_venda) ON DELETE CASCADE,
    CONSTRAINT chk_pagamento_valor CHECK (valor >= 0),
    CONSTRAINT chk_pagamento_parcelas CHECK (parcelas >= 1)
) ENGINE=InnoDB;

-- Movimentos de Estoque (Histórico e Rastreabilidade FIFO)
CREATE TABLE Movimentos_Estoque (
    id_movimento           INT AUTO_INCREMENT PRIMARY KEY,
    id_produto             INT NOT NULL,
    id_lote                INT NOT NULL,
    id_venda               INT,
    id_funcionario         INT NOT NULL,
    tipo_movimento         ENUM('ENTRADA','SAIDA','ACERTO_ENTRADA','ACERTO_SAIDA')
                             NOT NULL,
    quantidade_movimentada INT NOT NULL,
    motivo                 VARCHAR(100) COMMENT 'venda, ajuste, perda, vencimento, devolução',
    data_movimentacao      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mov_produto     FOREIGN KEY (id_produto)
        REFERENCES Produtos(id_produto),
    CONSTRAINT fk_mov_lote        FOREIGN KEY (id_lote)
        REFERENCES Lotes(id_lote),
    CONSTRAINT fk_mov_venda       FOREIGN KEY (id_venda)
        REFERENCES Vendas(id_venda),
    CONSTRAINT fk_mov_funcionario FOREIGN KEY (id_funcionario)
        REFERENCES Funcionarios(id_funcionario),
    CONSTRAINT chk_mov_qtd CHECK (quantidade_movimentada > 0)
) ENGINE=InnoDB;

-- Log de Auditoria do Sistema
CREATE TABLE Log_Auditoria (
    id_log         BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome_tabela    VARCHAR(100) NOT NULL,
    operacao       ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    id_registro    VARCHAR(50) NOT NULL,
    dados_antes    JSON,
    dados_depois   JSON,
    id_funcionario INT,
    data_hora      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_funcionario FOREIGN KEY (id_funcionario)
        REFERENCES Funcionarios(id_funcionario) ON DELETE SET NULL
) ENGINE=InnoDB;


-- =============================================================================
-- SEÇÃO 2: ÍNDICES DE DESEMPENHO E OTIMIZAÇÃO
-- =============================================================================

CREATE INDEX idx_pessoa_nome        ON Pessoas(nome);
CREATE INDEX idx_pessoa_razao       ON Pessoas(razao_social);
CREATE INDEX idx_documento_numero   ON Documentos(numero);
CREATE INDEX idx_produto_descricao  ON Produtos(descricao);
CREATE INDEX idx_produto_grupo      ON Produtos(id_grupo);
CREATE INDEX idx_produto_subgrupo   ON Produtos(id_subgrupo);
CREATE INDEX idx_produto_status     ON Produtos(status_produto);
CREATE INDEX idx_lote_fifo          ON Lotes(id_produto, data_validade, data_entrada);
CREATE INDEX idx_venda_data         ON Vendas(data_hora);
CREATE INDEX idx_venda_cliente      ON Vendas(id_cliente);
CREATE INDEX idx_venda_funcionario  ON Vendas(id_funcionario);
CREATE INDEX idx_venda_status       ON Vendas(status_venda);
CREATE INDEX idx_mov_produto_data   ON Movimentos_Estoque(id_produto, data_movimentacao);
CREATE INDEX idx_log_tabela_data    ON Log_Auditoria(nome_tabela, data_hora);


-- =============================================================================
-- SEÇÃO 3: VIEWS (RELATÓRIOS E CONSULTAS CONSOLIDADAS)
-- =============================================================================

-- View 1: Posição Consolidada de Estoque
CREATE OR REPLACE VIEW vw_estoque AS
SELECT
    p.id_produto,
    p.descricao,
    p.estoque_minimo,
    COALESCE(SUM(l.quantidade), 0) AS quantidade_total,
    COALESCE(SUM(CASE WHEN l.data_validade >= CURDATE()
                      THEN l.quantidade ELSE 0 END), 0) AS quantidade_disponivel,
    COALESCE(SUM(CASE WHEN l.data_validade < CURDATE()
                      THEN l.quantidade ELSE 0 END), 0) AS quantidade_vencida
FROM Produtos p
LEFT JOIN Lotes l ON l.id_produto = p.id_produto
GROUP BY p.id_produto, p.descricao, p.estoque_minimo;

-- View 2: Produtos Próximos do Vencimento (Próximos 30 dias - QM)
CREATE OR REPLACE VIEW vw_produtos_vencendo AS
SELECT 
    p.id_produto,
    p.descricao AS Produto, 
    l.numero_lote AS Lote, 
    l.data_validade AS Validade, 
    DATEDIFF(l.data_validade, CURDATE()) AS Dias_Para_Vencer,
    l.quantidade AS Qtd_Disponivel
FROM Produtos p
JOIN Lotes l ON p.id_produto = l.id_produto
WHERE l.data_validade BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
  AND l.quantidade > 0;

-- View 3: Alerta de Produtos com Estoque Abaixo do Mínimo (Atendimento a Requisito da Proposta)
CREATE OR REPLACE VIEW vw_alerta_estoque_baixo AS
SELECT 
    p.id_produto,
    p.descricao,
    p.estoque_minimo,
    COALESCE(SUM(CASE WHEN l.data_validade >= CURDATE() THEN l.quantidade ELSE 0 END), 0) AS estoque_atual,
    (p.estoque_minimo - COALESCE(SUM(CASE WHEN l.data_validade >= CURDATE() THEN l.quantidade ELSE 0 END), 0)) AS reposicao_sugerida
FROM Produtos p
LEFT JOIN Lotes l ON l.id_produto = p.id_produto
WHERE p.status_produto = 'ATIVO'
GROUP BY p.id_produto, p.descricao, p.estoque_minimo
HAVING estoque_atual < p.estoque_minimo;


-- =============================================================================
-- SEÇÃO 4: FUNCTIONS E PROCEDURES (LÓGICA DE NEGÓCIO)
-- =============================================================================

DELIMITER //

-- Function: Calcula o estoque disponível (corrigida para NOT DETERMINISTIC)
CREATE FUNCTION fn_estoque_disponivel(p_id_produto INT) 
RETURNS INT
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total INT;
    
    SELECT COALESCE(SUM(quantidade), 0) INTO v_total
    FROM Lotes
    WHERE id_produto = p_id_produto 
      AND data_validade >= CURDATE();
      
    RETURN v_total;
END //

-- Stored Procedure: Fechamento de Caixa com validações seguras
CREATE PROCEDURE sp_fechar_caixa(
    IN p_id_caixa INT, 
    IN p_valor_informado DECIMAL(10,2)
)
BEGIN
    DECLARE v_total_vendas DECIMAL(10,2);
    DECLARE v_status VARCHAR(20);
    
    -- Verifica o status atual do caixa
    SELECT status_caixa INTO v_status FROM Caixas WHERE id_caixa = p_id_caixa;
    
    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Erro: Caixa nao encontrado.';
    ELSEIF v_status = 'FECHADO' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Erro: Este caixa ja se encontra fechado.';
    END IF;

    -- Soma o valor de todas as vendas finalizadas no caixa informado
    SELECT COALESCE(SUM(valor_liquido), 0) INTO v_total_vendas
    FROM Vendas
    WHERE id_caixa = p_id_caixa AND status_venda = 'FINALIZADA';
    
    -- Atualiza o caixa
    UPDATE Caixas
    SET data_fechamento = NOW(),
        valor_fechamento = p_valor_informado,
        status_caixa = 'FECHADO'
    WHERE id_caixa = p_id_caixa;
    
    -- Retorna resumo consolidado
    SELECT p_id_caixa AS Caixa, 
           v_total_vendas AS Total_Vendas_Sistema, 
           p_valor_informado AS Valor_Informado,
           (p_valor_informado - v_total_vendas) AS Diferenca;
END //


-- =============================================================================
-- SEÇÃO 5: TRIGGERS (AUTOMAÇÕES E BLINDAGEM DO BANCO)
-- =============================================================================

-- Trigger 1: Validação de Vencimento, Saldo e Receituário Obrigatório
CREATE TRIGGER trg_valida_estoque_venda
BEFORE INSERT ON Vendas_Itens
FOR EACH ROW
BEGIN
    DECLARE v_validade DATE;
    DECLARE v_qtd_estoque INT;
    DECLARE v_precisa_receita BOOLEAN;
    DECLARE v_validade_receita DATE;

    -- 1. Busca dados do lote
    SELECT data_validade, quantidade INTO v_validade, v_qtd_estoque
    FROM Lotes 
    WHERE id_lote = NEW.id_lote;

    IF v_validade IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Erro: Lote informado nao existe.';
    END IF;

    -- Regra A: Bloqueia venda de lote vencido
    IF v_validade < CURDATE() THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Erro: Venda bloqueada. O produto deste lote está VENCIDO.';
    END IF;

    -- Regra B: Bloqueia venda se estoque no lote for insuficiente
    IF v_qtd_estoque < NEW.quantidade THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Erro: Venda bloqueada. Estoque insuficiente no lote selecionado.';
    END IF;

    -- Regra C: Validação de Medicamento Controlado (Exigência de Receita Médica Válida)
    SELECT precisa_receita INTO v_precisa_receita 
    FROM Produtos 
    WHERE id_produto = NEW.id_produto;

    IF v_precisa_receita = TRUE THEN
        IF NEW.id_receita IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Erro: Venda bloqueada. Medicamento controlado exige vinculo de receita medica valida.';
        ELSE
            -- Valida validade da receita
            SELECT validade_receita INTO v_validade_receita
            FROM Receitas
            WHERE id_receita = NEW.id_receita;

            IF v_validade_receita < CURDATE() THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Erro: Venda bloqueada. A receita medica vinculada esta VENCIDA.';
            END IF;
        END IF;
    END IF;
END //

-- Trigger 2: Baixa automática de estoque e registro de histórico FIFO
CREATE TRIGGER trg_baixa_estoque_venda
AFTER INSERT ON Vendas_Itens
FOR EACH ROW
BEGIN
    DECLARE v_id_funcionario INT;

    -- Identifica o funcionário responsável pela venda
    SELECT id_funcionario INTO v_id_funcionario 
    FROM Vendas 
    WHERE id_venda = NEW.id_venda;

    -- Baixa o estoque do lote
    UPDATE Lotes 
    SET quantidade = quantidade - NEW.quantidade 
    WHERE id_lote = NEW.id_lote;

    -- Registra o movimento rastreável
    INSERT INTO Movimentos_Estoque (
        id_produto, id_lote, id_venda, id_funcionario, 
        tipo_movimento, quantidade_movimentada, motivo
    ) VALUES (
        NEW.id_produto, NEW.id_lote, NEW.id_venda, v_id_funcionario, 
        'SAIDA', NEW.quantidade, 'Venda no PDV'
    );
END //

-- Trigger 3: Auditoria imutável de alteração de preço de venda
CREATE TRIGGER trg_log_preco_produto
AFTER UPDATE ON Produtos
FOR EACH ROW
BEGIN
    IF NEW.preco_venda <> OLD.preco_venda THEN
        INSERT INTO Log_Auditoria (
            nome_tabela, operacao, id_registro, dados_antes, dados_depois
        ) VALUES (
            'Produtos', 
            'UPDATE', 
            NEW.id_produto,
            JSON_OBJECT('preco_venda', OLD.preco_venda),
            JSON_OBJECT('preco_venda', NEW.preco_venda)
        );
    END IF;
END //

DELIMITER ;


-- =============================================================================
-- SEÇÃO 6: SEGURANÇA E GOVERNANÇA (RBAC - ROLES E PRIVILÉGIOS)
-- =============================================================================

CREATE ROLE IF NOT EXISTS 
    'role_ceo', 
    'role_dba', 
    'role_gerente', 
    'role_farmaceutico', 
    'role_atendente', 
    'role_caixa', 
    'role_estoquista';

-- Permissões Administrativas
GRANT ALL PRIVILEGES ON erp_farmacia.* TO 'role_ceo';
GRANT ALL PRIVILEGES ON erp_farmacia.* TO 'role_dba';

-- Permissões Gerenciais
GRANT SELECT, INSERT, UPDATE, DELETE ON erp_farmacia.* TO 'role_gerente';

-- Permissões Técnicas e Especializadas
GRANT SELECT ON erp_farmacia.Produtos TO 'role_farmaceutico';
GRANT SELECT ON erp_farmacia.Lotes TO 'role_farmaceutico';
GRANT SELECT, INSERT ON erp_farmacia.Vendas TO 'role_farmaceutico';
GRANT SELECT, INSERT, UPDATE ON erp_farmacia.Receitas TO 'role_farmaceutico';
GRANT SELECT, INSERT, UPDATE ON erp_farmacia.Receitas_Itens TO 'role_farmaceutico';
GRANT SELECT, INSERT ON erp_farmacia.Medicos TO 'role_farmaceutico';

GRANT SELECT ON erp_farmacia.Produtos TO 'role_atendente';
GRANT SELECT ON erp_farmacia.Lotes TO 'role_atendente';
GRANT SELECT, INSERT ON erp_farmacia.Clientes TO 'role_atendente';
GRANT SELECT, INSERT ON erp_farmacia.Vendas TO 'role_atendente';
GRANT SELECT, INSERT ON erp_farmacia.Vendas_Itens TO 'role_atendente';

GRANT SELECT ON erp_farmacia.Vendas TO 'role_caixa';
GRANT SELECT, INSERT ON erp_farmacia.Pagamentos TO 'role_caixa';
GRANT SELECT, INSERT, UPDATE ON erp_farmacia.Caixas TO 'role_caixa';

GRANT SELECT ON erp_farmacia.Produtos TO 'role_estoquista';
GRANT SELECT, INSERT, UPDATE ON erp_farmacia.Lotes TO 'role_estoquista';
GRANT SELECT, INSERT ON erp_farmacia.Movimentos_Estoque TO 'role_estoquista';
GRANT SELECT ON erp_farmacia.Fornecedores TO 'role_estoquista';
GRANT SELECT, INSERT, UPDATE ON erp_farmacia.Compras TO 'role_estoquista';
GRANT SELECT, INSERT, UPDATE ON erp_farmacia.Compras_Itens TO 'role_estoquista';


-- =============================================================================
-- SEÇÃO 7: CARGA INICIAL DE DADOS E TESTES OPERACIONAIS
-- =============================================================================

-- Inserção de Perfis Base
INSERT INTO Perfis (nome, descricao) VALUES 
('CEO', 'Acesso executivo total aos relatórios e configurações'),
('DBA', 'Administrador técnico da infraestrutura de banco de dados'),
('Gerente', 'Gerenciamento operacional diário da farmácia'),
('Farmaceutico', 'Responsável técnico por medicamentos controlados e receitas'),
('Atendente', 'Operação de balcão e atendimento ao cliente'),
('Caixa', 'Operação financeira e recebimentos do PDV'),
('Estoquista', 'Recebimento de mercadorias e controle de lotes');

-- Inserção de Pessoas e Vínculos
INSERT INTO Pessoas (tipo, nome) VALUES ('FISICA', 'Carlos Gerente');       -- ID 1
INSERT INTO Funcionarios (id_pessoa, id_perfil, cargo, matricula, senha_hash, data_admissao) 
VALUES (1, 3, 'GERENTE', 'MAT001', SHA2('senha123', 256), '2023-01-01');

INSERT INTO Pessoas (tipo, nome) VALUES ('FISICA', 'Ana Farmaceutica');     -- ID 2
INSERT INTO Funcionarios (id_pessoa, id_perfil, cargo, matricula, senha_hash, data_admissao) 
VALUES (2, 4, 'FARMACEUTICO', 'MAT002', SHA2('senha123', 256), '2023-02-01');

INSERT INTO Pessoas (tipo, nome) VALUES ('FISICA', 'Maria Cliente');        -- ID 3
INSERT INTO Clientes (id_pessoa) VALUES (3);

INSERT INTO Pessoas (tipo, razao_social, nome_fantasia) 
VALUES ('JURIDICA', 'Distribuidora Farmacêutica Nacional LTDA', 'DistriFarma'); -- ID 4
INSERT INTO Fornecedores (id_pessoa, inscricao_estadual) VALUES (4, '1234567890');

INSERT INTO Pessoas (tipo, nome) VALUES ('FISICA', 'Dr. Roberto Santos');   -- ID 5
INSERT INTO Medicos (id_pessoa, crm, uf_crm, especialidade) VALUES (5, '123456', 'SP', 'Clinico Geral');

-- Categorização
INSERT INTO Grupos (nome) VALUES ('Medicamentos'), ('Higiene e Beleza');
INSERT INTO Subgrupos (id_grupo, nome) VALUES 
(1, 'Analgesicos e Antipireticos'),
(1, 'Antibioticos (Controlados)');

-- Produtos
-- Produto 1: Isento de receita
INSERT INTO Produtos (descricao, e_medicamento, precisa_receita, id_grupo, id_subgrupo, preco_custo, preco_venda, estoque_minimo) 
VALUES ('Dipirona Monoidratada 500mg', TRUE, FALSE, 1, 1, 3.50, 12.00, 10);

-- Produto 2: Exige receita médica
INSERT INTO Produtos (descricao, e_medicamento, precisa_receita, id_grupo, id_subgrupo, preco_custo, preco_venda, estoque_minimo) 
VALUES ('Amoxicilina 500mg (Controlado)', TRUE, TRUE, 1, 2, 8.00, 28.50, 5);

-- Abertura de Caixa
INSERT INTO Caixas (id_funcionario, valor_abertura) VALUES (1, 150.00);

-- Entrada de Lotes
INSERT INTO Lotes (id_produto, id_fornecedor, numero_lote, data_fabricacao, data_validade, quantidade, preco_custo_lote) 
VALUES (1, 1, 'LOTE-DIP-01', '2024-01-01', '2028-12-31', 100, 3.50);

INSERT INTO Lotes (id_produto, id_fornecedor, numero_lote, data_fabricacao, data_validade, quantidade, preco_custo_lote) 
VALUES (2, 1, 'LOTE-AMX-01', '2024-02-01', '2027-10-30', 30, 8.00);

-- Cadastro de Receita Médica Válida
INSERT INTO Receitas (id_cliente, id_funcionario, id_medico, nome_prescritor, crm_prescritor, data_prescricao, validade_receita)
VALUES (1, 2, 1, 'Dr. Roberto Santos', '123456-SP', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 10 DAY));

-- Teste de Venda 1: Venda Normal (Dipirona)
INSERT INTO Vendas (numero_venda, id_cliente, id_funcionario, id_caixa, valor_total, status_venda) 
VALUES ('VND-001', 1, 1, 1, 24.00, 'ABERTA');

INSERT INTO Vendas_Itens (id_venda, id_produto, id_lote, id_receita, quantidade, preco_unitario, desconto) 
VALUES (1, 1, 1, NULL, 2, 12.00, 0.00);

-- Teste de Venda 2: Venda Controlada (Amoxicilina com Receita Vinculada)
INSERT INTO Vendas (numero_venda, id_cliente, id_funcionario, id_caixa, valor_total, status_venda) 
VALUES ('VND-002', 1, 2, 1, 28.50, 'ABERTA');

INSERT INTO Vendas_Itens (id_venda, id_produto, id_lote, id_receita, quantidade, preco_unitario, desconto) 
VALUES (2, 2, 2, 1, 1, 28.50, 0.00);

-- Verificação dos Resultados
SELECT 'ESTOQUE ATUALIZADO VIA VIEW' AS Titulo;
SELECT * FROM vw_estoque;

SELECT 'HISTORICO DE MOVIMENTACOES DE ESTOQUE GERADO POR TRIGGER' AS Titulo;
SELECT * FROM Movimentos_Estoque;
