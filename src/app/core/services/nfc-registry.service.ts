import { Injectable, inject } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { HermesNfcBinding } from '../models/nfc-scan.model';

const NFC_BINDINGS_KEY = 'hermes.nfc.bindings.v1';

@Injectable({ providedIn: 'root' })
export class NfcRegistryService {
  private readonly storage = inject(Storage);
  private readonly ready = this.storage.create();

  async findByToken(token: string): Promise<HermesNfcBinding | undefined> {
    return (await this.getAll()).find(binding => binding.active && binding.token === token);
  }

  async findByTagId(tagId: string): Promise<HermesNfcBinding | undefined> {
    return (await this.getAll()).find(binding => binding.active && binding.tagId === tagId);
  }

  async link(input: Omit<HermesNfcBinding, 'active' | 'linkedAt'>): Promise<HermesNfcBinding> {
    const bindings = await this.getAll();
    const linkedAt = new Date().toISOString();
    const binding: HermesNfcBinding = { ...input, active: true, linkedAt };
    const withoutPrevious = bindings.map(item =>
      item.active && (item.tagId === input.tagId || item.vehicleId === input.vehicleId)
        ? { ...item, active: false }
        : item,
    );
    await this.save([...withoutPrevious, binding]);
    return binding;
  }

  async markScanned(token: string, scannedAt: string): Promise<void> {
    const bindings = await this.getAll();
    await this.save(bindings.map(binding =>
      binding.token === token ? { ...binding, lastScannedAt: scannedAt } : binding,
    ));
  }

  private async getAll(): Promise<HermesNfcBinding[]> {
    await this.ready;
    return ((await this.storage.get(NFC_BINDINGS_KEY)) ?? []) as HermesNfcBinding[];
  }

  private async save(bindings: HermesNfcBinding[]): Promise<void> {
    await this.ready;
    await this.storage.set(NFC_BINDINGS_KEY, bindings);
  }
}
