import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonButton, IonContent, IonInput, IonTextarea } from '@ionic/angular/standalone';
import { VehicleService } from '../../core/services/vehicle.service';
import { MetricComponent } from '../../shared/components/metric/metric.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusComponent } from '../../shared/components/status/status.component';
import { VehicleCardComponent } from '../../shared/components/vehicle-card/vehicle-card.component';
import { VehicleImageComponent } from '../../shared/components/vehicle-image/vehicle-image.component';

@Component({
  selector: 'app-design-system',
  standalone: true,
  imports: [ReactiveFormsModule, IonButton, IonContent, IonInput, IonTextarea, MetricComponent, PageHeaderComponent, StatusComponent, VehicleCardComponent, VehicleImageComponent],
  templateUrl: './design-system.page.html',
  styleUrl: './design-system.page.scss',
})
export class DesignSystemPage {
  readonly vehicles = toSignal(inject(VehicleService).getAll(), { initialValue: [] });
  readonly submitted = signal(false);
  readonly saved = signal(false);
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.pattern(/\S/)] }),
    note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(160)] }),
  });

  // Esta lista describe los colores del sistema, no datos del negocio.
  readonly palette = [
    { name: 'Hermes Navy', hex: '#0B1736', token: '--hermes-navy', usage: 'Identidad y títulos' },
    { name: 'Hermes Blue', hex: '#163B82', token: '--hermes-blue', usage: 'Acciones y foco' },
    { name: 'Canvas', hex: '#F7F6F2', token: '--hermes-canvas', usage: 'Fondo de trabajo' },
    { name: 'Surface', hex: '#FFFFFF', token: '--hermes-surface', usage: 'Superficies puntuales' },
    { name: 'Graphite', hex: '#20242C', token: '--hermes-graphite', usage: 'Texto principal' },
    { name: 'Muted', hex: '#6D7480', token: '--hermes-muted', usage: 'Elementos de apoyo' },
    { name: 'Border', hex: '#E3E5E8', token: '--hermes-border', usage: 'Líneas y separadores' },
    { name: 'Hermes Amber', hex: '#D08A32', token: '--hermes-amber', usage: 'Atención, con moderación' },
    { name: 'Critical', hex: '#B94343', token: '--hermes-critical', usage: 'Errores e incidencias' },
  ];
  readonly spacing = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80];

  validateExample(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.saved.set(this.form.valid);
  }

  resetExample(): void {
    this.form.reset();
    this.submitted.set(false);
    this.saved.set(false);
  }
}
