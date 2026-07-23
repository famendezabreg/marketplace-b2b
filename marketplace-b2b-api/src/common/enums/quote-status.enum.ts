export enum QuoteRequestStatus {
  PENDIENTE = 'pendiente', // esperando respuesta del proveedor
  RESPONDIDA = 'respondida', // proveedor ya respondio con precio
  ACEPTADA = 'aceptada', // comprador acepto -> genera orden
  RECHAZADA = 'rechazada', // comprador rechazo
  EXPIRADA = 'expirada', // se vencio el tiempo de reserva
}
