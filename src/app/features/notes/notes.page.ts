import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonRefresher, IonRefresherContent, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonLabel, IonInput, IonTextarea, IonButton, IonCheckbox, RefresherCustomEvent } from '@ionic/angular/standalone';
import { LocalNotesService } from '../../core/services/local-notes.service';
import { CameraService } from '../../core/services/camera.service';
import { LocalNote } from '../../core/models/local-note.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-notes', standalone: true,
  imports: [DatePipe, FormsModule, IonContent, IonRefresher, IonRefresherContent, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonLabel, IonInput, IonTextarea, IonButton, IonCheckbox],
  template: `<ion-content>
    <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content pullingText="Desliza para actualizar" refreshingText="Actualizando bitácora" /></ion-refresher>
    <main class="page">
      <p class="eyebrow">Operaciones</p><h1>Mi bitácora</h1>
      <p>Notas y fotografías guardadas en este dispositivo para tu cuenta. Disponibles sin conexión. Desliza una nota para editarla o eliminarla.</p>
      <form class="panel" (ngSubmit)="save()">
        <h2>{{ editingId ? 'Editar nota' : 'Nueva nota' }}</h2>
        <ion-input label="Título" labelPlacement="stacked" fill="outline" placeholder="Ej. Revisar neumáticos" name="title" [(ngModel)]="title" maxlength="120" required />
        <ion-textarea label="Detalle de la operación" labelPlacement="stacked" fill="outline" placeholder="Anota los detalles de la revisión" name="detail" [(ngModel)]="detail" maxlength="2000" [rows]="3" [autoGrow]="true" />
        @if (photo) { <img class="photo" [src]="photo" alt="Fotografía adjunta a la nota"><ion-button fill="clear" type="button" (click)="photo = ''">Quitar fotografía</ion-button> }
        <div class="actions"><ion-button type="button" fill="outline" (click)="capture()" [disabled]="busy()">Tomar fotografía</ion-button><ion-button type="submit" [disabled]="busy() || !title.trim()">Guardar nota</ion-button><ion-button type="button" fill="clear" (click)="reset()">Cancelar</ion-button></div>
      </form>
      @if (message()) { <p class="notice" role="status">{{ message() }}</p> }
      @if (loading()) { <p role="status">Cargando bitácora…</p> }
      <ion-list aria-label="Notas guardadas">
        @for (note of notes(); track note.id) {
          <ion-item-sliding>
            <ion-item><ion-checkbox slot="start" [checked]="note.done" [disabled]="busy()" (ionChange)="toggle(note, $event.detail.checked)" [attr.aria-label]="'Completar ' + note.title" />
              <ion-label><h2>{{ note.title }}</h2><p>{{ note.detail }}</p><small>{{ note.updatedAt | date:'dd/MM/yyyy HH:mm' }} · {{ note.done ? 'Completada' : 'Pendiente' }}</small>@if (note.photo) { <img class="thumbnail" [src]="note.photo" alt="Evidencia de la nota"> }</ion-label>
              <ion-button fill="clear" (click)="edit(note)" [disabled]="busy()">Editar</ion-button><ion-button fill="clear" color="danger" (click)="remove(note)" [disabled]="busy()">Eliminar</ion-button>
            </ion-item>
            <ion-item-options side="end"><ion-item-option (click)="edit(note)">Editar</ion-item-option><ion-item-option color="danger" (click)="remove(note)">Eliminar</ion-item-option></ion-item-options>
          </ion-item-sliding>
        } @empty { @if (!loading()) { <p class="notice">Aún no tienes notas. Guarda la primera para tu próxima operación.</p> } }
      </ion-list>
    </main>
  </ion-content>`,
  styles: [`.page{max-width:980px;margin:auto;padding:24px;display:grid;gap:16px}.panel{padding:20px;border:1px solid var(--hermes-border);background:var(--hermes-surface);border-radius:12px}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.photo{max-width:100%;max-height:260px;border-radius:10px}.thumbnail{display:block;width:96px;height:64px;object-fit:cover;margin-top:8px;border-radius:6px}ion-label p{white-space:pre-wrap}ion-item{--background:var(--hermes-surface)}@media(max-width:520px){.page{padding:16px}ion-item ion-button{font-size:11px}}`],
})
export class NotesPage {
  private readonly storage = inject(LocalNotesService);
  private readonly camera = inject(CameraService);
  private readonly auth = inject(AuthService);
  private refreshRequest = 0;
  private captureRequest = 0;
  private accountKey = '';
  readonly notes = signal<LocalNote[]>([]);
  readonly message = signal('');
  readonly busy = signal(false);
  readonly loading = signal(false);
  title = ''; detail = ''; photo = ''; editingId = ''; done = false;

  constructor() {
    effect(() => {
      const user = this.auth.user();
      const key = user ? `${user.id}.${user.organizationId}` : '';
      if (key !== this.accountKey) {
        this.accountKey = key; this.notes.set([]); this.reset(); this.message.set('');
        void this.refresh();
      }
    });
  }
  ionViewWillEnter() { void this.refresh(); }
  async refresh(event?: RefresherCustomEvent) {
    const request = ++this.refreshRequest;
    const userId = this.auth.user()?.id;
    this.loading.set(true);
    try { const rows = await this.storage.list(); if (request === this.refreshRequest && userId === this.auth.user()?.id) this.notes.set(rows); }
    catch { this.message.set('No fue posible cargar la bitácora. Inténtalo de nuevo.'); }
    finally { if (request === this.refreshRequest) this.loading.set(false); await event?.target.complete(); }
  }
  async save() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.storage.save({ id: this.editingId || crypto.randomUUID(), title: this.title, detail: this.detail, photo: this.photo || undefined, done: this.done });
      this.reset(); await this.refresh(); this.message.set('Nota guardada en este dispositivo.');
    } catch (error) { this.message.set(error instanceof Error ? error.message : 'No fue posible guardar la nota.'); }
    finally { this.busy.set(false); }
  }
  edit(note: LocalNote) { this.editingId = note.id; this.title = note.title; this.detail = note.detail; this.photo = note.photo ?? ''; this.done = note.done; this.message.set('Editando la nota seleccionada.'); }
  reset() { this.captureRequest++; this.editingId = ''; this.title = ''; this.detail = ''; this.photo = ''; this.done = false; }
  async remove(note: LocalNote) {
    if (this.busy() || !window.confirm(`¿Eliminar la nota «${note.title}»?`)) return;
    this.busy.set(true);
    try { await this.storage.remove(note.id); if (this.editingId === note.id) this.reset(); await this.refresh(); this.message.set('Nota eliminada.'); }
    catch { this.message.set('No fue posible eliminar la nota.'); }
    finally { this.busy.set(false); }
  }
  async toggle(note: LocalNote, done: boolean) {
    try { await this.storage.save({ ...note, done }); if (this.editingId === note.id) this.done = done; await this.refresh(); }
    catch { this.message.set('No fue posible cambiar el estado.'); }
  }
  async capture() {
    const request = ++this.captureRequest;
    this.busy.set(true);
    try { const photo = await this.camera.capture(); if (request === this.captureRequest) { this.photo = photo; this.message.set('Fotografía preparada. Guarda la nota para conservarla.'); } }
    catch (error) { this.message.set(this.camera.errorMessage(error)); }
    finally { this.busy.set(false); }
  }
}
