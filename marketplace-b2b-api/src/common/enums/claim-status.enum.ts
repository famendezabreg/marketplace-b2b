export enum ClaimStatus {
  // Recien creado por el comprador, esperando que el proveedor o el admin lo revisen
  PENDIENTE = 'pendiente',
  // Se aprobo el reembolso al comprador (fuera del sistema, simulado igual que
  // liquidaciones/comisiones -- no hay pasarela real de reembolso)
  REEMBOLSO_APROBADO = 'reembolso_aprobado',
  // Se le indica al comprador que lleve el producto al proveedor para un cambio fisico
  CAMBIO_APROBADO = 'cambio_aprobado',
  // El reclamo fue revisado y rechazado
  RECHAZADO = 'rechazado',
}
