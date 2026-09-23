export interface Customer {
  id: string;
  tenantId: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  documentType?: 'cedula' | 'passport';
  documentNumber?: string;
  driverLicense?: string;
  licenseExpiresAt?: string;
  active: boolean;
  createdAt?: string;
}
