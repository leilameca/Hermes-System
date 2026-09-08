export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
}

// Este modelo representa una factura de ejemplo, sin emisión fiscal.
export interface Invoice {
  id: string;
  tenantId: string;
  rentalId: string;
  customerId: string;
  number: string;
  issuedAt: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  currency: 'DOP';
  status: 'draft' | 'pending' | 'paid' | 'cancelled';
}
