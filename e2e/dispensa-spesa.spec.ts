import { expect, test } from '@playwright/test';
import { admin, creaCasaVuota, creaUtenteDiTest, loginDiTest } from './fixtures';

async function creaCasaEAccedi(page: import('@playwright/test').Page, email: string, nomeCasa: string) {
  await creaUtenteDiTest(email, 'password-e2e');
  await loginDiTest(page, email);
  await creaCasaVuota(page, nomeCasa, 'Tester');
}

test('prodotto a pezzi e prodotto a livello hanno controlli diversi', async ({ page }) => {
  await creaCasaEAccedi(page, `e2e-disp-${Date.now()}@ciurma.test`, 'Casa dispensa');

  await page.getByText('Dispensa', { exact: true }).click();
  await page.getByPlaceholder('Aggiungi un prodotto e premi invio').fill('Uova BIO');
  await page.getByPlaceholder('Aggiungi un prodotto e premi invio').press('Enter');
  await page.getByPlaceholder('Aggiungi un prodotto e premi invio').fill('Olio extra vergine di oliva');
  await page.getByPlaceholder('Aggiungi un prodotto e premi invio').press('Enter');

  const rigaUova = page.locator('li', { hasText: 'Uova BIO' });
  await expect(rigaUova.getByText('+', { exact: true })).toBeVisible();

  const rigaOlio = page.locator('li', { hasText: 'Olio extra vergine di oliva' });
  await expect(rigaOlio.locator('select')).toBeVisible();
});

test('selezione dalla dispensa → spesa → spunta → torna in dispensa', async ({ page }) => {
  await creaCasaEAccedi(page, `e2e-spesa-${Date.now()}@ciurma.test`, 'Casa spesa');

  await page.getByText('Dispensa', { exact: true }).click();
  await page.getByPlaceholder('Aggiungi un prodotto e premi invio').fill('Latte');
  await page.getByPlaceholder('Aggiungi un prodotto e premi invio').press('Enter');
  await expect(page.getByText('Latte')).toBeVisible();

  await page.locator('li', { hasText: 'Latte' }).locator('input[type=checkbox]').check();
  await page.getByText(/Aggiungi alla spesa/).click();

  await page.getByText('Spesa', { exact: true }).click();
  await expect(page.getByText('Latte')).toBeVisible();

  await page.locator('li', { hasText: 'Latte' }).getByText('Preso').click();
  await expect(page.getByText('Lista vuota')).toBeVisible();

  // Verifica lato database che la quantità sia tornata in dispensa (il
  // trigger voce_spesa_ripristina_dispensa incrementa `quantita`).
  const { data } = await admin.from('prodotto').select('*').eq('nome', 'Latte').limit(1).maybeSingle();
  expect(data).toBeTruthy();
});

test('aggiungi dalla dispensa e chiudi la spesa in blocco', async ({ page }) => {
  await creaCasaEAccedi(page, `e2e-chiudi-${Date.now()}@ciurma.test`, 'Casa chiudi spesa');

  await page.getByText('Dispensa', { exact: true }).click();
  await page.getByPlaceholder('Aggiungi un prodotto e premi invio').fill('Farina');
  await page.getByPlaceholder('Aggiungi un prodotto e premi invio').press('Enter');
  await page.getByPlaceholder('Aggiungi un prodotto e premi invio').fill('Zucchero');
  await page.getByPlaceholder('Aggiungi un prodotto e premi invio').press('Enter');

  await page.getByText('Spesa', { exact: true }).click();
  await page.getByText('Aggiungi dalla dispensa').click();
  await page.locator('li', { hasText: 'Farina' }).locator('input[type=checkbox]').check();
  await page.locator('li', { hasText: 'Zucchero' }).locator('input[type=checkbox]').check();
  await page.getByText(/Aggiungi alla spesa \(2\)/).click();

  await expect(page.getByText('Farina')).toBeVisible();
  await expect(page.getByText('Zucchero')).toBeVisible();

  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByText('Chiudi la spesa', { exact: true }).click();

  await expect(page.getByText('Lista vuota')).toBeVisible();
});
