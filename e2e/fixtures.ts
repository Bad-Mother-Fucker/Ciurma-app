import { createClient } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

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

/** Login via bypass e2e + Google, per un utente già creato con creaUtenteDiTest. */
export async function loginDiTest(page: Page, email: string, password = 'password-e2e') {
  await page.goto('/');
  await page.getByTestId('e2e-email').fill(email);
  await page.getByTestId('e2e-password').fill(password);
  await page.getByTestId('e2e-login-submit').click();
}

/**
 * Crea una casa vuota (senza i dati di partenza proposti in onboarding, per
 * avere test deterministici) e vi entra come admin.
 */
export async function creaCasaVuota(page: Page, nomeCasa: string, nomeMembro = 'Tester') {
  await page.getByText('Crea la tua casa').click();
  await page.getByPlaceholder('Nome della casa').fill(nomeCasa);
  await page.getByPlaceholder('Il tuo nome').fill(nomeMembro);
  await page.getByLabel(/Partiamo da queste/).uncheck();
  await page.getByText('Crea la casa').click();
  await expect(page).toHaveURL(/\/oggi/);
}

/** Mappa lo stesso indice usato da Date.getDay() (0=domenica) al nome del giorno mostrato dal SelettoreGiorni. */
export const NOME_GIORNO = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
