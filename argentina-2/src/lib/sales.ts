/** Las ventas confirmadas y las devoluciones negativas afectan el ingreso neto. */
export const REAL_SALE_STATUS = 'confirmed' as const;

export const isRealSaleOrder = (order: { status?: unknown; total?: unknown } | null | undefined): boolean => {
  const status = String(order?.status || '').trim().toLowerCase();
  if (status === REAL_SALE_STATUS) return true;

  // El POS envía cancelaciones/devoluciones como movimientos negativos separados.
  const isReversal = ['cancelled', 'canceled', 'refunded', 'returned'].includes(status);
  return isReversal && Number(order?.total) < 0;
};

export const sumRealSales = <T extends { status?: unknown; total?: unknown }>(orders: T[]): number =>
  orders.reduce((sum, order) => isRealSaleOrder(order) ? sum + (Number(order.total) || 0) : sum, 0);
