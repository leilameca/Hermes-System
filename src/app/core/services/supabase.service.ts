import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface SupabaseConnectionResult {
  connected: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(
      environment.supabase.url,
      environment.supabase.publishableKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: !Capacitor.isNativePlatform(),
        },
      },
    );
  }

  // Esta prueba funcionara despues de ejecutar el esquema SQL en Supabase.
  async checkConnection(): Promise<SupabaseConnectionResult> {
    const { error } = await this.client
      .from('organizations')
      .select('id')
      .limit(1);

    if (error) {
      return {
        connected: false,
        message: `No se pudo consultar Supabase: ${error.message}`,
      };
    }

    return {
      connected: true,
      message: 'Conexion con Supabase disponible.',
    };
  }
}
