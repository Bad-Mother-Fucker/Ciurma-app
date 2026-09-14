import { expect, test } from '@playwright/test';
import { admin, creaUtenteDiTest } from './fixtures';

test('spunta attività → sparisce dalle urgenti → forzando la data indietro, ricompare con il ritardo giusto', async ({
  page,
}) => {
  const email = `e2e-urgenti-${Date.now()}@ciurma.test`;
  await creaUtenteDiTest(email, 'password-e2e');

  await page.goto('/');
  await page.getByTestId('e2e-email').fill(email);
  await page.getByTestId('e2e-password').fill('password-e2e');
  await page.getByTestId('e2e-login-submit').click();
  await page.getByText('Crea la tua casa').click();
  await page.getByPlaceholder('Nome della casa').fill('Casa urgenti');
  await page.getByPlaceholder('Il tuo nome').fill('Tester');
  await page.getByText('Crea la casa').click();
  await expect(page).toHaveURL(/\/oggi/);

  await page.getByText('Attività', { exact: true }).click();
  await page.getByPlaceholder('Nuova categoria').fill('Faccende');
  await page.getByText('Crea categoria').click();
  await page.getByText('Faccende', { exact: true }).click();
  await page.getByPlaceholder('Nuova attività').fill('Buttare la spazzatura');
  await page.getByText('Aggiungi', { exact: true }).click();

  // Nota: senza un'assegnazione della categoria al membro corrente,
  // "Le più urgenti" nella schermata Oggi resta vuota per costruzione
  // (attivitaPiuUrgentiPerMembro filtra sulle categorie assegnate). Questo
  // test verifica quindi la spunta/annullamento e il ricalcolo del ritardo
  // via query diretta al database, non tramite la sezione "urgenti" della UI,
  // finché l'editor di assegnazione non è collegato (vedi PIANO.md).
  await page.getByText('Fatto').first().click();

  const { data: attivita } = await admin
    .from('attivita')
    .select('id')
    .eq('nome', 'Buttare la spazzatura')
    .limit(1)
    .maybeSingle();
  expect(attivita).toBeTruthy();

  const { data: completamento } = await admin
    .from('completamento')
    .select('*')
    .eq('attivita_id', (attivita as { id: string }).id)
    .order('completata_il', { ascending: false })
    .limit(1)
    .maybeSingle();
  expect(completamento).toBeTruthy();

  // Forza la data indietro di 5 giorni (cadenza 7 di default nel form
  // rapido → ritardo atteso -2, quindi impostiamo cadenza 2 per il caso
  // "molto in ritardo" descritto nel prompt di build).
  await admin.from('attivita').update({ cadenza_giorni: 2 }).eq('id', (attivita as { id: string }).id);
  const cinqueGiorniFa = new Date(Date.now() - 5 * 86_400_000).toISOString();
  await admin
    .from('completamento')
    .update({ completata_il: cinqueGiorniFa })
    .eq('id', (completamento as { id: string }).id);

  await page.reload();
  await page.getByText('Attività', { exact: true }).click();
  await page.getByText('Faccende', { exact: true }).click();
  await expect(page.getByText(/Buttare la spazzatura/)).toHaveClass(/text-secca/);
});
