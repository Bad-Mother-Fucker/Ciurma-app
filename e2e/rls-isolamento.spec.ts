import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { admin, creaUtenteDiTest } from './fixtures';

const url = process.env.VITE_SUPABASE_URL ?? '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';

/**
 * Verifica ATTIVA della RLS: il client di un utente della casa A prova a
 * leggere e scrivere dati della casa B. Deve fallire (righe vuote in
 * lettura, errore o 0 righe in scrittura) — mai avere successo.
 */
test('isolamento RLS tra due case', async () => {
  const emailA = `e2e-rls-a-${Date.now()}@ciurma.test`;
  const emailB = `e2e-rls-b-${Date.now()}@ciurma.test`;
  const idA = await creaUtenteDiTest(emailA, 'password-e2e');
  const idB = await creaUtenteDiTest(emailB, 'password-e2e');

  const { data: casaA } = await admin.from('casa').insert({ nome: 'Casa A' }).select().single();
  const { data: casaB } = await admin.from('casa').insert({ nome: 'Casa B' }).select().single();
  await admin.from('membro').insert({ casa_id: casaA.id, utente_id: idA, nome: 'A', ruolo: 'admin' });
  await admin.from('membro').insert({ casa_id: casaB.id, utente_id: idB, nome: 'B', ruolo: 'admin' });
  const { data: prodottoB } = await admin
    .from('prodotto')
    .insert({ casa_id: casaB.id, nome: 'Segreto di B' })
    .select()
    .single();

  const clienteA = createClient(url, anonKey);
  const { error: erroreLogin } = await clienteA.auth.signInWithPassword({
    email: emailA,
    password: 'password-e2e',
  });
  expect(erroreLogin).toBeNull();

  // Lettura incrociata: la riga di B non deve comparire nei risultati di A.
  const { data: lettura } = await clienteA.from('prodotto').select('*').eq('casa_id', casaB.id);
  expect(lettura ?? []).toHaveLength(0);

  const { data: letturaProdotto } = await clienteA
    .from('prodotto')
    .select('*')
    .eq('id', prodottoB.id)
    .maybeSingle();
  expect(letturaProdotto).toBeNull();

  // Scrittura incrociata: il tentativo di aggiornare un prodotto della
  // casa B da parte del client A non deve modificare nulla.
  const { data: scrittura } = await clienteA
    .from('prodotto')
    .update({ nome: 'Compromesso' })
    .eq('id', prodottoB.id)
    .select();
  expect(scrittura ?? []).toHaveLength(0);

  const { data: verificaIntegrita } = await admin
    .from('prodotto')
    .select('nome')
    .eq('id', prodottoB.id)
    .single();
  expect(verificaIntegrita?.nome).toBe('Segreto di B');

  // Inserimento incrociato: A non può creare righe nella casa B.
  const { error: erroreInserimento } = await clienteA
    .from('categoria_attivita')
    .insert({ casa_id: casaB.id, nome: 'Iniettata da A' });
  expect(erroreInserimento).not.toBeNull();

  await admin.from('casa').delete().eq('id', casaA.id);
  await admin.from('casa').delete().eq('id', casaB.id);
});
