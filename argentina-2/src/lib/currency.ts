/** Sistema monetario único de la aplicación: pesos mexicanos. */
export const formatCurrency = (value: number | string | null | undefined): string => {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
};

export const CURRENCY_CODE = 'MXN' as const;
