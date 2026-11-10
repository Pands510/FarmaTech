
/**
 * Utilitários de formatação para o Frontend FarmaTech.
 */

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short'
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short'
});

export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') {
    return currencyFormatter.format(0);
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '-';
  }

  return currencyFormatter.format(number);
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';

  // Trata datas SQL no formato YYYY-MM-DD sem conversão de fuso horário.
  if (typeof dateString === 'string') {
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      const [, year, month, day] = match;
      const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      );

      if (
        date.getFullYear() !== Number(year) ||
        date.getMonth() !== Number(month) - 1 ||
        date.getDate() !== Number(day)
      ) {
        return '-';
      }

      return dateFormatter.format(date);
    }
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return dateFormatter.format(date);
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '-';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return dateTimeFormatter.format(date);
};
