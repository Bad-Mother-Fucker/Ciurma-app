import { createClient } from '@supabase/supabase-js';

/**
 * Helper condivisi per i test e2e: creano utenti/casa di test via service
 * role (mai esposta al client) e fanno login con il bypass e2e via UI.
 */

const url = process.env.VITE_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function creaUtenteDiTest(email: string, password: string) {
  const { data: elenco } = await admin.auth.admin.listUsers();
  const esistente = elenco?.users.find((u) => u.email === email);
  if (esistente) {
    await admin.auth.admin.updateUserById(esistente.id, { password });
    return esistente.id;
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  return data.user.id;
}

export async function pulisciCasa(casaId: string) {
  await admin.from('casa').delete().eq('id', casaId);
}
