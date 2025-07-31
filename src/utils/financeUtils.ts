export const roundToNearest500Or1000 = (amount: number): number => {
  const remainder = amount % 1000;
  if (remainder <= 500) {
    return Math.floor(amount / 1000) * 1000 + (remainder > 0 ? 500 : 0);
  } else {
    return Math.ceil(amount / 1000) * 1000;
  }
};

export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};