import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { arrowForwardOutline, eyeOffOutline, eyeOutline, lockClosedOutline, mailOutline } from 'ionicons/icons';
import { InitialAccount } from '../../core/models/auth-user.model';
import { AuthService, INITIAL_ACCOUNTS } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, IonContent, IonIcon, ThemeToggleComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly demoUsers = INITIAL_ACCOUNTS;
  readonly companySlug = this.route.snapshot.queryParamMap.get('empresa')?.trim() ?? '';
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

  fill(user: InitialAccount) {
    this.email = user.email;
    this.password = '';
    this.showPassword = false;
    this.error = '';
  }

  async submit() {
    if (this.loading) return;
    this.error = '';
    this.loading = true;
    try {
      const user = await this.auth.login(this.email, this.password);
      await this.router.navigateByUrl(user.home);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No fue posible iniciar sesión.';
    } finally {
      this.loading = false;
    }
  }
}
