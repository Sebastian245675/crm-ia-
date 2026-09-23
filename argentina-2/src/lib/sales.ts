/** Un pedido confirmado es la única fuente de ingreso de ventas del sistema. */
export const REAL_SALE_STATUS = 'confirmed' as const;

export const isRealSaleOrder = (order: { status?: unknown } | null | undefined): boolean =>
  String(order?.status || '').trim().toLowerCase() === REAL_SALE_STATUS;

export const sumRealSales = <T extends { status?: unknown; total?: unknown }>(orders: T[]): number =>
  orders.reduce((sum, order) => isRealSaleOrder(order) ? sum + (Number(order.total) || 0) : sum, 0);
