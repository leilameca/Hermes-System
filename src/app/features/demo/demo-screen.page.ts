import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import {
  alertCircleOutline,
  businessOutline,
  carSportOutline,
  cubeOutline,
  funnelOutline,
  keyOutline,
  returnDownBackOutline,
  scanOutline,
  searchOutline,
  swapHorizontalOutline,
} from 'ionicons/icons';
import { Branch, Customer, Reservation, Vehicle } from '../../core/models';
import { DEMO_SPACES, DemoRole } from './demo-navigation';
import { DEMO_RECORDS } from './demo-records';
import { VEHICLE_STATUS } from '../../shared/presentation/vehicle.presentation';
import { NetworkService } from '../../core/services/network.service';
import { OfflineService } from '../../core/services/offline.service';
import { AuthService } from '../../core/services/auth.service';
import { AdminReservationInput, HermesContractRecord, HermesDataService, NewCustomerAccountInput, NewCustomerInput } from '../../core/services/hermes-data.service';
import { DocumentPrintService } from '../../core/services/document-print.service';

@Injectable({ providedIn: 'root' })
export class DemoState {
  private readonly data = inject(HermesDataService);
  readonly reservations = this.data.reservations;
  readonly vehicles = this.data.vehicles;
  readonly customers = this.data.customers;
  readonly branches = this.data.branches;
  readonly members = this.data.members;
  readonly operations = this.data.operations;
  readonly contracts = this.data.contracts;
  readonly organizations = this.data.organizations;
  readonly customerLocations = this.data.customerLocations;
  readonly loading = this.data.loading;
  readonly error = this.data.error;
  readonly steps = signal<Record<string, { checks: boolean[]; evidence: boolean; signed: boolean }>>({});
  readonly incidents = this.data.incidents;
  readonly inspectionSaved = signal<Record<string, boolean>>({});
  readonly payments = signal<Record<string, string>>({});
  step(key: string) { return this.steps()[key] ?? { checks: [false, false, false, false], evidence: false, signed: false }; }
  update(key: string, patch: Partial<ReturnType<DemoState['step']>>) { this.steps.update(all => ({ ...all, [key]: { ...this.step(key), ...patch } })); }
  addIncident(detail: string) {
    this.incidents.update(rows => [{ id: crypto.randomUUID(), title: 'Incidente reportado desde HERMES', detail, status: 'open', createdAt: new Date().toISOString() }, ...rows]);
  }
  saveInspection(key: string) {
    this.inspectionSaved.update(rows => ({ ...rows, [key]: true }));
  }
  updatePayment(title: string, status: string) {
    this.payments.update(rows => ({ ...rows, [title]: status }));
  }
  refresh() { return this.data.refresh(); }
  createVehicle(vehicle: Omit<Vehicle, 'id' | 'tenantId'>) { return this.data.createVehicle(vehicle); }
  createReservation(vehicle: Vehicle, startsAt: string, endsAt: string, total: number) { return this.data.createReservation(vehicle, startsAt, endsAt, total); }
  createAdminReservation(reservation: AdminReservationInput) { return this.data.createAdminReservation(reservation); }
  confirmReservation(id: string) { return this.data.confirmReservation(id); }
  createCustomer(customer: NewCustomerInput) { return this.data.createCustomer(customer); }
  createCustomerAccount(customer: NewCustomerAccountInput) { return this.data.createCustomerAccount(customer); }
  updateCustomer(id: string, customer: NewCustomerInput & { active: boolean }) { return this.data.updateCustomer(id, customer); }
  deleteCustomer(id: string) { return this.data.deleteCustomer(id); }
  customerHistory(id: string) { return this.data.customerHistory(id); }
  uploadCustomerDocument(id: string, file: File, type: 'license' | 'identity' | 'contract' | 'other') { return this.data.uploadCustomerDocument(id, file, type); }
  updateVehicle(id: string, vehicle: Partial<Omit<Vehicle, 'id' | 'tenantId'>>) { return this.data.updateVehicle(id, vehicle); }
  deleteVehicle(id: string) { return this.data.deleteVehicle(id); }
  uploadVehicleImage(file: File) { return this.data.uploadVehicleImage(file); }
  uploadOperationEvidence(vehicleId: string, file: File) { return this.data.uploadOperationEvidence(vehicleId, file); }
  updateReservation(id: string, reservation: { startsAt: string; endsAt: string; status: Reservation['status']; total: number; notes?: string }) { return this.data.updateReservation(id, reservation); }
  cancelOwnReservation(id: string) { return this.data.cancelOwnReservation(id); }
  createBranch(branch: { name: string; city: string; address: string }) { return this.data.createBranch(branch); }
  updateBranch(id: string, branch: { name: string; city: string; address: string; active: boolean }) { return this.data.updateBranch(id, branch); }
  deleteBranch(id: string) { return this.data.deleteBranch(id); }
  updateMember(id: string, role: 'admin' | 'agent', active: boolean) { return this.data.updateMember(id, role, active); }
  completeOperation(input: { vehicleId: string; type: 'delivery' | 'return'; checks: boolean[]; evidenceUrls: string[]; signatureName: string }) { return this.data.completeOperation(input); }
}

