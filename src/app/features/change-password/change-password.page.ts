import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [FormsModule, IonContent],
  templateUrl: './change-password.page.html',
  styleUrl: './change-password.page.scss',
})
export class ChangePasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  password = '';
  confirmation = '';
  loading = false;
  error = '';

  async submit() {
    this.error = '';
    if (this.password.length < 8) { this.error = 'La contraseña debe tener al menos 8 caracteres.'; return; }
    if (this.password !== this.confirmation) { this.error = 'Las contraseñas no coinciden.'; return; }
    this.loading = true;
    try {
      const user = await this.auth.changePassword(this.password);
      await this.router.navigateByUrl(user.home, { replaceUrl: true });
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No fue posible cambiar la contraseña.';
    } finally {
      this.loading = false;
    }
  }

  async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
