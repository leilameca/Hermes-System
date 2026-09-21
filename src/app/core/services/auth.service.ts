import { Injectable, inject, signal } from '@angular/core';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { AuthState, AuthUserContext, InitialAccount } from '../models/auth-user.model';
import { SupabaseService } from './supabase.service';

export const INITIAL_ACCOUNTS: readonly InitialAccount[] = [
  { email: 'cliente@hermes.app', name: 'Laura Méndez', role: 'cliente' },
  { email: 'agente@hermes.app', name: 'Carlos Reyes', role: 'agente' },
  { email: 'admin@hermes.app', name: 'Mariana Soto', role: 'admin' },
  { email: 'superadmin@hermes.app', name: 'Valeria Núñez', role: 'super-admin' },
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly activeUser = signal<AuthUserContext | null>(null);
  private readonly activeState = signal<AuthState>('checking');
  private readonly initialization: Promise<void>;

  readonly user = this.activeUser.asReadonly();
  readonly state = this.activeState.asReadonly();

  constructor() {
    this.initialization = this.restoreSession();
    this.supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void this.applySession(session), 0);
    });
  }

  async ready(): Promise<void> {
    await this.initialization;
  }

  async login(email: string, password: string): Promise<AuthUserContext> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.user) {
      throw new Error(this.loginMessage(error?.message));
    }

    const context = await this.loadContext(data.user);
    this.activeUser.set(context);
    this.activeState.set('authenticated');
    return context;
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.activeUser.set(null);
    this.activeState.set('guest');
  }

  private async restoreSession(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    await this.applySession(data.session);
  }

  private async applySession(session: Session | null): Promise<void> {
    if (!session?.user) {
      this.activeUser.set(null);
      this.activeState.set('guest');
      return;
    }

    try {
      this.activeUser.set(await this.loadContext(session.user));
      this.activeState.set('authenticated');
    } catch {
      this.activeUser.set(null);
      this.activeState.set('guest');
    }
  }

  private async loadContext(user: SupabaseUser): Promise<AuthUserContext> {
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('full_name, platform_role, active')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.active) {
      throw new Error('Tu perfil no está activo. Comunícate con el administrador de HERMES.');
    }

    const { data: membership } = await this.supabase
      .from('memberships')
      .select('organization_id, role, organizations(name)')
      .eq('user_id', user.id)
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    const role = profile.platform_role === 'super_admin'
      ? 'super-admin'
      : membership?.role === 'admin'
        ? 'admin'
        : membership?.role === 'agent'
          ? 'agente'
          : 'cliente';
    const organization = membership?.organizations as { name?: string } | null;

    return {
      id: user.id,
      email: user.email ?? '',
      name: profile.full_name || user.email?.split('@')[0] || 'Usuario',
      role,
      home: this.homeFor(role),
      organizationId: membership?.organization_id ?? null,
      organizationName: organization?.name ?? null,
    };
  }

  private homeFor(role: AuthUserContext['role']): string {
    if (role === 'cliente') return '/cliente/inicio';
    if (role === 'agente') return '/agente/inicio';
    if (role === 'admin') return '/admin/dashboard';
    return '/super-admin/dashboard';
  }

  private loginMessage(message = ''): string {
    const normalized = message.toLowerCase();
    if (normalized.includes('email not confirmed')) return 'La cuenta todavía no ha sido confirmada por el administrador.';
    if (normalized.includes('invalid login credentials')) return 'El correo o la contraseña no coinciden.';
    return 'No fue posible iniciar sesión. Verifica tus datos e inténtalo nuevamente.';
  }
}
