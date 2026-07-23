export enum CommissionChargeStatus {
  // El proveedor todavia no le ha transferido la comision a la plataforma
  PENDIENTE = 'pendiente',
  // El admin confirmo que ya recibio la comision de parte del proveedor
  PAGADA = 'pagada',
}
