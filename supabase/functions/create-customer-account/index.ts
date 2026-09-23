import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CustomerAccountRequest {
  organizationId: string;
  fullName: string;
  email: string;
  phone?: string;
  city?: string;
  documentType?: 'cedula' | 'passport';
  documentNumber?: string;
  driverLicense?: string;
  temporaryPassword: string;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = request.headers.get('Authorization');
    if (!supabaseUrl || !serviceRoleKey || !authorization) return json({ error: 'Solicitud no autorizada.' }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const token = authorization.replace('Bearer ', '');
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: 'La sesión no es válida.' }, 401);

    const input = await request.json() as CustomerAccountRequest;
    if (!input.organizationId || !input.fullName?.trim() || !input.email?.trim() || input.temporaryPassword?.length < 8) {
      return json({ error: 'Faltan datos obligatorios o la contraseña temporal es muy corta.' }, 400);
    }

    const { data: membership } = await admin
      .from('memberships')
      .select('id')
      .eq('organization_id', input.organizationId)
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .eq('active', true)
      .maybeSingle();
    if (!membership) return json({ error: 'Solo un administrador de la empresa puede crear accesos.' }, 403);

    const { data, error } = await admin.auth.admin.createUser({
      email: input.email.trim().toLowerCase(),
      password: input.temporaryPassword,
      email_confirm: true,
      user_metadata: {
        registration_type: 'customer',
        organization_id: input.organizationId,
        full_name: input.fullName.trim(),
        phone: input.phone?.trim() ?? '',
        city: input.city?.trim() ?? '',
        document_type: input.documentType ?? '',
        document_number: input.documentNumber?.trim() ?? '',
        driver_license: input.driverLicense?.trim() ?? '',
        must_change_password: true,
      },
    });
    if (error) {
      const duplicate = error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('registered');
      return json({ error: duplicate ? 'Ya existe una cuenta con ese correo.' : error.message }, 400);
    }

    return json({ userId: data.user.id }, 201);
  } catch {
    return json({ error: 'No fue posible crear la cuenta del cliente.' }, 500);
  }
});

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
