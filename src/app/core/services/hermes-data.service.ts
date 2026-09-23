import { Injectable, inject, signal } from '@angular/core';
import { Branch, Customer, Reservation, Tenant, Vehicle } from '../models';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export interface HermesMember {
  id: string;
  name: string;
  role: 'admin' | 'agent';
  active: boolean;
}

export interface CustomerLocationEvent {
  id: string;
  customerId: string;
  sessionId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  recordedAt: string;
}

export interface CustomerHistoryItem {
  id: string;
  type: 'customer' | 'reservation' | 'contract' | 'operation' | 'incident' | 'document' | 'location';
  title: string;
  detail: string;
  date: string;
}

export interface CustomerDocument {
  id: string;
  customerId: string;
  fileName: string;
  documentType: 'license' | 'identity' | 'contract' | 'other';
  storagePath: string;
  createdAt: string;
}

export interface HermesOperation {
  id: string;
  reservationId: string;
  vehicleId: string;
  customerId: string;
  type: 'delivery' | 'return';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledAt: string;
}

export interface HermesContractRecord {
  id: string;
  reservationId: string;
  customerId: string;
  number: string;
  terms: string;
  status: string;
  signedAt?: string;
  createdAt: string;
}

export interface HermesIncident {
  id: string;
  customerId?: string;
  title: string;
  detail: string;
  status: string;
  createdAt: string;
}

export interface NewCustomerInput {
  name: string;
  email: string;
  phone: string;
  documentType: 'cedula' | 'passport';
  documentNumber: string;
  driverLicense: string;
  city: string;
}

export interface NewCustomerAccountInput extends NewCustomerInput {
  temporaryPassword: string;
}

export interface AdminReservationInput {
  customerId: string;
  vehicleId: string;
  pickupBranchId: string;
  returnBranchId: string;
  startsAt: string;
  endsAt: string;
  total: number;
  notes?: string;
}

// Formas basicas de las filas que llegan de Supabase.
interface VehicleRow {
  id: string;
  organization_id: string;
  branch_id: string;
  brand: string;
  model: string;
  model_year: number;
  plate: string;
  category: Vehicle['category'];
  transmission: Vehicle['transmission'];
  seats: number;
  daily_rate: number | string;
  currency: Vehicle['currency'];
  mileage: number;
  status: Vehicle['status'];
  image_url: string | null;
}

interface ReservationRow {
  id: string;
  organization_id: string;
  customer_id: string;
  vehicle_id: string;
  pickup_branch_id: string;
  return_branch_id: string;
  starts_at: string;
  ends_at: string;
  status: Reservation['status'];
  total: number | string;
  currency: Reservation['currency'];
  reference: string;
  notes: string | null;
  created_at: string;
}

interface CustomerRow {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  document_type: 'cedula' | 'passport' | null;
  document_number: string | null;
  driver_license: string | null;
  license_expires_at: string | null;
  active: boolean;
  created_at: string;
}

