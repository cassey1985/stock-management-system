/**
 * Currency utility functions for the Philippine Peso (PHP) formatting
 */

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

export const formatCurrencyShort = (amount: number): string => {
  if (Math.abs(amount) >= 1000000) {
    return `₱${(amount / 1000000).toFixed(1)}M`;
  } else if (Math.abs(amount) >= 1000) {
    return `₱${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
};

export const parseCurrency = (value: string): number => {
  // Remove PHP symbol, commas, and parse as float
  return parseFloat(value.replace(/[₱,\s]/g, '')) || 0;
};

export const CURRENCY_SYMBOL = '₱';
export const CURRENCY_CODE = 'PHP';
export const CURRENCY_NAME = 'Philippine Peso';
