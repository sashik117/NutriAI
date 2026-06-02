import { expect, test } from '@playwright/test';

function makeUser(testName) {
  const safeName = testName.replace(/[^a-z0-9]/gi, '').slice(0, 16) || 'flow';
  const stamp = Date.now();
  return {
    email: `e2e-${safeName}-${stamp}@nutriai.test`.toLowerCase(),
    nickname: `E2E_${safeName.slice(0, 10)}_${String(stamp).slice(-4)}`,
    name: `E2E ${safeName}`,
  };
}

async function prepareApp(page, testName) {
  const user = makeUser(testName);
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.addInitScript((storedUser) => {
    window.localStorage.setItem('nutriai_user', JSON.stringify(storedUser));
    window.localStorage.setItem('nutriai_onboarding_done', 'true');
    window.localStorage.setItem('nutriai_language', 'uk');
    window.sessionStorage.setItem('nutriai:splash-seen', '1');
  }, user);

  return { user, consoleErrors, pageErrors };
}

async function expectNoRuntimeErrors(consoleErrors, pageErrors) {
  const ignored = [/favicon/i, /ResizeObserver loop/i];
  const relevantConsoleErrors = consoleErrors.filter((error) => !ignored.some((pattern) => pattern.test(error)));
  expect(pageErrors, 'page runtime errors').toEqual([]);
  expect(relevantConsoleErrors, 'console errors').toEqual([]);
}

test('critical mobile routes render without raw technical output', async ({ page }, testInfo) => {
  const { consoleErrors, pageErrors } = await prepareApp(page, testInfo.title);
  const routes = ['/', '/log', '/meal-plan', '/profile', '/water', '/weight', '/gamification'];

  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator('body')).not.toContainText('NaN');
    await expect(page.locator('body')).not.toContainText('{"');
  }

  await expectNoRuntimeErrors(consoleErrors, pageErrors);
});

test('user can analyze and save a food entry from AI text', async ({ page }, testInfo) => {
  const { consoleErrors, pageErrors } = await prepareApp(page, testInfo.title);

  await page.route('**/api/ai/invoke', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        description: 'Гречка з куркою та салатом',
        total_calories: 420,
        total_proteins: 32,
        total_fats: 11,
        total_carbs: 48,
        ai_tip: 'Збалансований прийом їжі.',
        items: [
          {
            name: 'Гречка варена',
            unit: 'g',
            amount: 150,
            weight_g: 150,
            calories: 165,
            proteins: 5.5,
            fats: 1.5,
            carbs: 33,
          },
          {
            name: 'Куряче філе',
            unit: 'g',
            amount: 120,
            weight_g: 120,
            calories: 198,
            proteins: 26,
            fats: 8,
            carbs: 0,
          },
          {
            name: 'Овочевий салат',
            unit: 'g',
            amount: 100,
            weight_g: 100,
            calories: 57,
            proteins: 1,
            fats: 1.5,
            carbs: 15,
          },
        ],
      }),
    });
  });

  await page.goto('/log');
  await expect(page.getByRole('heading', { name: 'Додати їжу' })).toBeVisible();

  await page.locator('textarea').fill('гречка з куркою 270 г і салат');
  await page.getByLabel('Проаналізувати їжу').click();

  const dishNameInputs = page.getByRole('textbox', { name: 'Назва страви' });
  await expect(dishNameInputs.nth(0)).toHaveValue('Гречка варена');
  await expect(dishNameInputs.nth(1)).toHaveValue('Куряче філе');
  await expect(page.getByText('420')).toBeVisible();

  const createLog = page.waitForResponse((response) =>
    response.url().includes('/api/entities/FoodLog') && response.request().method() === 'POST' && response.ok()
  );
  await page.getByRole('button', { name: /Зберегти/ }).click();
  await createLog;

  await expect(page.getByText(/Гречка варена 150/)).toBeVisible();
  await expect(page.getByText(/Куряче філе 120/)).toBeVisible();
  await expect(page.getByText('420')).toBeVisible();

  await expectNoRuntimeErrors(consoleErrors, pageErrors);
});
