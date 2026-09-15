import { expect, test } from '@playwright/test';
import { creaCasaVuota, creaUtenteDiTest, loginDiTest, NOME_GIORNO } from './fixtures';

test('crea categoria + attività + assegnazione → compare in Oggi nel giorno giusto', async ({ page }) => {
  const suffisso = Date.now();
  const email = `e2e-attivita-${suffisso}@ciurma.test`;
  await creaUtenteDiTest(email, 'password-e2e');

  await loginDiTest(page, email);
  await creaCasaVuota(page, 'Casa faccende', 'Tester');

  await page.getByText('Attività', { exact: true }).click();
  await page.getByPlaceholder('Nuova categoria').fill('Faccende domestiche');
  await page.getByText('Crea categoria').click();
  await page.getByText('Faccende domestiche').click();
  await page.getByPlaceholder('Nuova attività').fill('Buttare la spazzatura');
  await page.getByText('Aggiungi', { exact: true }).click();
  await expect(page.getByText(/Buttare la spazzatura/)).toBeVisible();

  // Assegna la categoria a "Tester" per il giorno di oggi, tramite il vero
  // editor di assegnazione (selettore L M M G V S D), non via SQL diretto.
  const oggiIndex = new Date().getDay();
  const nomeGiornoOggi = NOME_GIORNO[oggiIndex]!;
  await page.getByLabel('Scegli un membro da assegnare').selectOption({ label: 'Tester' });
  await page.getByRole('button', { name: nomeGiornoOggi, exact: true }).click();
  await page.getByText('Assegna', { exact: true }).click();
  await expect(page.getByText(/Tester \(/)).toBeVisible();

  await page.getByText('Oggi', { exact: true }).click();
  await expect(page.getByText('Faccende domestiche')).toBeVisible();
  await expect(page.getByText(/Buttare la spazzatura/)).toBeVisible();
  await expect(page.getByText(/Nessuna categoria assegnata/)).not.toBeVisible();
});

test('attività con giorni propri compare solo nei suoi giorni, anche fuori dai giorni della categoria', async ({
  page,
}) => {
  const suffisso = Date.now();
  const email = `e2e-lavatrice-${suffisso}@ciurma.test`;
  await creaUtenteDiTest(email, 'password-e2e');

  await loginDiTest(page, email);
  await creaCasaVuota(page, 'Casa lavatrice', 'Tester');

  await page.getByText('Attività', { exact: true }).click();
  await page.getByPlaceholder('Nuova categoria').fill('Faccende domestiche');
  await page.getByText('Crea categoria').click();
  await page.getByText('Faccende domestiche').click();
  await page.getByPlaceholder('Nuova attività').fill('Lavatrice');
  await page.getByText('Aggiungi', { exact: true }).click();

  // Apre il dettaglio dell'attività e imposta "Solo in certi giorni" su un
  // giorno diverso da oggi, per verificare che l'attività NON compaia oggi
  // anche se la categoria fosse assegnata a tutti i giorni.
  const oggiIndex = new Date().getDay();
  const domani = NOME_GIORNO[(oggiIndex + 1) % 7]!;

  await page.getByText(/Lavatrice/).click();
  await page.getByLabel('Solo in certi giorni (scavalca i giorni della categoria)').check();
  await page.getByRole('button', { name: domani, exact: true }).click();
  await page.getByText('Salva', { exact: true }).click();

  // Assegna la categoria a tutti i giorni: senza il filtro sui giorni
  // propri dell'attività, "Lavatrice" comparirebbe comunque oggi.
  await page.getByLabel('Scegli un membro da assegnare').selectOption({ label: 'Tester' });
  for (const giorno of NOME_GIORNO) {
    await page.getByRole('button', { name: giorno, exact: true }).click();
  }
  await page.getByText('Assegna', { exact: true }).click();

  await page.getByText('Oggi', { exact: true }).click();
  await expect(page.getByText(/Lavatrice/)).not.toBeVisible();
});