interface BranchRow {
  id: string;
  organization_id: string;
  name: string;
  city: string | null;
  address: string | null;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class HermesDataService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);

  readonly vehicles = signal<readonly Vehicle[]>([]);
  readonly reservations = signal<readonly Reservation[]>([]);
  readonly customers = signal<readonly Customer[]>([]);
  readonly branches = signal<readonly Branch[]>([]);
  readonly members = signal<readonly HermesMember[]>([]);
  readonly operations = signal<readonly HermesOperation[]>([]);
  readonly contracts = signal<readonly HermesContractRecord[]>([]);
  readonly incidents = signal<readonly HermesIncident[]>([]);
  readonly organizations = signal<readonly Tenant[]>([]);
  readonly customerLocations = signal<readonly CustomerLocationEvent[]>([]);
  readonly customerDocuments = signal<readonly CustomerDocument[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    await this.auth.ready();
    if (!this.auth.user()) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');
    try {
      const [vehicles, reservations, customers, branches, operations, contracts, incidents, organizations, locations, documents] = await Promise.all([
        this.supabase.from('vehicles').select('*').order('created_at'),
        this.supabase.from('reservations').select('*').order('starts_at', { ascending: false }),
        this.supabase.from('customers').select('*').order('full_name'),
        this.supabase.from('branches').select('*').order('name'),
        this.supabase.from('rental_operations').select('*').order('scheduled_at'),
        this.supabase.from('contracts').select('*').order('created_at', { ascending: false }),
        this.supabase.from('incidents').select('*').order('created_at', { ascending: false }),
        this.supabase.from('organizations').select('*').order('name'),
        this.supabase.from('customer_location_events').select('*').order('recorded_at', { ascending: false }).limit(1000),
        this.supabase.from('customer_documents').select('*').order('created_at', { ascending: false }),
      ]);

      // La ubicacion es una ampliacion opcional durante el despliegue de la migracion.
      // Si la tabla aun no existe, el resto del CRM debe seguir cargando.
      const firstError = [vehicles.error, reservations.error, customers.error, branches.error, operations.error, contracts.error, incidents.error, organizations.error].find(Boolean);
      if (firstError) throw firstError;

      this.vehicles.set(await Promise.all((vehicles.data ?? []).map(row => this.mapVehicleWithImage(row))));
      this.reservations.set((reservations.data ?? []).map(row => this.mapReservation(row)));
      this.customers.set((customers.data ?? []).map(row => this.mapCustomer(row)));
      this.branches.set((branches.data ?? []).map(row => this.mapBranch(row)));
      this.operations.set((operations.data ?? []).map(row => ({
        id: row['id'], reservationId: row['reservation_id'], vehicleId: row['vehicle_id'], customerId: row['customer_id'],
        type: row['operation_type'], status: row['status'], scheduledAt: row['scheduled_at'],
      })));
      this.contracts.set((contracts.data ?? []).map(row => ({
        id: row['id'], reservationId: row['reservation_id'], customerId: row['customer_id'], number: row['number'],
        terms: row['terms'], status: row['status'], signedAt: row['signed_at'] ?? undefined, createdAt: row['created_at'],
      })));
      this.incidents.set((incidents.data ?? []).map(row => ({
        id: row['id'], customerId: row['customer_id'] ?? undefined, title: row['title'], detail: row['description'],
        status: row['status'], createdAt: row['created_at'],
      })));
      this.organizations.set((organizations.data ?? []).map(row => ({
        id: row['id'], name: row['name'], city: row['city'] ?? '', phone: row['phone'] ?? '', email: row['email'] ?? '', active: row['active'], slug: row['slug'] ?? undefined,
      })));
      this.customerLocations.set((locations.data ?? []).map(row => ({
        id: row['id'], customerId: row['customer_id'], sessionId: row['session_id'],
        latitude: row['latitude'], longitude: row['longitude'], accuracy: row['accuracy_meters'] ?? 0,
        recordedAt: row['recorded_at'],
      })));
      this.customerDocuments.set((documents.data ?? []).map(row => ({
        id: row['id'], customerId: row['customer_id'], fileName: row['file_name'],
        documentType: row['document_type'], storagePath: row['storage_path'], createdAt: row['created_at'],
      })));
      await this.loadMembers();
    } catch (error) {
      console.error('[Hermes Data]', error);
      this.error.set('No pudimos cargar los datos de Supabase. Comprueba que la migración operativa esté aplicada.');
    } finally {
      this.loading.set(false);
    }
  }

  async createVehicle(input: Omit<Vehicle, 'id' | 'tenantId'>): Promise<Vehicle> {
    const organizationId = this.requireOrganization();
    const { data, error } = await this.supabase.from('vehicles').insert({
      organization_id: organizationId,
      branch_id: input.branchId,
      brand: input.brand,
      model: input.model,
      model_year: input.year,
      plate: input.plate,
      category: input.category,
      transmission: input.transmission,
      seats: input.seats,
      daily_rate: input.dailyRate,
      currency: input.currency,
      mileage: input.mileage,
      status: input.status,
      image_url: input.imagePath ?? input.imageUrl ?? null,
    }).select('*').single();
    if (error) throw new Error(error.message);
    const vehicle = await this.mapVehicleWithImage(data);
    this.vehicles.update(rows => [vehicle, ...rows]);
    return vehicle;
  }

  async updateVehicle(id: string, input: Partial<Omit<Vehicle, 'id' | 'tenantId'>>): Promise<void> {
    const values: Record<string, unknown> = {};
    if (input.branchId !== undefined) values['branch_id'] = input.branchId;
    if (input.brand !== undefined) values['brand'] = input.brand.trim();
    if (input.model !== undefined) values['model'] = input.model.trim();
    if (input.year !== undefined) values['model_year'] = input.year;
    if (input.plate !== undefined) values['plate'] = input.plate.trim().toUpperCase();
    if (input.category !== undefined) values['category'] = input.category;
    if (input.transmission !== undefined) values['transmission'] = input.transmission;
    if (input.seats !== undefined) values['seats'] = input.seats;
    if (input.dailyRate !== undefined) values['daily_rate'] = input.dailyRate;
    if (input.mileage !== undefined) values['mileage'] = input.mileage;
    if (input.status !== undefined) values['status'] = input.status;
    if (input.imagePath !== undefined) values['image_url'] = input.imagePath;
    const { error } = await this.supabase.from('vehicles').update(values).eq('id', id);
    if (error) throw new Error(error.message);
    await this.refresh();
  }

  async deleteVehicle(id: string): Promise<void> {
    const vehicle = this.vehicles().find(row => row.id === id);
    const { error } = await this.supabase.from('vehicles').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') throw new Error('Este vehículo tiene reservas u operaciones. Debes marcarlo como inactivo en lugar de eliminarlo.');
      throw new Error(error.message);
    }
    if (vehicle?.imagePath) await this.supabase.storage.from('vehicle-images').remove([vehicle.imagePath]);
    this.vehicles.update(rows => rows.filter(row => row.id !== id));
  }

  async uploadVehicleImage(file: File): Promise<string> {
    const organizationId = this.requireOrganization();
    const extension = this.fileExtension(file);
    const path = `${organizationId}/vehicles/${crypto.randomUUID()}.${extension}`;
    const { error } = await this.supabase.storage.from('vehicle-images').upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`No fue posible subir la fotografía: ${error.message}`);
    return path;
  }

  async uploadOperationEvidence(vehicleId: string, file: File): Promise<string> {
    const organizationId = this.requireOrganization();
    const path = `${organizationId}/operations/${vehicleId}/${crypto.randomUUID()}.${this.fileExtension(file)}`;
    const { error } = await this.supabase.storage.from('operation-evidence').upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`No fue posible subir la evidencia: ${error.message}`);
    return path;
  }

  async createReservation(vehicle: Vehicle, startsAt: string, endsAt: string, total: number): Promise<Reservation> {
    const { data: account, error: accountError } = await this.supabase
      .from('customer_accounts')
      .select('customer_id, organization_id')
      .eq('user_id', this.auth.user()!.id)
      .eq('active', true)
      .single();
    if (accountError || !account) throw new Error('La cuenta cliente no está enlazada a un registro de cliente.');

    const available = await this.isVehicleAvailable(vehicle.id, startsAt, endsAt);
    if (!available) throw new Error('El vehículo ya tiene una reserva activa que cruza con esas fechas.');
    const reference = `RSV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const { data, error } = await this.supabase.from('reservations').insert({
      organization_id: account.organization_id,
      customer_id: account.customer_id,
      vehicle_id: vehicle.id,
      pickup_branch_id: vehicle.branchId,
      return_branch_id: vehicle.branchId,
      reference,
      starts_at: startsAt,
      ends_at: endsAt,
      status: 'pending',
      total,
      currency: 'DOP',
      created_by: this.auth.user()!.id,
    }).select('*').single();
    if (error) {
      if (error.code === '23P01') throw new Error('El vehículo acaba de ser reservado para esas fechas. Selecciona otro período.');
      throw new Error(error.message);
    }
    const reservation = this.mapReservation(data);
    this.reservations.update(rows => [reservation, ...rows]);
    return reservation;
  }

  // El administrador puede registrar una reserva recibida por telefono o en mostrador.
  async createAdminReservation(input: AdminReservationInput): Promise<Reservation> {
    const organizationId = this.requireOrganization();
    if (!(await this.isVehicleAvailable(input.vehicleId, input.startsAt, input.endsAt))) {
      throw new Error('El vehículo ya tiene una reserva activa que cruza con esas fechas.');
    }
    const reference = `RSV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const { data, error } = await this.supabase.from('reservations').insert({
      organization_id: organizationId,
      customer_id: input.customerId,
      vehicle_id: input.vehicleId,
      pickup_branch_id: input.pickupBranchId,
      return_branch_id: input.returnBranchId,
      reference,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      status: 'pending',
      total: input.total,
      currency: 'DOP',
      notes: input.notes?.trim() || null,
      created_by: this.auth.user()!.id,
    }).select('*').single();
    if (error) {
      if (error.code === '23P01') throw new Error('El vehículo acaba de ser reservado para esas fechas.');
      throw new Error(error.message);
    }
    const reservation = this.mapReservation(data);
    this.reservations.update(rows => [reservation, ...rows]);
    return reservation;
  }

  // Al confirmar se prepara el contrato y las dos operaciones del alquiler.
  async confirmReservation(id: string): Promise<void> {
    const reservation = this.reservations().find(row => row.id === id);
    if (!reservation) throw new Error('La reserva no existe.');
    if (!(await this.isVehicleAvailable(reservation.vehicleId, reservation.startsAt, reservation.endsAt, id))) {
      throw new Error('Las fechas se cruzan con otra reserva activa del vehículo.');
    }

    const { error: reservationError } = await this.supabase.from('reservations').update({ status: 'confirmed' }).eq('id', id);
    if (reservationError) throw new Error(reservationError.message);

    const number = `CTR-${new Date().getFullYear()}-${(reservation.reference ?? id).replace(/[^0-9]/g, '').slice(-6)}`;
    const contract = await this.supabase.from('contracts').upsert({
      organization_id: reservation.tenantId,
      reservation_id: reservation.id,
      customer_id: reservation.customerId,
      number,
      terms: 'Al firmar, el cliente acepta las fechas, tarifa, inspección de entrega y devolución, uso responsable del vehículo y cargos documentados durante el alquiler.',
      status: 'pending_signature',
    }, { onConflict: 'reservation_id' });
    if (contract.error) throw new Error(`La reserva fue confirmada, pero no se pudo preparar el contrato: ${contract.error.message}`);

    const operations = await this.supabase.from('rental_operations').upsert([
      {
        organization_id: reservation.tenantId, reservation_id: reservation.id, vehicle_id: reservation.vehicleId,
        customer_id: reservation.customerId, operation_type: 'delivery', status: 'scheduled', scheduled_at: reservation.startsAt,
      },
      {
        organization_id: reservation.tenantId, reservation_id: reservation.id, vehicle_id: reservation.vehicleId,
        customer_id: reservation.customerId, operation_type: 'return', status: 'scheduled', scheduled_at: reservation.endsAt,
      },
    ], { onConflict: 'reservation_id,operation_type' });
    if (operations.error) throw new Error(`La reserva y el contrato se guardaron, pero no se pudo crear la agenda: ${operations.error.message}`);
    await this.refresh();
  }

  async updateReservation(id: string, input: { startsAt: string; endsAt: string; status: Reservation['status']; total: number; notes?: string }): Promise<void> {
    const reservation = this.reservations().find(row => row.id === id);
    if (!reservation) throw new Error('La reserva no existe.');
    if (input.status !== 'cancelled' && !(await this.isVehicleAvailable(reservation.vehicleId, input.startsAt, input.endsAt, id))) {
      throw new Error('Las fechas se cruzan con otra reserva activa del vehículo.');
    }
    const { error } = await this.supabase.from('reservations').update({
      starts_at: input.startsAt, ends_at: input.endsAt, status: input.status,
      total: input.total, notes: input.notes?.trim() || null,
    }).eq('id', id);
    if (error) {
      if (error.code === '23P01') throw new Error('Las fechas se cruzan con otra reserva activa del vehículo.');
      throw new Error(error.message);
    }
    await this.refresh();
  }

  async cancelOwnReservation(id: string): Promise<void> {
    const { error } = await this.supabase.rpc('cancel_own_reservation', { target_reservation_id: id });
    if (error) throw new Error(error.message);
    await this.refresh();
  }

  async isVehicleAvailable(vehicleId: string, startsAt: string, endsAt: string, ignoredReservationId?: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('vehicle_is_available', {
      target_vehicle_id: vehicleId, requested_start: startsAt, requested_end: endsAt,
      ignored_reservation_id: ignoredReservationId ?? null,
    });
    if (error) {
      // Permite desplegar la interfaz antes de ejecutar la migracion nueva.
      let query = this.supabase.from('reservations').select('id').eq('vehicle_id', vehicleId)
        .in('status', ['pending', 'confirmed']).lt('starts_at', endsAt).gt('ends_at', startsAt);
      if (ignoredReservationId) query = query.neq('id', ignoredReservationId);
      const fallback = await query.limit(1);
      if (fallback.error) throw new Error(fallback.error.message);
      return (fallback.data?.length ?? 0) === 0;
    }
    return Boolean(data);
  }

  async createCustomer(input: NewCustomerInput): Promise<Customer> {
    const organizationId = this.requireOrganization();
    const { data, error } = await this.supabase.from('customers').insert({
      organization_id: organizationId,
      full_name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim() || null,
      document_type: input.documentType,
      document_number: input.documentNumber.trim() || null,
      driver_license: input.driverLicense.trim() || null,
      city: input.city.trim() || null,
    }).select('*').single();
    if (error) {
      if (error.code === '23505') throw new Error('Ya existe un cliente con ese correo o documento.');
      throw new Error(error.message);
    }
    const customer = this.mapCustomer(data);
    this.customers.update(rows => [...rows, customer].sort((a, b) => a.name.localeCompare(b.name)));
    return customer;
  }

  async updateCustomer(id: string, input: NewCustomerInput & { active: boolean }): Promise<void> {
    const { error } = await this.supabase.from('customers').update({
      full_name: input.name.trim(), email: input.email.trim().toLowerCase(), phone: input.phone.trim() || null,
      document_type: input.documentType, document_number: input.documentNumber.trim() || null,
      driver_license: input.driverLicense.trim() || null, city: input.city.trim() || null, active: input.active,
    }).eq('id', id);
    if (error) {
      if (error.code === '23505') throw new Error('Ya existe otro cliente con ese correo o documento.');
      throw new Error(error.message);
    }
    await this.refresh();
  }

  async deleteCustomer(id: string): Promise<void> {
    const { error } = await this.supabase.from('customers').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') throw new Error('Este cliente tiene reservas o contratos. Puedes desactivarlo, pero su historial debe conservarse.');
      throw new Error(error.message);
    }
    this.customers.update(rows => rows.filter(row => row.id !== id));
  }

  customerHistory(customerId: string): CustomerHistoryItem[] {
    const customer = this.customers().find(row => row.id === customerId);
    const created = customer?.createdAt ? [{
      id: customer.id, type: 'customer' as const, title: 'Cliente registrado', detail: customer.email, date: customer.createdAt,
    }] : [];
    const reservations = this.reservations().filter(row => row.customerId === customerId).map(row => ({
      id: row.id, type: 'reservation' as const, title: `Reserva ${row.reference ?? row.id.slice(0, 8)}`,
      detail: `${this.vehicleLabel(row.vehicleId)} · ${row.status} · ${row.total.toLocaleString('es-DO')} ${row.currency}`,
      date: row.createdAt ?? row.startsAt,
    }));
    const contracts = this.contracts().filter(row => row.customerId === customerId).map(row => ({
      id: row.id, type: 'contract' as const, title: `Contrato ${row.number}`, detail: row.status, date: row.signedAt ?? row.createdAt,
    }));
    const operations = this.operations().filter(row => row.customerId === customerId).map(row => ({
      id: row.id, type: 'operation' as const,
      title: row.type === 'delivery' ? 'Entrega de vehículo' : 'Devolución de vehículo',
      detail: `${this.vehicleLabel(row.vehicleId)} · ${row.status}`, date: row.scheduledAt,
    }));
    const incidents = this.incidents().filter(row => row.customerId === customerId).map(row => ({
      id: row.id, type: 'incident' as const, title: row.title, detail: `${row.detail} · ${row.status}`, date: row.createdAt,
    }));
    const locations = this.customerLocations().filter(row => row.customerId === customerId).slice(0, 100).map(row => ({
      id: row.id, type: 'location' as const, title: 'Ubicación registrada',
      detail: `${row.latitude.toFixed(5)}, ${row.longitude.toFixed(5)} · precisión ${Math.round(row.accuracy)} m`, date: row.recordedAt,
    }));
    const documents = this.customerDocuments().filter(row => row.customerId === customerId).map(row => ({
      id: row.id, type: 'document' as const, title: `Documento: ${row.fileName}`, detail: row.documentType, date: row.createdAt,
    }));
    return [...created, ...reservations, ...contracts, ...operations, ...incidents, ...documents, ...locations]
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  }

  async uploadCustomerDocument(customerId: string, file: File, documentType: CustomerDocument['documentType']): Promise<void> {
    const organizationId = this.requireOrganization();
    const path = `${organizationId}/customers/${customerId}/${crypto.randomUUID()}.${this.fileExtension(file)}`;
    const uploaded = await this.supabase.storage.from('crm-documents').upload(path, file, { contentType: file.type, upsert: false });
    if (uploaded.error) throw new Error(`No fue posible subir el documento: ${uploaded.error.message}`);
    const { error } = await this.supabase.from('customer_documents').insert({
      organization_id: organizationId, customer_id: customerId, uploaded_by: this.auth.user()?.id,
      storage_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size, document_type: documentType,
    });
    if (error) {
      await this.supabase.storage.from('crm-documents').remove([path]);
      throw new Error(error.message);
    }
    await this.refresh();
  }

  async createBranch(input: { name: string; city: string; address: string }): Promise<void> {
    const { error } = await this.supabase.from('branches').insert({ organization_id: this.requireOrganization(), ...input, active: true });
    if (error) throw new Error(error.message);
    await this.refresh();
  }

  async updateBranch(id: string, input: { name: string; city: string; address: string; active: boolean }): Promise<void> {
    const { error } = await this.supabase.from('branches').update(input).eq('id', id);
    if (error) throw new Error(error.message);
    await this.refresh();
  }

  async deleteBranch(id: string): Promise<void> {
    const { error } = await this.supabase.from('branches').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') throw new Error('La sucursal tiene vehículos o reservas asociados. Desactívala para conservar el historial.');
      throw new Error(error.message);
    }
    await this.refresh();
  }

  async updateMember(userId: string, role: HermesMember['role'], active: boolean): Promise<void> {
    const { error } = await this.supabase.from('memberships').update({ role, active })
      .eq('organization_id', this.requireOrganization()).eq('user_id', userId);
    if (error) throw new Error(error.message);
    await this.loadMembers();
  }

  async recordCustomerLocation(input: { sessionId: string; latitude: number; longitude: number; accuracy: number; recordedAt: string }): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId) throw new Error('Debes iniciar sesión para compartir la ubicación.');
    const { data: account, error: accountError } = await this.supabase.from('customer_accounts')
      .select('customer_id, organization_id').eq('user_id', userId).eq('active', true).single();
    if (accountError || !account) throw new Error('La cuenta no está enlazada a un cliente.');
    const { error } = await this.supabase.from('customer_location_events').insert({
      organization_id: account.organization_id, customer_id: account.customer_id, user_id: userId,
      session_id: input.sessionId, latitude: input.latitude, longitude: input.longitude,
      accuracy_meters: input.accuracy, recorded_at: input.recordedAt,
    });
    if (error) throw new Error(error.message);
  }

  async createCustomerAccount(input: NewCustomerAccountInput): Promise<void> {
    const organizationId = this.requireOrganization();
    const { error } = await this.supabase.functions.invoke('create-customer-account', {
      body: {
        organizationId,
        fullName: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        city: input.city.trim(),
        documentType: input.documentType,
        documentNumber: input.documentNumber.trim(),
        driverLicense: input.driverLicense.trim(),
        temporaryPassword: input.temporaryPassword,
      },
    });
    if (error) throw new Error('No fue posible crear el acceso. Comprueba que la función segura esté publicada.');
    await this.refresh();
  }

  async completeOperation(input: {
    vehicleId: string;
    type: 'delivery' | 'return';
    checks: boolean[];
    evidenceUrls: string[];
    signatureName: string;
  }): Promise<void> {
    const organizationId = this.requireOrganization();
    const operation = this.operations().find(row => row.vehicleId === input.vehicleId && row.type === input.type && row.status !== 'cancelled');
    if (!operation) throw new Error('No existe una operación programada para este vehículo.');
    const vehicle = this.vehicles().find(row => row.id === input.vehicleId);
    const now = new Date().toISOString();
    const checklist = input.checks.map((checked, index) => ({ position: index + 1, checked }));

    const { error: inspectionError } = await this.supabase.from('inspections').insert({
      organization_id: organizationId,
      operation_id: operation.id,
      reservation_id: operation.reservationId,
      vehicle_id: operation.vehicleId,
      agent_id: this.auth.user()!.id,
      inspection_type: input.type,
      status: 'completed',
      mileage: vehicle?.mileage ?? 0,
      fuel_level: 'three_quarters',
      checklist,
      evidence_urls: input.evidenceUrls,
      inspected_at: now,
    });
    if (inspectionError) throw new Error(inspectionError.message);

    const { error: operationError } = await this.supabase.from('rental_operations').update({
      status: 'completed', completed_at: now, completed_by: this.auth.user()!.id, signature_name: input.signatureName,
    }).eq('id', operation.id);
    if (operationError) throw new Error(operationError.message);
    this.operations.update(rows => rows.map(row => row.id === operation.id ? { ...row, status: 'completed' } : row));
  }

  private async loadMembers(): Promise<void> {
    const organizationId = this.auth.user()?.organizationId;
    if (!organizationId || this.auth.user()?.role !== 'admin') {
      this.members.set([]);
      return;
    }
    const { data: memberships, error } = await this.supabase.from('memberships').select('id, user_id, role, active').eq('organization_id', organizationId);
    if (error) throw error;
    const ids = (memberships ?? []).map(row => row.user_id);
    if (!ids.length) return;
    const { data: profiles, error: profileError } = await this.supabase.from('profiles').select('id, full_name').in('id', ids);
    if (profileError) throw profileError;
    this.members.set((memberships ?? []).map(row => ({
      id: row.user_id,
      name: profiles?.find(profile => profile.id === row.user_id)?.full_name || 'Usuario',
      role: row.role,
      active: row.active,
    })));
  }

  private requireOrganization(): string {
    const id = this.auth.user()?.organizationId;
    if (!id) throw new Error('Tu sesión no está vinculada a una empresa.');
    return id;
  }

  private mapVehicle(row: VehicleRow): Vehicle {
    return {
      id: row.id, tenantId: row.organization_id, branchId: row.branch_id, brand: row.brand, model: row.model,
      year: row.model_year, plate: row.plate, category: row.category, transmission: row.transmission, seats: row.seats,
      dailyRate: Number(row.daily_rate), currency: row.currency, mileage: row.mileage, status: row.status,
      imageUrl: row.image_url ?? undefined, imagePath: this.isStoragePath(row.image_url) ? row.image_url! : undefined,
      imageAlt: `${row.brand} ${row.model} · ${row.plate}`,
    };
  }

  private mapReservation(row: ReservationRow): Reservation {
    return {
      id: row.id, tenantId: row.organization_id, customerId: row.customer_id, vehicleId: row.vehicle_id,
      pickupBranchId: row.pickup_branch_id, returnBranchId: row.return_branch_id, startsAt: row.starts_at, endsAt: row.ends_at,
      status: row.status, total: Number(row.total), currency: row.currency,
      reference: row.reference, notes: row.notes ?? undefined, createdAt: row.created_at,
    };
  }

  private mapCustomer(row: CustomerRow): Customer {
    return {
      id: row.id, tenantId: row.organization_id, name: row.full_name, email: row.email,
      phone: row.phone ?? '', city: row.city ?? '',
      documentType: row.document_type ?? undefined, documentNumber: row.document_number ?? undefined,
      driverLicense: row.driver_license ?? undefined, licenseExpiresAt: row.license_expires_at ?? undefined,
      active: row.active, createdAt: row.created_at,
    };
  }

  private mapBranch(row: BranchRow): Branch {
    return { id: row.id, tenantId: row.organization_id, name: row.name, city: row.city ?? '', address: row.address ?? '', active: row.active };
  }

  private async mapVehicleWithImage(row: VehicleRow): Promise<Vehicle> {
    const vehicle = this.mapVehicle(row);
    if (!vehicle.imagePath) return vehicle;
    const { data } = await this.supabase.storage.from('vehicle-images').createSignedUrl(vehicle.imagePath, 3600);
    return { ...vehicle, imageUrl: data?.signedUrl ?? undefined };
  }

  private isStoragePath(value: string | null): boolean {
    return Boolean(value && !value.startsWith('assets/') && !value.startsWith('http') && !value.startsWith('data:'));
  }

  private fileExtension(file: File): string {
    return file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || (file.type === 'application/pdf' ? 'pdf' : 'jpg');
  }

  private vehicleLabel(id: string): string {
    const vehicle = this.vehicles().find(row => row.id === id);
    return vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehículo';
  }
}
