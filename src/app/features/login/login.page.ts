import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { arrowForwardOutline, eyeOffOutline, eyeOutline, lockClosedOutline, mailOutline } from 'ionicons/icons';
import { AuthDemoService, DEMO_USERS, DemoUser } from '../../core/services/auth-demo.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IonContent, IonIcon, ThemeToggleComponent],
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
  readonly arrowIcon = arrowForwardOutline;
  readonly eyeIcon = eyeOutline;
  readonly eyeOffIcon = eyeOffOutline;
  readonly lockIcon = lockClosedOutline;
  readonly mailIcon = mailOutline;

  fill(user: DemoUser) {
    this.email = user.email;
    this.password = user.password;
    this.showPassword = true;
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
      this.error = 'El correo o la contraseña no coinciden.';
      return;
    }
    await this.router.navigateByUrl(user.home);
  }
}
