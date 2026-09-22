import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { arrowForwardOutline, businessOutline, eyeOffOutline, eyeOutline, lockClosedOutline, mailOutline, personOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, IonContent, IonIcon, ThemeToggleComponent],
  templateUrl: './register.page.html',
  styleUrl: './register.page.scss',
})
export class RegisterPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly companySlug = this.route.snapshot.paramMap.get('empresa') ?? '';
  company: { id: string; name: string; city: string } | null = null;
  name = '';
  phone = '';
  email = '';
  password = '';
  confirmation = '';
  showPassword = false;
  loading = true;
  sending = false;
  error = '';
  message = '';

  readonly arrowIcon = arrowForwardOutline;
  readonly businessIcon = businessOutline;
  readonly eyeIcon = eyeOutline;
  readonly eyeOffIcon = eyeOffOutline;
  readonly lockIcon = lockClosedOutline;
  readonly mailIcon = mailOutline;
  readonly personIcon = personOutline;

  async ngOnInit() {
    try {
      this.company = await this.auth.companyForRegistration(this.companySlug);
      if (!this.company) this.error = 'Este enlace no pertenece a una empresa activa en Hermes.';
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No fue posible validar la empresa.';
    } finally {
      this.loading = false;
    }
  }

  async submit() {
    if (!this.company || this.sending) return;
    this.error = '';
    this.message = '';
    if (this.password.length < 8) {
      this.error = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }
    if (this.password !== this.confirmation) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    this.sending = true;
    try {
      const needsConfirmation = await this.auth.registerCustomer({
        companySlug: this.companySlug,
        name: this.name,
        phone: this.phone,
        email: this.email,
        password: this.password,
      });
      if (needsConfirmation) {
        this.message = 'Cuenta creada. Revisa tu correo para confirmar el acceso.';
      } else {
        await this.router.navigateByUrl('/cliente/inicio');
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No fue posible crear la cuenta.';
    } finally {
      this.sending = false;
    }
  }
}
