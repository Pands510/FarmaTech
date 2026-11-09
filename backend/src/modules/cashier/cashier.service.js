const cashierRepository = require('./cashier.repository');

class CashierService {
  async getStatus(id_funcionario) {
    const current = await cashierRepository.findCurrentOpenByFuncionario(id_funcionario);
    if (current) {
      const summary = await cashierRepository.getCaixaSummary(current.id_caixa);
      return {
        possui_caixa_aberto: true,
        caixa: current,
        resumo_atual: summary
      };
    }

    // Se não encontrou do funcionário, verifica se há outro caixa aberto geral
    const anyOpen = await cashierRepository.findAnyOpenCaixa();

    return {
      possui_caixa_aberto: false,
      caixa_aberto_outro_operador: anyOpen || null
    };
  }

  async openCaixa(id_funcionario, valor_abertura) {
    // Verifica se já possui caixa aberto
    const openExists = await cashierRepository.findCurrentOpenByFuncionario(id_funcionario);
    if (openExists) {
      const err = new Error(`Colaborador já possui o caixa ${openExists.id_caixa} aberto desde ${openExists.data_abertura}.`);
      err.statusCode = 400;
      err.errorCode = 'CASHIER_ALREADY_OPEN';
      throw err;
    }

    const valorAberturaNum = Number(valor_abertura) || 0;
    if (valorAberturaNum < 0) {
      const err = new Error('O valor de abertura não pode ser negativo.');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }

    const id_caixa = await cashierRepository.openCaixa(id_funcionario, valorAberturaNum);
    const caixa = await cashierRepository.findById(id_caixa);

    return {
      message: 'Sessão de caixa aberta com sucesso!',
      caixa
    };
  }

  async closeCaixa(id_caixa, valor_informado_dinheiro) {
    if (!id_caixa) {
      const err = new Error('Identificador do caixa (id_caixa) é obrigatório.');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }

    const valorInformadoNum = Number(valor_informado_dinheiro);
    if (isNaN(valorInformadoNum) || valorInformadoNum < 0) {
      const err = new Error('Informe o valor físico em dinheiro apurado na gaveta (deve ser maior ou igual a zero).');
      err.statusCode = 400;
      err.errorCode = 'VALIDATION_ERROR';
      throw err;
    }

    // Chama a Stored Procedure sp_fechar_caixa
    const procedureResult = await cashierRepository.closeCaixaWithProcedure(id_caixa, valorInformadoNum);

    const diferenca = Number(procedureResult?.Diferenca || 0);
    let situacao = 'FECHADO_SEM_DIVERGENCIA';
    if (diferenca > 0) {
      situacao = 'SOBRA_DE_CAIXA';
    } else if (diferenca < 0) {
      situacao = 'FALTA_DE_CAIXA';
    }

    return {
      id_caixa: Number(procedureResult?.Caixa || id_caixa),
      status: 'FECHADO',
      total_vendas_sistema: Number(procedureResult?.Total_Vendas_Sistema || 0),
      valor_dinheiro_informado: Number(procedureResult?.Valor_Informado || valorInformadoNum),
      diferenca,
      situacao
    };
  }

  async getSummary(id_caixa) {
    const caixa = await cashierRepository.findById(id_caixa);
    if (!caixa) {
      const err = new Error(`Caixa ${id_caixa} não encontrado.`);
      err.statusCode = 404;
      err.errorCode = 'CASHIER_NOT_FOUND';
      throw err;
    }
    return await cashierRepository.getCaixaSummary(id_caixa);
  }

  async getHistory(filters) {
    return await cashierRepository.getHistory(filters);
  }
}

module.exports = new CashierService();
