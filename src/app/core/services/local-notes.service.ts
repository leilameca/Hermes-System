import { Injectable, inject } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { AuthService } from './auth.service';
import { LocalNote } from '../models/local-note.model';

@Injectable({ providedIn: 'root' })
export class LocalNotesService {
  private readonly storage = inject(Storage);
  private readonly auth = inject(AuthService);
  private readonly ready = this.storage.create();
  private writes: Promise<unknown> = Promise.resolve();

  private key() {
    const user = this.auth.user();
    if (!user) throw new Error('Inicia sesión para consultar tu bitácora.');
    return `hermes.notes.v1.${user.organizationId ?? 'personal'}.${user.id}`;
  }

  async list(): Promise<LocalNote[]> {
    const key = this.key();
    await this.ready;
    await this.writes;
    return (await this.storage.get(key)) ?? [];
  }

  save(input: Omit<LocalNote, 'updatedAt'>): Promise<void> {
    const title = input.title.trim();
    if (!title || title.length > 120) return Promise.reject(new Error('Escribe un título de hasta 120 caracteres.'));
    if (input.detail.length > 2000) return Promise.reject(new Error('El detalle puede tener hasta 2000 caracteres.'));
    const note = { ...input, title, updatedAt: new Date().toISOString() };
    return this.mutate(rows => [note, ...rows.filter(row => row.id !== note.id)]);
  }

  remove(id: string) { return this.mutate(rows => rows.filter(row => row.id !== id)); }

  private mutate(update: (rows: LocalNote[]) => LocalNote[]): Promise<void> {
    const key = this.key();
    const operation = this.writes.then(async () => {
      await this.ready;
      const rows: LocalNote[] = (await this.storage.get(key)) ?? [];
      await this.storage.set(key, update(rows));
    });
    this.writes = operation.catch(() => undefined);
    return operation;
  }
}
