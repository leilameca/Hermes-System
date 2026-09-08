import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthDemoService, DEMO_USERS, DemoUser } from '../../core/services/auth-demo.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IonContent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthDemoService);
  private readonly router = inject(Router);
  readonly demoUsers = DEMO_USERS;
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  error = '';

  fill(user: DemoUser) {
    this.email = user.email;
    this.password = user.password;
    this.error = '';
  }

  async submit() {
    if (this.loading) return;
    this.error = '';
    this.loading = true;
    await new Promise(resolve => setTimeout(resolve, 650));
    const user = this.auth.login(this.email, this.password);
    this.loading = false;
    if (!user) {
      this.error = 'Usuario o contraseña incorrectos.';
      return;
    }
    await this.router.navigateByUrl(user.home);
  }
}
