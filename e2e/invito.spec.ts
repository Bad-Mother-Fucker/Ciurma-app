import { expect, test } from '@playwright/test';
import { creaCasaVuota, creaUtenteDiTest, loginDiTest } from './fixtures';

test('login → crea casa → genera invito → secondo utente entra → entrambi si vedono', async ({
  browser,
}) => {
  const suffisso = Date.now();
  const emailA = `e2e-a-${suffisso}@ciurma.test`;
  const emailB = `e2e-b-${suffisso}@ciurma.test`;
  await creaUtenteDiTest(emailA, 'password-e2e');
  await creaUtenteDiTest(emailB, 'password-e2e');

  const contestoA = await browser.newContext();
  const pagA = await contestoA.newPage();
  await loginDiTest(pagA, emailA);
  await creaCasaVuota(pagA, 'Casa e2e', 'Utente A');

  await pagA.getByText('Impostazioni').click();
  await pagA.getByText('Genera link di invito').click();
  const testoLink = await pagA.locator('p.break-all').textContent();
  expect(testoLink).toBeTruthy();
  const token = new URL(testoLink!).pathname.split('/invito/')[1];

  const contestoB = await browser.newContext();
  const pagB = await contestoB.newPage();
  await pagB.goto(`/invito/${token}`);
  await pagB.getByTestId('e2e-email').fill(emailB);
  await pagB.getByTestId('e2e-password').fill('password-e2e');
  await pagB.getByTestId('e2e-login-submit').click();

  await pagB.getByPlaceholder('Il tuo nome').fill('Utente B');
  await pagB.getByText('Entra nella casa').click();
  await expect(pagB).toHaveURL(/\/oggi/);

  await pagB.getByText('Impostazioni').click();
  await expect(pagB.getByText('Utente A')).toBeVisible();
  await expect(pagB.getByText('Utente B')).toBeVisible();

  await pagA.reload();
  await expect(pagA.getByText('Utente B')).toBeVisible();

  await contestoA.close();
  await contestoB.close();
});
