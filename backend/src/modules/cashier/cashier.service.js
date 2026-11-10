const cashierRepository = require('./cashier.repository');

class CashierService {
  createError(message, statusCode, errorCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.errorCode = errorCode;
    return error;
  }

  validatePositiveId(value, fieldName) {
    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw this.createError(
        `${fieldName} deve ser um identificador inteiro positivo.`,
        400,
        'INVALID_ID'
      );
    }

    return parsed;
  }

  validateMoney(value, fieldName) {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      !Number.isFinite(Number(value)) ||
      Number(value) < 0
    ) {
      throw this.createError(
        `${fieldName} deve ser um valor numérico maior ou igual a zero.`,
        400,
        'INVALID_MONEY_VALUE'
      );
    }

    return Number(value);
  }

  async getStatus(id_funcionario) {
    const funcionarioId = this.validatePositiveId(
      id_funcionario,
      'id_funcionario'
    );

    const current =
      await cashierRepository.findCurrentOpenByFuncionario(funcionarioId);

    if (current) {
      const summary = await cashierRepository.getCaixaSummary(
        current.id_caixa
      );

      return {
        possui_caixa_aberto: true,
        caixa: current,
        resumo_atual: summary
      };
    }

    const anyOpen = await cashierRepository.findAnyOpenCaixa();

    return {
      possui_caixa_aberto: false,
      existe_caixa_aberto_outro_operador: Boolean(anyOpen)
    };
  }

  async openCaixa(id_funcionario, valor_abertura) {
    const funcionarioId = this.validatePositiveId(
      id_funcionario,
      'id_funcionario'
    );

    const valorAbertura = this.validateMoney(
      valor_abertura,
      'valor_abertura'
    );

    const openExists =
      await cashierRepository.findCurrentOpenByFuncionario(funcionarioId);

    if (openExists) {
      throw this.createError(
        `Colaborador já possui o caixa ${openExists.id_caixa} aberto.`,
        409,
        'CASHIER_ALREADY_OPEN'
      );
    }

    const idCaixa = await cashierRepository.openCaixa(
      funcionarioId,
      valorAbertura
    );

    const caixa = await cashierRepository.findById(idCaixa);

    if (!caixa) {
      throw this.createError(
        'O caixa foi registrado, mas não foi possível recuperar seus dados.',
        500,
        'CASHIER_CREATED_BUT_NOT_RETRIEVED'
      );
    }

    return {
      message: 'Sessão de caixa aberta com sucesso!',
      caixa
    };
  }

  async closeCaixa(
    id_funcionario,
    id_caixa,
    valor_informado_dinheiro
  ) {
    const funcionarioId = this.validatePositiveId(
      id_funcionario,
      'id_funcionario'
    );

    const caixaId = this.validatePositiveId(
      id_caixa,
      'id_caixa'
    );

    const valorInformado = this.validateMoney(
      valor_informado_dinheiro,
      'valor_informado_dinheiro'
    );

    const caixa = await cashierRepository.findById(caixaId);

    if (!caixa) {
      throw this.createError(
        `Caixa ${caixaId} não encontrado.`,
        404,
        'CASHIER_NOT_FOUND'
      );
    }

    if (Number(caixa.id_funcionario) !== funcionarioId) {
      throw this.createError(
        'Você não possui autorização para fechar este caixa.',
        403,
        'CASHIER_ACCESS_DENIED'
      );
    }

    if (caixa.status_caixa !== 'ABERTO') {
      throw this.createError(
        'Este caixa não está aberto.',
        409,
        'CASHIER_ALREADY_CLOSED'
      );
    }

    const procedureResult =
      await cashierRepository.closeCaixaWithProcedure(
        caixaId,
        valorInformado
      );

    if (!procedureResult) {
      throw this.createError(
        'A procedure não retornou os dados esperados do fechamento.',
        500,
        'CASHIER_CLOSE_RESULT_INVALID'
      );
    }

    const diferenca = Number(procedureResult.Diferenca);

    if (!Number.isFinite(diferenca)) {
      throw this.createError(
        'A procedure retornou uma diferença financeira inválida.',
        500,
        'CASHIER_CLOSE_RESULT_INVALID'
      );
    }

    let situacao = 'FECHADO_SEM_DIVERGENCIA';

    if (diferenca > 0) {
      situacao = 'SOBRA_DE_CAIXA';
    } else if (diferenca < 0) {
      situacao = 'FALTA_DE_CAIXA';
    }

    return {
      id_caixa: Number(procedureResult.Caixa ?? caixaId),
      status: 'FECHADO',
      total_vendas_sistema: Number(procedureResult.Total_Vendas_Sistema),
      valor_dinheiro_informado: Number(procedureResult.Valor_Informado),
      diferenca,
      situacao
    };
  }

  async getSummary(id_funcionario, id_caixa) {
    const funcionarioId = this.validatePositiveId(
      id_funcionario,
      'id_funcionario'
    );

    const caixaId = this.validatePositiveId(
      id_caixa,
      'id_caixa'
    );

    const caixa = await cashierRepository.findById(caixaId);

    if (!caixa) {
      throw this.createError(
        `Caixa ${caixaId} não encontrado.`,
        404,
        'CASHIER_NOT_FOUND'
      );
    }

    if (Number(caixa.id_funcionario) !== funcionarioId) {
      throw this.createError(
        'Você não possui autorização para consultar este caixa.',
        403,
        'CASHIER_ACCESS_DENIED'
      );
    }

    return cashierRepository.getCaixaSummary(caixaId);
  }

  async getHistory(filters = {}) {
    return cashierRepository.getHistory(filters);
  }
}

module.exports = new CashierService();