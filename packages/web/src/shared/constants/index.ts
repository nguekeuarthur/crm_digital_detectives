// Constants for formatting and currency
export const CURRENCY = {
  symbol: 'CHF',
  locale: 'fr-CH',
  fractionDigits: 2,
};

export const formatCurrency = (value: number, currency = CURRENCY): string => {
  return value.toLocaleString(currency.locale, {
    style: 'currency',
    currency: currency.symbol,
    minimumFractionDigits: currency.fractionDigits,
    maximumFractionDigits: currency.fractionDigits,
  });
};

export const formatNumber = (value: number, locale = CURRENCY.locale): string => {
  return value.toLocaleString(locale);
};

export const formatDate = (date: Date | string, locale = CURRENCY.locale): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale);
};

export const formatDateTime = (date: Date | string, locale = CURRENCY.locale): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const MANDATE_STATUSES = {
  OUVERT: { label: 'Ouvert', color: 'blue' },
  EN_ATTENTE: { label: 'En attente', color: 'yellow' },
  EN_COURS: { label: 'En cours', color: 'green' },
  CLOTURE: { label: 'Clôturé', color: 'gray' },
};

export const CLIENT_STATUSES = {
  PROSPECT: { label: 'Prospect', color: 'gray' },
  ACTIF: { label: 'Actif', color: 'green' },
  INACTIF: { label: 'Inactif', color: 'red' },
};
