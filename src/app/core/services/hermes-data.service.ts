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
}

export interface HermesIncident {
  id: string;
  title: string;
  detail: string;
  status: string;
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
      const [vehicles, reservations, customers, branches, operations, contracts, incidents, organizations] = await Promise.all([
        this.supabase.from('vehicles').select('*').order('created_at'),
        this.supabase.from('reservations').select('*').order('starts_at', { ascending: false }),
        this.supabase.from('customers').select('*').order('full_name'),
        this.supabase.from('branches').select('*').order('name'),
        this.supabase.from('rental_operations').select('*').order('scheduled_at'),
        this.supabase.from('contracts').select('*').order('created_at', { ascending: false }),
        this.supabase.from('incidents').select('*').order('created_at', { ascending: false }),
        this.supabase.from('organizations').select('*').order('name'),
      ]);

      const firstError = [vehicles.error, reservations.error, customers.error, branches.error, operations.error, contracts.error, incidents.error, organizations.error].find(Boolean);
      if (firstError) throw firstError;

      this.vehicles.set((vehicles.data ?? []).map(row => this.mapVehicle(row)));
      this.reservations.set((reservations.data ?? []).map(row => this.mapReservation(row)));
      this.customers.set((customers.data ?? []).map(row => this.mapCustomer(row)));
      this.branches.set((branches.data ?? []).map(row => this.mapBranch(row)));
      this.operations.set((operations.data ?? []).map(row => ({
        id: row['id'], reservationId: row['reservation_id'], vehicleId: row['vehicle_id'], customerId: row['customer_id'],
        type: row['operation_type'], status: row['status'], scheduledAt: row['scheduled_at'],
      })));
      this.contracts.set((contracts.data ?? []).map(row => ({
        id: row['id'], reservationId: row['reservation_id'], customerId: row['customer_id'], number: row['number'],
        terms: row['terms'], status: row['status'], signedAt: row['signed_at'] ?? undefined,
      })));
      this.incidents.set((incidents.data ?? []).map(row => ({ id: row['id'], title: row['title'], detail: row['description'], status: row['status'] })));
      this.organizations.set((organizations.data ?? []).map(row => ({
        id: row['id'], name: row['name'], city: row['city'] ?? '', phone: row['phone'] ?? '', email: row['email'] ?? '', active: row['active'], slug: row['slug'] ?? undefined,
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
      image_url: input.imageUrl ?? null,
    }).select('*').single();
    if (error) throw new Error(error.message);
    const vehicle = this.mapVehicle(data);
    this.vehicles.update(rows => [vehicle, ...rows]);
    return vehicle;
  }

  async createReservation(vehicle: Vehicle, startsAt: string, endsAt: string, total: number): Promise<Reservation> {
    const { data: account, error: accountError } = await this.supabase
      .from('customer_accounts')
      .select('customer_id, organization_id')
      .eq('user_id', this.auth.user()!.id)
      .eq('active', true)
      .single();
    if (accountError || !account) throw new Error('La cuenta cliente no está enlazada a un registro de cliente.');

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
    if (error) throw new Error(error.message);
    const reservation = this.mapReservation(data);
    this.reservations.update(rows => [reservation, ...rows]);
    return reservation;
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

  private mapVehicle(row: Record<string, any>): Vehicle {
    return {
      id: row['id'], tenantId: row['organization_id'], branchId: row['branch_id'], brand: row['brand'], model: row['model'],
      year: row['model_year'], plate: row['plate'], category: row['category'], transmission: row['transmission'], seats: row['seats'],
      dailyRate: Number(row['daily_rate']), currency: row['currency'], mileage: row['mileage'], status: row['status'],
      imageUrl: row['image_url'] ?? undefined, imageAlt: `${row['brand']} ${row['model']} · ${row['plate']}`,
    };
  }

  private mapReservation(row: Record<string, any>): Reservation {
    return {
      id: row['id'], tenantId: row['organization_id'], customerId: row['customer_id'], vehicleId: row['vehicle_id'],
      pickupBranchId: row['pickup_branch_id'], returnBranchId: row['return_branch_id'], startsAt: row['starts_at'], endsAt: row['ends_at'],
      status: row['status'], total: Number(row['total']), currency: row['currency'],
    };
  }

  private mapCustomer(row: Record<string, any>): Customer {
    return {
      id: row['id'], tenantId: row['organization_id'], name: row['full_name'], email: row['email'],
      phone: row['phone'] ?? '', city: row['city'] ?? '',
    };
  }

  private mapBranch(row: Record<string, any>): Branch {
    return { id: row['id'], tenantId: row['organization_id'], name: row['name'], city: row['city'] ?? '', address: row['address'] ?? '' };
  }
}
