// La firma queda fuera de esta primera etapa.
export interface Contract {
  id: string;
  tenantId: string;
  rentalId: string;
  customerId: string;
  number: string;
  createdAt: string;
  terms: string;
  status: 'draft' | 'pending-signature' | 'signed' | 'cancelled';
  signedAt?: string;
}
