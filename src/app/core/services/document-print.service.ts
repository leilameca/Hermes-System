import { Injectable } from '@angular/core';

export interface PrintableDocument {
  type: 'Factura' | 'Contrato de alquiler';
  number: string;
  company: string;
  customer: string;
  customerEmail?: string;
  vehicle: string;
  plate: string;
  startsAt: string;
  endsAt: string;
  total: number;
  currency: string;
  status: string;
  terms?: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentPrintService {
  print(document: PrintableDocument): void {
    const popup = window.open('', '_blank', 'width=900,height=720');
    if (!popup) throw new Error('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para Hermes.');
    const money = new Intl.NumberFormat('es-DO', { style: 'currency', currency: document.currency }).format(document.total);
    const date = (value: string) => new Intl.DateTimeFormat('es-DO', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));
    const terms = document.terms || 'Documento generado a partir de la reserva registrada en Hermes System.';
    popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${this.escape(document.type)} ${this.escape(document.number)}</title><style>
      *{box-sizing:border-box}body{margin:0;color:#111b35;font:14px Arial,sans-serif}main{max-width:820px;margin:auto;padding:48px}.head{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #d08a32;padding-bottom:22px}.brand{font-size:25px;font-weight:800;letter-spacing:.08em}.type{text-align:right}.type h1{margin:0;font-size:28px}.muted{color:#667085}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:30px 0}.box{border:1px solid #d8dde7;padding:16px}.box h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#17448f}.detail{width:100%;border-collapse:collapse;margin:24px 0}.detail th,.detail td{padding:13px;border-bottom:1px solid #d8dde7;text-align:left}.total{display:flex;justify-content:flex-end;font-size:22px;font-weight:800}.terms{margin-top:35px;line-height:1.65}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:70px}.signature{padding-top:9px;border-top:1px solid #111b35;text-align:center}.foot{margin-top:45px;color:#667085;font-size:11px;text-align:center}@media print{main{padding:24px}.no-print{display:none}}</style></head><body><main>
      <header class="head"><div><div class="brand">HERMES SYSTEM</div><p class="muted">${this.escape(document.company)}</p></div><div class="type"><h1>${this.escape(document.type)}</h1><strong>${this.escape(document.number)}</strong><p class="muted">Estado: ${this.escape(document.status)}</p></div></header>
      <section class="grid"><div class="box"><h2>Cliente</h2><strong>${this.escape(document.customer)}</strong><p>${this.escape(document.customerEmail || 'Correo no indicado')}</p></div><div class="box"><h2>Vehículo</h2><strong>${this.escape(document.vehicle)}</strong><p>Placa ${this.escape(document.plate)}</p></div></section>
      <table class="detail"><thead><tr><th>Concepto</th><th>Recogida</th><th>Devolución</th><th>Importe</th></tr></thead><tbody><tr><td>Alquiler de vehículo</td><td>${date(document.startsAt)}</td><td>${date(document.endsAt)}</td><td>${money}</td></tr></tbody></table>
      <p class="total">Total: ${money}</p><section class="terms"><h2>Condiciones</h2><p>${this.escape(terms)}</p></section>
      ${document.type === 'Contrato de alquiler' ? '<section class="signatures"><div class="signature">Firma del cliente</div><div class="signature">Representante de la empresa</div></section>' : ''}
      <p class="foot">Generado por Hermes System · ${new Date().toLocaleString('es-DO')}</p></main><script>window.addEventListener('load',()=>{window.print()})<\/script></body></html>`);
    popup.document.close();
  }

  private escape(value: string): string {
    return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
  }
}
