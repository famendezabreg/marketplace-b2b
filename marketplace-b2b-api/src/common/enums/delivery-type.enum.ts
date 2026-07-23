export enum DeliveryType {
  // Entregar en la direccion de envio registrada en el perfil del comprador
  DIRECCION_REGISTRADA = 'direccion_registrada',
  // Entregar en una direccion distinta, especificada en la solicitud de cotizacion
  OTRA_DIRECCION = 'otra_direccion',
  // El comprador recoge en el local/direccion del proveedor
  RECOGER_EN_LOCAL = 'recoger_en_local',
}
