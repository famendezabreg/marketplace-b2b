export enum OrderStatus {
  CREADA = 'creada',
  CONFIRMADA = 'confirmada',
  EN_PREPARACION = 'en_preparacion',
  DESPACHADA = 'despachada',
  RECIBIDA = 'recibida',
  CANCELADA = 'cancelada',
}

// Transiciones validas: la clave es el estado actual, el valor son los estados a los que puede pasar
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREADA]: [OrderStatus.CONFIRMADA, OrderStatus.CANCELADA],
  [OrderStatus.CONFIRMADA]: [OrderStatus.EN_PREPARACION, OrderStatus.CANCELADA],
  [OrderStatus.EN_PREPARACION]: [OrderStatus.DESPACHADA, OrderStatus.CANCELADA],
  [OrderStatus.DESPACHADA]: [OrderStatus.RECIBIDA],
  [OrderStatus.RECIBIDA]: [],
  [OrderStatus.CANCELADA]: [],
};