@Component({
  selector: 'app-demo-screen', standalone: true, imports: [RouterLink, FormsModule, CurrencyPipe, DatePipe, IonIcon],
  templateUrl: './demo-screen.page.html', styleUrl: './demo-screen.page.scss',
})
export class DemoScreenPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  // Lee si el dispositivo tiene conexión
  private readonly network = inject(NetworkService);

  // Guarda temporalmente las operaciones sin conexión
  private readonly offline = inject(OfflineService);
  private readonly auth = inject(AuthService);
  private readonly printer = inject(DocumentPrintService);
  readonly state = inject(DemoState);
  readonly currentUser = this.auth.user;
  readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly role = this.route.parent!.snapshot.data['role'] as DemoRole;
  readonly space = DEMO_SPACES[this.role];
  readonly kind = computed(() => this.data()['kind'] as string);
  readonly id = computed(() => this.params().get('id') ?? '');
  readonly vehicle = computed(() => {
    const requestedId = this.id() || this.query().get('vehiculo') || this.state.vehicles()[0]?.id;
    return this.state.vehicles().find(v => v.id === requestedId);
  });
  readonly company = computed(() => this.state.organizations().find(t => t.id === this.id()));
  readonly reservation = computed(() => this.state.reservations().find(r => r.id === this.id()));
  readonly vehicles = this.state.vehicles;
  readonly companies = this.state.organizations;
  readonly customers = this.state.customers;
  readonly branches = this.state.branches;
  readonly members = this.state.members;
  readonly operations = this.state.operations;
  readonly contracts = this.state.contracts;
  readonly statuses = VEHICLE_STATUS;
  readonly records = computed(() => DEMO_RECORDS[this.kind()] ?? []);
  readonly flow = computed(() => (this.data()['flow'] || (this.kind() === 'return' ? 'devolucion' : 'entrega')) as string);
  readonly stepKey = computed(() => this.flow() + '/' + this.id());
  readonly step = computed(() => this.state.step(this.stepKey()));
  readonly allChecked = computed(() => this.step().checks.every(Boolean));
  readonly fleetStatusFilter = signal<'all' | Vehicle['status']>('all');
  readonly reservationFilter = signal<'active' | 'completed' | 'cancelled'>('active');
  readonly filteredVehicles = computed(() => {
    const term = (this.role === 'admin' ? this.fleetSearch : (this.query().get('q') || '')).trim().toLowerCase();
    const category = this.query().get('categoria') || '';
    const status = this.fleetStatusFilter();
    return this.vehicles().filter(v => [v.brand, v.model, v.plate].join(' ').toLowerCase().includes(term)
      && (!category || v.category === category) && (status === 'all' || v.status === status));
  });
  readonly filteredReservations = computed(() => this.state.reservations().filter(reservation => {
    const filter = this.reservationFilter();
    return filter === 'active' ? ['pending', 'confirmed'].includes(reservation.status) : reservation.status === filter;
  }));
  search = this.route.snapshot.queryParamMap.get('q') || '';
  fleetSearch = '';
  category = this.route.snapshot.queryParamMap.get('categoria') || '';
  startsAt = '2026-10-20';
  endsAt = '2026-10-23';
  driver = 'Laura Méndez';
  email = 'laura@example.com';
  phone = '809-555-0103';
  profileName = this.currentUser()?.name ?? '';
  companyName = 'Quisqueya Rent-a-Car';
  notifications = true;
  signatureName = '';
  consent = false;
  message = '';
  incident = '';
  scanCode = 'A987601';
  customerSearch = '';
  customerFormOpen = false;
  createCustomerAccess = false;
  temporaryPassword = '';
  newCustomer: NewCustomerInput = {
    name: '', email: '', phone: '', documentType: 'cedula', documentNumber: '', driverLicense: '', city: 'Santo Domingo',
  };
  newVehicle: Pick<Vehicle, 'brand' | 'model' | 'year' | 'plate' | 'category' | 'transmission' | 'seats' | 'dailyRate' | 'mileage' | 'status'> = {
    brand: '', model: '', year: 2026, plate: '', category: 'suv', transmission: 'automatic', seats: 5, dailyRate: 3500, mileage: 0, status: 'available',
  };
  vehicleImagePreview = '';
  vehicleImageName = '';
  vehicleImageError = '';
  vehicleImageFile?: File;
  editingVehicle = false;
  editVehicle: Pick<Vehicle, 'brand' | 'model' | 'year' | 'plate' | 'category' | 'transmission' | 'seats' | 'dailyRate' | 'mileage' | 'status' | 'branchId'> = {
    brand: '', model: '', year: 2026, plate: '', category: 'suv', transmission: 'automatic', seats: 5, dailyRate: 0, mileage: 0, status: 'available', branchId: '',
  };
  editingCustomerId = '';
  customerActive = true;
  expandedCustomerId = '';
  editingReservationId = '';
  adminReservationFormOpen = false;
  newAdminReservation = {
    customerId: '', vehicleId: '', pickupBranchId: '', returnBranchId: '', startsAt: '', endsAt: '', total: 0, notes: '',
  };
  reservationEdit = { startsAt: '', endsAt: '', status: 'pending' as Reservation['status'], total: 0, notes: '' };
  branchFormOpen = false;
  editingBranchId = '';
  branchForm: Pick<Branch, 'name' | 'city' | 'address' | 'active'> = { name: '', city: '', address: '', active: true };
  operationEvidenceFile?: File;
  operationEvidencePreview = '';
  readonly checks = ['Carrocería y cristales', 'Neumáticos y luces', 'Combustible y kilometraje', 'Documentos, llaves y accesorios'];
  readonly plans = [
    { name: 'Esencial', price: 1900, detail: 'Hasta 10 vehiculos · una sucursal', features: ['Reservas', 'Contratos', 'Soporte por correo'] },
    { name: 'Profesional', price: 4900, detail: 'Hasta 50 vehiculos · tres sucursales', features: ['Operaciones', 'Facturacion', 'Alertas de mantenimiento'] },
    { name: 'Empresarial', price: 9900, detail: 'Hasta 150 vehiculos · diez sucursales', features: ['Multiempresa', 'Roles avanzados', 'Reportes SaaS'] },
  ];
  readonly nextOperation = computed(() => this.operations().find(operation => operation.status === 'scheduled'));
  readonly featuredVehicle = computed(() => this.vehicles().find(vehicle => vehicle.status === 'available') ?? this.vehicles()[0]);
  readonly latestClientReservation = computed(() => this.state.reservations()[0]);
  readonly todayTasks = computed(() => this.operations().filter(operation => operation.status !== 'cancelled').map(operation => ({
    time: new Date(operation.scheduledAt).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
    title: `${operation.type === 'delivery' ? 'Entrega' : 'Devolución'} ${this.vehicleName(operation.vehicleId)}`,
    detail: `${this.customerName(operation.customerId)} · ${this.vehiclePlate(operation.vehicleId)}`,
    path: `${operation.type === 'delivery' ? 'entrega' : 'devolucion'}/${operation.vehicleId}`,
  })));
  readonly adminQueue = [
    { label: 'Reservas por confirmar', value: '3', path: 'reservas' },
    { label: 'Inspecciones pendientes', value: '4', path: 'inspecciones' },
    { label: 'Facturas abiertas', value: 'RD$ 12,000', path: 'facturacion' },
    { label: 'Servicios esta semana', value: '2', path: 'mantenimiento' },
  ];
  readonly platformHealth = [
    { label: 'Disponibilidad operativa', value: '99.9%' },
    { label: 'Empresas activas', value: '2' },
    { label: 'Vehiculos monitoreados', value: '3' },
  ];
  readonly adminMetrics = computed(() => [
    { label: 'Reservas activas', value: String(this.state.reservations().filter(row => ['pending', 'confirmed'].includes(row.status)).length), trend: 'Supabase' },
    { label: 'Vehículos disponibles', value: String(this.vehicles().filter(row => row.status === 'available').length), trend: `${this.vehicles().length} total` },
    { label: 'Clientes registrados', value: String(this.customers().length), trend: 'Activos' },
    { label: 'Reservas facturadas', value: new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 }).format(this.state.reservations().reduce((sum, row) => sum + row.total, 0)), trend: 'Total registrado' },
  ]);
  readonly bookingDays = computed(() => {
    const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const totals = Array(7).fill(0) as number[];
    this.state.reservations().forEach(row => totals[new Date(row.startsAt).getDay()]++);
    return labels.map((label, index) => ({ label, value: Math.max(4, totals[index] * 12) }));
  });
  readonly fleetState = computed(() => [
    { label: 'Disponibles', value: this.vehicles().filter(row => row.status === 'available').length, tone: 'available' },
    { label: 'Reservados', value: this.vehicles().filter(row => row.status === 'reserved').length, tone: 'reserved' },
    { label: 'En alquiler', value: this.vehicles().filter(row => row.status === 'rented').length, tone: 'reserved' },
    { label: 'Mantenimiento', value: this.vehicles().filter(row => row.status === 'maintenance').length, tone: 'maintenance' },
  ]);
  readonly attentionItems = computed(() => [
    ...this.state.reservations().filter(row => row.status === 'pending').slice(0, 2).map(row => ({ title: this.vehicleName(row.vehicleId), detail: 'Reserva pendiente de confirmación', tone: 'critical', path: 'reservas' })),
    ...this.contracts().filter(row => row.status === 'pending_signature').slice(0, 2).map(row => ({ title: row.number, detail: 'Contrato pendiente de firma', tone: 'neutral', path: 'contratos' })),
  ]);
  readonly recentReservations = computed(() => this.state.reservations().slice(0, 5).map(row => ({
    client: this.customerName(row.customerId), vehicleId: row.vehicleId,
    start: new Date(row.startsAt).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' }),
    end: new Date(row.endsAt).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' }),
    status: row.status === 'confirmed' ? 'Confirmada' : row.status === 'pending' ? 'Pendiente' : row.status,
  })));
  readonly quickOps = computed(() => [
    { value: String(this.vehicles().filter(row => row.status === 'maintenance').length), label: 'Vehículos en mantenimiento' },
    { value: String(this.state.incidents().filter(row => row.status !== 'resolved').length), label: 'Incidentes sin resolver' },
    { value: String(this.contracts().filter(row => row.status === 'pending_signature').length), label: 'Contratos por firmar' },
  ]);
  readonly vehicleTypes = ['SUV', 'Sedán', 'Económico', 'Pickup'];
  readonly agentActions = computed(() => [
    { label: 'Entregas', value: `${this.operations().filter(row => row.type === 'delivery' && row.status !== 'completed').length} pendientes`, path: 'operaciones', icon: keyOutline },
    { label: 'Devoluciones', value: `${this.operations().filter(row => row.type === 'return' && row.status !== 'completed').length} pendientes`, path: 'operaciones', icon: returnDownBackOutline },
    { label: 'Escanear vehiculo', value: 'Abrir ficha', path: 'escanear', icon: scanOutline },
    { label: 'Reportar incidente', value: 'Nuevo registro', path: 'incidentes', icon: alertCircleOutline },
  ]);
  readonly companiesSummary = computed(() => this.companies().map(company => ({
    id: company.id,
    name: company.name,
    city: company.city,
    vehicles: this.vehicles().filter(vehicle => vehicle.tenantId === company.id).length,
    status: company.active ? 'Activa' : 'Inactiva',
  })));
  link(path: string) { return '/' + this.role + '/' + path; }
  vehicleLink(id: string) { return this.link((this.role === 'admin' ? 'flota/' : 'vehiculos/') + id); }
  vehicleName(id: string) { const v = this.vehicles().find(v => v.id === id); return v ? v.brand + ' ' + v.model : 'Vehículo'; }
  vehicleImage(id: string) { return this.vehicles().find(v => v.id === id)?.imageUrl ?? 'assets/images/vehicles/tucson.jpg'; }
  vehiclePlate(id: string) { return this.vehicles().find(v => v.id === id)?.plate ?? 'PPA-0000'; }
  customerName(id: string) { return this.customers().find(customer => customer.id === id)?.name ?? 'Cliente'; }
  customerEmail(id: string) { return this.customers().find(customer => customer.id === id)?.email ?? ''; }
  reservationCount(customerId: string) { return this.state.reservations().filter(reservation => reservation.customerId === customerId).length; }
  visibleCustomers() {
    const term = this.customerSearch.trim().toLowerCase();
    if (!term) return this.customers();
    return this.customers().filter(customer => [customer.name, customer.email, customer.phone, customer.city].some(value => value.toLowerCase().includes(term)));
  }
  branchVehicleCount(branchId: string) { return this.vehicles().filter(vehicle => vehicle.branchId === branchId).length; }
  organizationVehicleCount(organizationId: string) { return this.vehicles().filter(vehicle => vehicle.tenantId === organizationId).length; }
  categoryLabel(category: string) { return category === 'suv' ? 'SUV' : category === 'sedan' ? 'Sedán' : category; }
  companyNameFor(id: string) { return this.companies().find(t => t.id === id)?.name ?? 'Empresa Hermes'; }
  companyCityFor(id: string) { return this.companies().find(t => t.id === id)?.city ?? 'República Dominicana'; }
  readonly businessIcon = businessOutline;
  readonly carIcon = carSportOutline;
  readonly cubeIcon = cubeOutline;
  readonly filterIcon = funnelOutline;
  readonly searchIcon = searchOutline;
  readonly scanIcon = scanOutline;
  readonly swapIcon = swapHorizontalOutline;
  flowLink(suffix = '') { return this.link(this.flow() + '/' + this.id() + suffix); }
  get days() { return Math.max(0, (Date.parse(this.endsAt) - Date.parse(this.startsAt)) / 86400000); }
  setFleetFilter(status: 'all' | Vehicle['status']) { this.fleetStatusFilter.set(status); }
  setReservationFilter(status: 'active' | 'completed' | 'cancelled') { this.reservationFilter.set(status); }
  searchVehicles() { void this.router.navigate([this.link('resultados')], { queryParams: { q: this.search, categoria: this.category } }); }
  browseCategory(type: string) {
    const categories: Record<string, string> = { SUV: 'suv', 'Sedán': 'sedan', 'Económico': 'sedan', Pickup: 'pickup' };
    void this.router.navigate([this.link('resultados')], { queryParams: { categoria: categories[type] ?? '' } });
  }
  async createReservation() {
    if (!this.vehicle() || !Number.isFinite(this.days) || this.days < 1) { this.message = 'Selecciona una devolución posterior a la recogida.'; return; }
    try {
      const reservation = await this.state.createReservation(this.vehicle()!, this.startsAt + 'T09:00:00-04:00', this.endsAt + 'T09:00:00-04:00', this.days * this.vehicle()!.dailyRate);
      await this.router.navigate([this.link('reservas/' + reservation.id)]);
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No fue posible crear la reserva.';
    }
  }
  openAdminReservationForm() {
    const vehicle = this.vehicles().find(row => row.status === 'available') ?? this.vehicles()[0];
    const branchId = vehicle?.branchId ?? this.branches()[0]?.id ?? '';
    const start = new Date();
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);
    this.newAdminReservation = {
      customerId: this.customers()[0]?.id ?? '', vehicleId: vehicle?.id ?? '', pickupBranchId: branchId,
      returnBranchId: branchId, startsAt: start.toISOString().slice(0, 10), endsAt: end.toISOString().slice(0, 10),
      total: vehicle ? vehicle.dailyRate * 3 : 0, notes: '',
    };
    this.adminReservationFormOpen = true;
  }
  updateAdminReservationTotal() {
    const vehicle = this.vehicles().find(row => row.id === this.newAdminReservation.vehicleId);
    const days = Math.max(0, (Date.parse(this.newAdminReservation.endsAt) - Date.parse(this.newAdminReservation.startsAt)) / 86400000);
    if (vehicle && days) this.newAdminReservation.total = vehicle.dailyRate * days;
    if (vehicle && !this.newAdminReservation.pickupBranchId) this.newAdminReservation.pickupBranchId = vehicle.branchId;
    if (vehicle && !this.newAdminReservation.returnBranchId) this.newAdminReservation.returnBranchId = vehicle.branchId;
  }
  async createAdminReservation() {
    const form = this.newAdminReservation;
    if (!form.customerId || !form.vehicleId || !form.pickupBranchId || !form.returnBranchId || !form.startsAt || !form.endsAt) {
      this.message = 'Completa cliente, vehículo, sucursales y fechas.';
      return;
    }
    try {
      await this.state.createAdminReservation({
        ...form, startsAt: `${form.startsAt}T09:00:00-04:00`, endsAt: `${form.endsAt}T09:00:00-04:00`,
      });
      this.adminReservationFormOpen = false;
      this.message = 'Reserva creada como pendiente. Ya puedes revisarla y confirmarla.';
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No fue posible crear la reserva.';
    }
  }
  async confirmReservation(reservation: Reservation) {
    try {
      await this.state.confirmReservation(reservation.id);
      this.message = 'Reserva confirmada. Contrato y operaciones preparados.';
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No fue posible confirmar la reserva.';
    }
  }
  printReservation(reservation: Reservation, type: 'Factura' | 'Contrato de alquiler', contract?: HermesContractRecord) {
    const vehicle = this.vehicles().find(row => row.id === reservation.vehicleId);
    const organization = this.companies().find(row => row.id === reservation.tenantId);
    try {
      this.printer.print({
        type,
        number: type === 'Factura' ? `FAC-${reservation.reference ?? reservation.id.slice(0, 8)}` : contract?.number ?? `BORRADOR-${reservation.reference ?? reservation.id.slice(0, 8)}`,
        company: organization?.name ?? 'Empresa Hermes',
        customer: this.customerName(reservation.customerId),
        customerEmail: this.customerEmail(reservation.customerId),
        vehicle: vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}` : 'Vehículo',
        plate: vehicle?.plate ?? 'No indicada',
        startsAt: reservation.startsAt,
        endsAt: reservation.endsAt,
        total: reservation.total,
        currency: reservation.currency,
        status: reservation.status,
        terms: contract?.terms,
      });
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No fue posible abrir la impresión.';
    }
  }
  printContract(contract: HermesContractRecord) {
    const reservation = this.state.reservations().find(row => row.id === contract.reservationId);
    if (!reservation) { this.message = 'No se encontró la reserva relacionada con el contrato.'; return; }
    this.printReservation(reservation, 'Contrato de alquiler', contract);
  }
  async createVehicle() {
    const plate = this.newVehicle.plate.trim().toUpperCase();
    if (!this.newVehicle.brand.trim() || !this.newVehicle.model.trim() || !plate) return;
    const fallbackImage = this.newVehicle.category === 'sedan' ? 'assets/images/vehicles/corolla.jpg' : this.newVehicle.category === 'van' ? 'assets/images/vehicles/sportage.jpg' : 'assets/images/vehicles/tucson.jpg';
    const branchId = this.branches()[0]?.id;
    if (!branchId) { this.message = 'Primero debes registrar una sucursal activa.'; return; }
    try {
      const imagePath = this.vehicleImageFile ? await this.state.uploadVehicleImage(this.vehicleImageFile) : undefined;
      const vehicle = await this.state.createVehicle({
        ...this.newVehicle,
        branchId,
        currency: 'DOP',
        brand: this.newVehicle.brand.trim(),
        model: this.newVehicle.model.trim(),
        plate,
        imageUrl: imagePath ? undefined : fallbackImage,
        imagePath,
        imageAlt: `${this.newVehicle.brand.trim()} ${this.newVehicle.model.trim()} agregado a la flota Hermes.`,
      });
      await this.router.navigateByUrl(this.link('flota/' + vehicle.id));
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No fue posible guardar el vehículo.';
    }
  }
  async createCustomer() {
    if (!this.newCustomer.name.trim() || !this.newCustomer.email.trim()) {
      this.message = 'Completa el nombre y el correo del cliente.';
      return;
    }
    if (this.createCustomerAccess && this.temporaryPassword.length < 8) {
      this.message = 'La contraseña temporal debe tener al menos 8 caracteres.';
      return;
    }
    try {
      const createdAccess = this.createCustomerAccess;
      if (this.createCustomerAccess) {
        await this.state.createCustomerAccount({ ...this.newCustomer, temporaryPassword: this.temporaryPassword });
      } else {
        await this.state.createCustomer(this.newCustomer);
      }
      this.newCustomer = { name: '', email: '', phone: '', documentType: 'cedula', documentNumber: '', driverLicense: '', city: 'Santo Domingo' };
      this.createCustomerAccess = false;
      this.temporaryPassword = '';
      this.customerFormOpen = false;
      this.message = createdAccess
        ? 'Cliente y acceso creados. Debe cambiar la contraseña temporal al iniciar sesión.'
        : 'Cliente registrado correctamente en Supabase.';
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No fue posible registrar el cliente.';
    }
  }
  startEditCustomer(customer: Customer) {
    this.editingCustomerId = customer.id;
    this.customerActive = customer.active;
    this.newCustomer = {
      name: customer.name, email: customer.email, phone: customer.phone,
      documentType: customer.documentType ?? 'cedula', documentNumber: customer.documentNumber ?? '',
      driverLicense: customer.driverLicense ?? '', city: customer.city,
    };
    this.customerFormOpen = true;
    this.createCustomerAccess = false;
  }
  cancelCustomerForm() {
    this.editingCustomerId = '';
    this.customerFormOpen = false;
    this.customerActive = true;
    this.newCustomer = { name: '', email: '', phone: '', documentType: 'cedula', documentNumber: '', driverLicense: '', city: 'Santo Domingo' };
  }
  async saveCustomer() {
    if (!this.editingCustomerId) return this.createCustomer();
    try {
      await this.state.updateCustomer(this.editingCustomerId, { ...this.newCustomer, active: this.customerActive });
      this.cancelCustomerForm();
      this.message = 'Cliente actualizado correctamente.';
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No fue posible actualizar el cliente.';
    }
  }
  async deleteCustomer(customer: Customer) {
    if (!window.confirm(`¿Eliminar a ${customer.name}? Esta acción solo será posible si no tiene historial relacionado.`)) return;
    try {
      await this.state.deleteCustomer(customer.id);
      this.message = 'Cliente eliminado correctamente.';
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No fue posible eliminar el cliente.';
    }
  }
  async uploadCustomerDocument(customerId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { this.message = 'El documento no puede superar 10 MB.'; return; }
    try {
      await this.state.uploadCustomerDocument(customerId, file, 'other');
      this.message = 'Documento guardado en Storage privado.';
      input.value = '';
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No fue posible guardar el documento.';
    }
  }
  toggleCustomerHistory(customerId: string) {
    this.expandedCustomerId = this.expandedCustomerId === customerId ? '' : customerId;
  }
  selectVehicleImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.vehicleImageError = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.vehicleImageError = 'Selecciona un archivo de imagen válido.';
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.vehicleImageError = 'La imagen no puede superar 5 MB.';
      input.value = '';
      return;
    }
    this.vehicleImageFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.vehicleImagePreview = typeof reader.result === 'string' ? reader.result : '';
      this.vehicleImageName = file.name;
    };
    reader.onerror = () => { this.vehicleImageError = 'No pudimos leer esta imagen.'; };
    reader.readAsDataURL(file);
  }
  clearVehicleImage(input: HTMLInputElement) {
    this.vehicleImagePreview = '';
    this.vehicleImageName = '';
    this.vehicleImageError = '';
    this.vehicleImageFile = undefined;
    input.value = '';
  }
  startEditVehicle(vehicle: Vehicle) {
    this.editingVehicle = true;
    this.editVehicle = {
      brand: vehicle.brand, model: vehicle.model, year: vehicle.year, plate: vehicle.plate,
      category: vehicle.category, transmission: vehicle.transmission, seats: vehicle.seats,
      dailyRate: vehicle.dailyRate, mileage: vehicle.mileage, status: vehicle.status, branchId: vehicle.branchId,
    };
  }
  async saveVehicleEdit() {
    const vehicle = this.vehicle();
    if (!vehicle) return;
    try {
      const imagePath = this.vehicleImageFile ? await this.state.uploadVehicleImage(this.vehicleImageFile) : undefined;
      await this.state.updateVehicle(vehicle.id, { ...this.editVehicle, ...(imagePath ? { imagePath } : {}) });
      this.editingVehicle = false;
      this.vehicleImageFile = undefined;
      this.message = 'Vehículo actualizado correctamente.';
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No fue posible actualizar el vehículo.';
    }
  }
  async deleteVehicle(vehicle: Vehicle) {
    if (!window.confirm(`¿Eliminar ${vehicle.brand} ${vehicle.model}?`)) return;
    try {
      await this.state.deleteVehicle(vehicle.id);
      this.message = 'Vehículo eliminado correctamente.';
      await this.router.navigateByUrl(this.link('flota'));
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No fue posible eliminar el vehículo.';
    }
  }
  startEditReservation(reservation: Reservation) {
    this.editingReservationId = reservation.id;
    this.reservationEdit = {
      startsAt: reservation.startsAt.slice(0, 10), endsAt: reservation.endsAt.slice(0, 10),
      status: reservation.status, total: reservation.total, notes: reservation.notes ?? '',
    };
  }
  async saveReservationEdit() {
    if (!this.editingReservationId) return;
    try {
      const reservationId = this.editingReservationId;
      await this.state.updateReservation(reservationId, {
        ...this.reservationEdit,
        startsAt: `${this.reservationEdit.startsAt}T09:00:00-04:00`,
        endsAt: `${this.reservationEdit.endsAt}T09:00:00-04:00`,
      });
      if (this.reservationEdit.status === 'confirmed') await this.state.confirmReservation(reservationId);
      this.editingReservationId = '';
      this.message = this.reservationEdit.status === 'confirmed'
        ? 'Reserva confirmada. Contrato y operaciones preparados.'
        : 'Reserva actualizada y disponibilidad validada.';
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No fue posible actualizar la reserva.';
    }
  }
  async cancelReservation(reservation: Reservation) {
    try {
      if (this.role === 'cliente') await this.state.cancelOwnReservation(reservation.id);
      else await this.state.updateReservation(reservation.id, {
        startsAt: reservation.startsAt, endsAt: reservation.endsAt, status: 'cancelled', total: reservation.total, notes: reservation.notes,
      });
      this.message = 'Reserva cancelada correctamente.';
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No fue posible cancelar la reserva.';
    }
  }
  startBranchForm(branch?: Branch) {
    this.branchFormOpen = true;
    this.editingBranchId = branch?.id ?? '';
    this.branchForm = branch
      ? { name: branch.name, city: branch.city, address: branch.address, active: branch.active }
      : { name: '', city: '', address: '', active: true };
  }
  async saveBranch() {
    if (!this.branchForm.name.trim()) return;
    try {
      if (this.editingBranchId) await this.state.updateBranch(this.editingBranchId, this.branchForm);
      else await this.state.createBranch(this.branchForm);
      this.branchFormOpen = false;
      this.editingBranchId = '';
      this.message = 'Sucursal guardada correctamente.';
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No fue posible guardar la sucursal.';
    }
  }
  async deleteBranch(branch: Branch) {
    if (!window.confirm(`¿Eliminar la sucursal ${branch.name}?`)) return;
    try { await this.state.deleteBranch(branch.id); this.message = 'Sucursal eliminada.'; }
    catch (error) { this.message = error instanceof Error ? error.message : 'No fue posible eliminar la sucursal.'; }
  }
  async changeMember(id: string, role: 'admin' | 'agent', active: boolean) {
    try { await this.state.updateMember(id, role, active); this.message = 'Permisos actualizados.'; }
    catch (error) { this.message = error instanceof Error ? error.message : 'No fue posible actualizar los permisos.'; }
  }
  selectOperationEvidence(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { this.message = 'La evidencia no puede superar 10 MB.'; return; }
    this.operationEvidenceFile = file;
    this.operationEvidencePreview = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
    this.state.update(this.stepKey(), { evidence: true });
  }
  scan() {
    const found = this.vehicles().find(v => v.plate.toLowerCase() === this.scanCode.trim().toLowerCase() || v.id === this.scanCode.trim());
    if (found) void this.router.navigate([this.vehicleLink(found.id)]);
    else this.message = 'No se encontró esa placa. Prueba A987601 o G987602.';
  }
  check(index: number, value: boolean) { const checks = [...this.step().checks]; checks[index] = value; this.state.update(this.stepKey(), { checks }); }
  async sign() {
    if (!this.signatureName.trim() || !this.consent) return;
    try {
      const evidenceUrls = this.operationEvidenceFile
        ? [await this.state.uploadOperationEvidence(this.id(), this.operationEvidenceFile)]
        : [];
      await this.state.completeOperation({
        vehicleId: this.id(),
        type: this.flow() === 'devolucion' ? 'return' : 'delivery',
        checks: this.step().checks,
        evidenceUrls,
        signatureName: this.signatureName.trim(),
      });
      this.state.update(this.stepKey(), { signed: true });
      this.message = 'Operación, inspección y firma guardadas en Supabase.';
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No fue posible completar la operación.';
    }
  }
  async reportIncident() {
    if (!this.incident.trim()) return;
    const detail = this.incident.trim();
    this.state.addIncident(detail);
    await this.handleOfflineAwareOperation('incident.reported', { detail, source: this.role });
    this.incident = '';
  }
  simulateAction(label: string) {
    this.message = label + ' actualizado en esta sesion.';
  }
  async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
  async saveProfile() {
    try {
      await this.auth.updateProfile(this.profileName || this.currentUser()?.name || '', this.phone);
      this.message = 'Perfil actualizado correctamente en Supabase.';
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No fue posible actualizar el perfil.';
    }
  }
  async saveInspection() {
    this.state.saveInspection(this.stepKey());
    await this.handleOfflineAwareOperation('inspection.saved', { key: this.stepKey(), role: this.role });
  }

  private async handleOfflineAwareOperation(type: string, payload: unknown) {
    if (this.network.connected) {
      try {
        await this.offline.sendOperation(type, payload);
        this.message = type === 'incident.reported' ? 'Incidente registrado correctamente.' : 'Inspección guardada correctamente.';
      } catch (error) {
        await this.offline.savePendingOperation(type, payload);
        this.message = error instanceof Error ? `${error.message} Guardamos la operación en la cola local.` : 'No se pudo sincronizar; guardamos la operación localmente.';
      }
      return;
    }
    // Guarda la acción para enviarla cuando regrese Internet
    await this.offline.savePendingOperation(type, payload);
    this.message = 'Sin conexión. Guardamos tus cambios en este dispositivo y se sincronizarán automáticamente cuando recuperes Internet.';
  }
}
