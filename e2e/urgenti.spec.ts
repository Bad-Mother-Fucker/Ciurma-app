import { expect, test } from '@playwright/test';
import { admin, creaCasaVuota, creaUtenteDiTest, loginDiTest, NOME_GIORNO } from './fixtures';

test('spunta attività → sparisce dalle urgenti → forzando la data indietro, ricompare con il ritardo giusto', async ({
  page,
}) => {
  const email = `e2e-urgenti-${Date.now()}@ciurma.test`;
  await creaUtenteDiTest(email, 'password-e2e');

  await loginDiTest(page, email);
  await creaCasaVuota(page, 'Casa urgenti', 'Tester');

  await page.getByText('Attività', { exact: true }).click();
  await page.getByPlaceholder('Nuova categoria').fill('Faccende');
  await page.getByText('Crea categoria').click();
  await page.getByText('Faccende', { exact: true }).click();
  await page.getByPlaceholder('Nuova attività').fill('Buttare la spazzatura');
  await page.getByLabel('Cadenza della nuova attività').selectOption({ label: 'Ogni 2 giorni' });
  await page.getByText('Aggiungi', { exact: true }).click();
  await expect(page.getByText(/Buttare la spazzatura/)).toBeVisible();

  // Assegna la categoria a Tester per tutti i giorni, tramite l'editor di
  // assegnazione: così è visibile in Oggi indipendentemente dal giorno in
  // cui gira il test.
  await page.getByLabel('Scegli un membro da assegnare').selectOption({ label: 'Tester' });
  for (const giorno of NOME_GIORNO) {
    await page.getByRole('button', { name: giorno, exact: true }).click();
  }
  await page.getByText('Assegna', { exact: true }).click();
  await expect(page.getByText(/Tester \(/)).toBeVisible();

  await page.getByText('Oggi', { exact: true }).click();
  await expect(page.getByText(/Buttare la spazzatura/)).toBeVisible();

  // Spunta: il pulsante diventa "Annulla" (finestra dei 5 minuti).
  await page.getByText('Fatto', { exact: true }).click();
  await expect(page.getByText('Annulla', { exact: true })).toBeVisible();

  // Annullamento: torna "Fatto", il completamento appena creato sparisce.
  await page.getByText('Annulla', { exact: true }).click();
  await expect(page.getByText('Fatto', { exact: true })).toBeVisible();

  // Spunta di nuovo per davvero questa volta.
  await page.getByText('Fatto', { exact: true }).click();
  await expect(page.getByText('Annulla', { exact: true })).toBeVisible();

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

  // Forza la data indietro di 5 giorni: cadenza 2 -> ritardo 3 -> "molto in
  // ritardo" (0 < ritardo <= cadenza sarebbe "in ritardo"; oltre, "molto in
  // ritardo"), come nell'esempio del prompt di build.
  const cinqueGiorniFa = new Date(Date.now() - 5 * 86_400_000).toISOString();
  await admin
    .from('completamento')
    .update({ completata_il: cinqueGiorniFa })
    .eq('id', (completamento as { id: string }).id);

  await page.reload();
  await expect(page.getByText(/Da 3 giorni non tocchi: Buttare la spazzatura/)).toBeVisible();
});
