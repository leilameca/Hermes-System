export interface DemoRecord {
  title: string;
  detail: string;
  status: string;
  meta: string;
  amount?: number;
  action?: string;
}

// Contenido exclusivamente local para recorrer las areas principales de la maqueta.
export const DEMO_RECORDS: Record<string, DemoRecord[]> = {
  contratos: [
    { title: 'CTR-2026-001 · Laura Mendez', detail: 'Toyota Corolla · 12-15 oct. 2026 · deposito cubierto y conductor principal validado.', status: 'Pendiente de firma', meta: 'Reserva reservation-001', action: 'Ver contrato mock' },
    { title: 'CTR-2026-004 · Cuenta corporativa', detail: 'Hyundai Tucson · tarifa convenio · cobertura extendida incluida.', status: 'Borrador', meta: 'Sucursal Santo Domingo', action: 'Revisar borrador' },
  ],
  facturas: [
    { title: 'FAC-2026-001', detail: 'Alquiler Toyota Corolla · 3 dias · vencimiento 12 oct. 2026.', status: 'Pendiente', meta: 'Metodo: tarjeta terminada en 4421', amount: 8400, action: 'Ver factura mock' },
    { title: 'FAC-2026-000', detail: 'Cargo administrativo de demostracion sin cobro real.', status: 'Pagada', meta: 'Referencia academica', amount: 1250, action: 'Abrir recibo' },
  ],
  facturacion: [
    { title: 'FAC-2026-001 · Laura Mendez', detail: 'Alquiler · vencimiento 12 oct. 2026 · sin pasarela conectada.', status: 'Pendiente', meta: 'Reserva reservation-001', amount: 8400, action: 'Marcar como pagada' },
    { title: 'FAC-2026-002 · Taller externo', detail: 'Servicio preventivo Hyundai Tucson · orden interna MAN-002.', status: 'En revision', meta: 'Proveedor AutoCare SD', amount: 3600, action: 'Aprobar factura' },
  ],
  incidentes: [
    { title: 'INC-001 · Rayon en puerta derecha', detail: 'Toyota Corolla · registrado en inspeccion inicial · sin cargo asignado.', status: 'En revision', meta: 'Prioridad media', action: 'Abrir caso' },
    { title: 'INC-002 · Objeto olvidado', detail: 'Se conserva en caja de objetos de la sucursal hasta retiro del cliente.', status: 'Resuelto', meta: 'Cliente notificado', action: 'Ver cierre' },
  ],
  inspecciones: [
    { title: 'INS-001 · Toyota Corolla', detail: 'Entrega · 12 oct. 2026 · agente Carlos · 4 puntos por revisar.', status: 'Programada', meta: '09:00 a. m.', action: 'Abrir inspeccion' },
    { title: 'INS-002 · Hyundai Tucson', detail: 'Revision general · 11 oct. 2026 · sin novedades.', status: 'Completada', meta: 'Kilometraje 12,600 km', action: 'Ver acta' },
  ],
  mantenimiento: [
    { title: 'MAN-001 · Toyota Corolla', detail: 'Cambio de aceite · proximo servicio: 30,000 km.', status: 'Programado', meta: 'Taller interno', amount: 2200, action: 'Actualizar estado' },
    { title: 'MAN-002 · Hyundai Tucson', detail: 'Revision de neumaticos · cita 20 oct. 2026.', status: 'Pendiente', meta: 'Prioridad baja', amount: 3600, action: 'Asignar taller' },
  ],
  suscripciones: [
    { title: 'Quisqueya Rent-a-Car', detail: 'Plan Profesional · renovacion: 1 nov. 2026.', status: 'Activa', meta: '50 vehiculos incluidos', amount: 4900, action: 'Gestionar plan' },
    { title: 'Cibao Auto Rental', detail: 'Plan Esencial · renovacion: 1 nov. 2026.', status: 'Activa', meta: '10 vehiculos incluidos', amount: 1900, action: 'Ver suscripcion' },
  ],
};
