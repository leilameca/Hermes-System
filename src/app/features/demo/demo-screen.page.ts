import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VEHICLES_MOCK } from '../../data/mocks/vehicles.mock';
import { RESERVATIONS_MOCK } from '../../data/mocks/reservations.mock';
import { TENANTS_MOCK } from '../../data/mocks/tenants.mock';
import { CUSTOMERS_MOCK } from '../../data/mocks/customers.mock';
import { Reservation } from '../../core/models';
import { DEMO_SPACES, DemoRole } from './demo-navigation';
import { DEMO_RECORDS } from './demo-records';
import { VEHICLE_STATUS } from '../../shared/presentation/vehicle.presentation';

@Injectable({ providedIn: 'root' })
export class DemoState {
  // TODO Backend: sustituir persistencia mock por API REST cuando inicie la etapa de integracion.
  readonly reservations = signal<readonly Reservation[]>(RESERVATIONS_MOCK.filter(r => r.customerId === 'customer-001'));
  readonly steps = signal<Record<string, { checks: boolean[]; evidence: boolean; signed: boolean }>>({});
  readonly incidents = signal([
    { title: 'INC-001 · Rayon en puerta derecha', detail: 'Toyota Corolla · puerta derecha · registrado durante entrega.', status: 'En revision' },
    { title: 'INC-002 · Objeto olvidado', detail: 'Bolso pequeno resguardado en mostrador de Santo Domingo.', status: 'Resuelto' },
  ]);
  readonly inspectionSaved = signal<Record<string, boolean>>({});
  readonly payments = signal<Record<string, string>>({});
  step(key: string) { return this.steps()[key] ?? { checks: [false, false, false, false], evidence: false, signed: false }; }
  update(key: string, patch: Partial<ReturnType<DemoState['step']>>) { this.steps.update(all => ({ ...all, [key]: { ...this.step(key), ...patch } })); }
  addIncident(detail: string) {
    this.incidents.update(rows => [{ title: 'INC-DEMO-' + (rows.length + 1), detail, status: 'Nuevo' }, ...rows]);
  }
  saveInspection(key: string) {
    this.inspectionSaved.update(rows => ({ ...rows, [key]: true }));
  }
  updatePayment(title: string, status: string) {
    this.payments.update(rows => ({ ...rows, [title]: status }));
  }
}

