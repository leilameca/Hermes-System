import { expect, Page } from '@playwright/test';
export async function login(page: Page, role: 'admin' | 'agent' | 'customer' = 'admin') {
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'prueba@hermes.test', aud: 'authenticated', role: 'authenticated', created_at: '2026-10-01T00:00:00Z', app_metadata: {}, user_metadata: {} };
  const token = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated', role: 'authenticated' })).toString('base64url')}.test`;
  await page.context().route('**/*.supabase.co/**', async route => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    if (url.pathname.includes('/auth/v1/token')) body = { access_token: token, refresh_token: 'fixture-refresh', expires_in: 3600, token_type: 'bearer', user };
    else if (url.pathname.includes('/auth/v1/user')) body = user;
    else if (url.pathname.includes('/profiles')) body = { full_name: 'Cuenta de pruebas', platform_role: 'user', active: true, must_change_password: false };
    else if (url.pathname.includes('/memberships') && !url.searchParams.has('user_id')) body = [];
    else if (url.pathname.includes('/memberships')) body = role === 'customer' ? null : { organization_id: '22222222-2222-4222-8222-222222222222', role, organizations: { name: 'Empresa de pruebas' } };
    else if (url.pathname.includes('/customer_accounts')) body = role === 'customer' ? { organization_id: '22222222-2222-4222-8222-222222222222', customer_id: 'c1', organizations: { name: 'Empresa de pruebas' } } : null;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.getByLabel('Contraseña', { exact: true }).fill('fixture-only');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${role === 'agent' ? 'agente' : role === 'customer' ? 'cliente' : 'admin'}/`));
}

