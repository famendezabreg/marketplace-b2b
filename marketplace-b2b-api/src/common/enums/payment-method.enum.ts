export enum PaymentMethod {
  // Pago simulado con tarjeta: el comprador "paga" a la plataforma al momento de
  // solicitar la cotizacion. La plataforma recibe el dinero completo, y luego le
  // debe pagar al proveedor su parte (ver Settlement, flujo ya existente).
  TARJETA = 'tarjeta',
  // Pago en efectivo al momento de la entrega: el proveedor recibe el dinero
  // directamente del comprador, NO la plataforma. Por eso la direccion del cobro
  // se invierte: es el proveedor quien le debe la comision a la plataforma
  // (ver CommissionCharge, que se genera automaticamente al marcar la orden "recibida").
  EFECTIVO_CONTRA_ENTREGA = 'efectivo_contra_entrega',
}