@Component({
  selector: 'app-demo-screen', standalone: true, imports: [RouterLink, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './demo-screen.page.html', styleUrl: './demo-screen.page.scss',
})
export class DemoScreenPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly state = inject(DemoState);
  readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly role = this.route.parent!.snapshot.data['role'] as DemoRole;
  readonly space = DEMO_SPACES[this.role];
  readonly kind = computed(() => this.data()['kind'] as string);
  readonly id = computed(() => this.params().get('id') ?? '');
  readonly vehicle = computed(() => VEHICLES_MOCK.find(v => v.id === (this.id() || this.query().get('vehiculo') || 'vehicle-002')));
  readonly company = computed(() => TENANTS_MOCK.find(t => t.id === this.id()));
  readonly reservation = computed(() => this.state.reservations().find(r => r.id === this.id()));
  readonly vehicles = VEHICLES_MOCK.filter(v => v.tenantId === 'tenant-001');
  readonly companies = TENANTS_MOCK;
  readonly customers = CUSTOMERS_MOCK.filter(c => c.tenantId === 'tenant-001');
  readonly statuses = VEHICLE_STATUS;
  readonly records = computed(() => DEMO_RECORDS[this.kind()] ?? []);
  readonly flow = computed(() => (this.data()['flow'] || (this.kind() === 'return' ? 'devolucion' : 'entrega')) as string);
  readonly stepKey = computed(() => this.flow() + '/' + this.id());
  readonly step = computed(() => this.state.step(this.stepKey()));
  readonly allChecked = computed(() => this.step().checks.every(Boolean));
  readonly filteredVehicles = computed(() => {
    const term = (this.query().get('q') || '').toLowerCase();
    const category = this.query().get('categoria') || '';
    return this.vehicles.filter(v => (v.brand + ' ' + v.model).toLowerCase().includes(term) && (!category || v.category === category));
  });
  search = this.route.snapshot.queryParamMap.get('q') || '';
  category = this.route.snapshot.queryParamMap.get('categoria') || '';
  startsAt = '2026-10-20';
  endsAt = '2026-10-23';
  driver = 'Laura Méndez';
  email = 'laura@example.com';
  phone = '809-555-0103';
  companyName = 'Quisqueya Rent-a-Car';
  notifications = true;
  signatureName = '';
  consent = false;
  message = '';
  incident = '';
  scanCode = 'A987601';
  readonly checks = ['Carrocería y cristales', 'Neumáticos y luces', 'Combustible y kilometraje', 'Documentos, llaves y accesorios'];
  readonly plans = [
    { name: 'Esencial', price: 1900, detail: 'Hasta 10 vehiculos · una sucursal', features: ['Reservas', 'Contratos mock', 'Soporte por correo'] },
    { name: 'Profesional', price: 4900, detail: 'Hasta 50 vehiculos · tres sucursales', features: ['Operaciones', 'Facturacion', 'Alertas de mantenimiento'] },
    { name: 'Empresarial', price: 9900, detail: 'Hasta 150 vehiculos · diez sucursales', features: ['Multiempresa', 'Roles avanzados', 'Reportes SaaS'] },
  ];
  readonly todayTasks = [
    { time: '09:00', title: 'Entrega Toyota Corolla', detail: 'Laura Mendez · reservation-001', path: 'entrega/vehicle-001' },
    { time: '11:30', title: 'Revision Hyundai Tucson', detail: 'Checklist preventivo · patio norte', path: 'devolucion/vehicle-002' },
    { time: '15:00', title: 'Seguimiento incidente', detail: 'Rayon puerta derecha · pendiente de fotos', path: 'incidentes' },
  ];
  readonly adminQueue = [
    { label: 'Reservas por confirmar', value: '3', path: 'reservas' },
    { label: 'Inspecciones pendientes', value: '4', path: 'inspecciones' },
    { label: 'Facturas abiertas', value: 'RD$ 12,000', path: 'facturacion' },
    { label: 'Servicios esta semana', value: '2', path: 'mantenimiento' },
  ];
  readonly platformHealth = [
    { label: 'Disponibilidad demo', value: '99.9%' },
    { label: 'Empresas activas', value: '2' },
    { label: 'Vehiculos monitoreados', value: '3' },
  ];
  link(path: string) { return '/' + this.role + '/' + path; }
  vehicleLink(id: string) { return this.link((this.role === 'admin' ? 'flota/' : 'vehiculos/') + id); }
  vehicleName(id: string) { const v = VEHICLES_MOCK.find(v => v.id === id); return v ? v.brand + ' ' + v.model : 'Vehículo'; }
  flowLink(suffix = '') { return this.link(this.flow() + '/' + this.id() + suffix); }
  get days() { return Math.max(0, (Date.parse(this.endsAt) - Date.parse(this.startsAt)) / 86400000); }
  searchVehicles() { void this.router.navigate([this.link('resultados')], { queryParams: { q: this.search, categoria: this.category } }); }
  createReservation() {
    if (!this.vehicle() || !Number.isFinite(this.days) || this.days < 1) { this.message = 'Selecciona una devolución posterior a la recogida.'; return; }
    const reservation: Reservation = { ...RESERVATIONS_MOCK[0], id: 'demo-' + (this.state.reservations().length + 1), vehicleId: this.vehicle()!.id, startsAt: this.startsAt + 'T09:00:00-04:00', endsAt: this.endsAt + 'T09:00:00-04:00', total: this.days * this.vehicle()!.dailyRate, status: 'pending' };
    this.state.reservations.update(rows => [...rows, reservation]);
    void this.router.navigate([this.link('reservas/' + reservation.id)]);
  }
  scan() {
    const found = this.vehicles.find(v => v.plate.toLowerCase() === this.scanCode.trim().toLowerCase() || v.id === this.scanCode.trim());
    if (found) void this.router.navigate([this.vehicleLink(found.id)]);
    else this.message = 'No se encontró esa placa. Prueba A987601 o G987602.';
  }
  check(index: number, value: boolean) { const checks = [...this.step().checks]; checks[index] = value; this.state.update(this.stepKey(), { checks }); }
  sign() {
    if (!this.signatureName.trim() || !this.consent) return;
    this.state.update(this.stepKey(), { signed: true });
    this.message = 'Operacion completada. Firma registrada en esta sesion.';
  }
  reportIncident() {
    if (!this.incident.trim()) return;
    this.state.addIncident(this.incident.trim());
    this.message = 'Incidente registrado en esta sesion.';
    this.incident = '';
  }
  simulateAction(label: string) {
    this.message = label + ' actualizado en esta sesion.';
  }
  saveInspection() {
    this.state.saveInspection(this.stepKey());
    this.message = 'Inspeccion guardada temporalmente.';
  }
}
