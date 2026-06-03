import { expect, test } from '@playwright/test';

function makeUser(testName) {
  const safeName = testName.replace(/[^a-z0-9]/gi, '').slice(0, 16) || 'flow';
  const stamp = Date.now();
  const unique = `${stamp.toString(36).slice(-5)}${Math.random().toString(36).slice(2, 7)}`;
  return {
    email: `e2e-${safeName}-${stamp}@nutriai.test`.toLowerCase(),
    nickname: `E2E${unique}`.slice(0, 19),
    name: `E2E ${safeName}`,
    password: 'Test12345!',
  };
}

function makeWeeklyPlan() {
  const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота', 'Неділя'];
  return {
    days: dayNames.map((day, index) => ({
      day,
      total_calories: 1800 + index * 10,
      total_proteins: 120,
      total_fats: 58,
      total_carbs: 205,
      meals: [
        {
          slot: 'breakfast',
          title: index === 0 ? 'Боул з куркою та рисом' : `Вівсянка з ягодами ${index + 1}`,
          description: 'Збалансована страва під денну норму.',
          grams: 320,
          calories: 480,
          proteins: 35,
          fats: 12,
          carbs: 58,
          ingredients: index === 0
            ? [
                { name: 'Куряче філе', amount: '120', unit: 'г', weight_g: 120 },
                { name: 'Рис', amount: '80', unit: 'г', weight_g: 80 },
                { name: 'Овочі', amount: '150', unit: 'г', weight_g: 150 },
              ]
            : [
                { name: 'Вівсяні пластівці', amount: '50', unit: 'г', weight_g: 50 },
                { name: 'Ягоди', amount: '100', unit: 'г', weight_g: 100 },
              ],
        },
        {
          slot: 'snack',
          title: `Йогурт з фруктами ${index + 1}`,
          description: 'Легкий перекус.',
          grams: 220,
          calories: 240,
          proteins: 16,
          fats: 7,
          carbs: 28,
          ingredients: [
            { name: 'Йогурт', amount: '200', unit: 'г', weight_g: 200 },
            { name: 'Банан', amount: '1', unit: 'шт', weight_g: 120 },
          ],
        },
        {
          slot: 'lunch',
          title: index === 0 ? 'Рис з куркою та овочами' : `Паста з тунцем ${index + 1}`,
          description: 'Ситний обід.',
          grams: 420,
          calories: 640,
          proteins: 42,
          fats: 18,
          carbs: 76,
          ingredients: index === 0
            ? [
                { name: 'Куряче філе', amount: '150', unit: 'г', weight_g: 150 },
                { name: 'Рис', amount: '90', unit: 'г', weight_g: 90 },
                { name: 'Овочі', amount: '200', unit: 'г', weight_g: 200 },
              ]
            : [
                { name: 'Паста', amount: '90', unit: 'г', weight_g: 90 },
                { name: 'Тунець', amount: '120', unit: 'г', weight_g: 120 },
              ],
        },
        {
          slot: 'dinner',
          title: `Салат з лососем ${index + 1}`,
          description: 'Легка вечеря.',
          grams: 350,
          calories: 500,
          proteins: 32,
          fats: 21,
          carbs: 38,
          ingredients: [
            { name: 'Лосось', amount: '160', unit: 'г', weight_g: 160 },
            { name: 'Салатний мікс', amount: '120', unit: 'г', weight_g: 120 },
          ],
        },
      ],
    })),
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

  const registerResponse = await page.request.post('/api/auth/register', {
    data: {
      email: user.email,
      nickname: user.nickname,
      password: user.password,
      role: 'user',
    },
  });
  expect(registerResponse.ok(), await registerResponse.text()).toBeTruthy();
  const registeredUser = await registerResponse.json();

  await page.addInitScript((storedUser) => {
    window.localStorage.setItem('nutriai_user', JSON.stringify(storedUser));
    window.localStorage.setItem('nutriai_onboarding_done', 'true');
    window.localStorage.setItem('nutriai_language', 'uk');
    window.sessionStorage.setItem('nutriai:splash-seen', '1');
  }, registeredUser);

  return { user: registeredUser, consoleErrors, pageErrors };
}

async function expectNoRuntimeErrors(consoleErrors, pageErrors) {
  const ignored = [/favicon/i, /ResizeObserver loop/i];
  const relevantConsoleErrors = consoleErrors.filter((error) => !ignored.some((pattern) => pattern.test(error)));
  expect(pageErrors, 'page runtime errors').toEqual([]);
  expect(relevantConsoleErrors, 'console errors').toEqual([]);
}

async function waitForMountedApp(page) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.waitForFunction(
        () => {
          const root = document.querySelector('#root');
          return root?.children.length > 0;
        },
        null,
        { timeout: attempt === 0 ? 12_000 : 25_000 }
      );
      return;
    } catch (error) {
      if (attempt === 1) throw error;
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
  }
}

test('critical mobile routes render without raw technical output', async ({ page }, testInfo) => {
  const { consoleErrors, pageErrors } = await prepareApp(page, testInfo.title);
  const routes = ['/', '/log', '/meal-plan', '/profile', '/water', '/weight', '/history', '/gamification', '/coach'];

  for (const route of routes) {
    await page.goto(route);
    await waitForMountedApp(page);
    const bodyText = await page.locator('body').innerText();
    if (bodyText.trim()) {
      expect(bodyText).not.toContain('undefined');
      expect(bodyText).not.toContain('NaN');
      expect(bodyText).not.toContain('{"');
    }
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

test('plate scanner can analyze an uploaded gallery photo', async ({ page }, testInfo) => {
  const { consoleErrors, pageErrors } = await prepareApp(page, testInfo.title);

  await page.route('**/api/files', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ file_url: '/uploads/e2e-plate.jpg' }),
    });
  });

  await page.route('**/api/ai/invoke', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        dish_name: 'Паста Болоньєзе',
        description: 'Паста Болоньєзе з мʼясним соусом',
        total_calories: 610,
        total_proteins: 28,
        total_fats: 18,
        total_carbs: 82,
        items: [
          {
            name: 'Паста варена',
            unit: 'g',
            amount: 220,
            weight_g: 220,
            calories: 330,
            proteins: 11,
            fats: 2,
            carbs: 68,
          },
          {
            name: 'Мʼясний соус',
            unit: 'g',
            amount: 130,
            weight_g: 130,
            calories: 280,
            proteins: 17,
            fats: 16,
            carbs: 14,
          },
        ],
      }),
    });
  });

  await page.goto('/log');
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'plate.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });

  const dishNameInputs = page.getByRole('textbox', { name: 'Назва страви' });
  await expect(dishNameInputs.nth(0)).toHaveValue('Паста варена');
  await expect(dishNameInputs.nth(1)).toHaveValue('Мʼясний соус');
  await expect(page.getByText('610')).toBeVisible();

  const createLog = page.waitForResponse((response) =>
    response.url().includes('/api/entities/FoodLog') && response.request().method() === 'POST' && response.ok()
  );
  await page.getByRole('button', { name: /Зберегти/ }).click();
  await createLog;

  await expect(page.getByText(/Паста варена 220/)).toBeVisible();
  await expect(page.getByText(/Мʼясний соус 130/)).toBeVisible();

  await expectNoRuntimeErrors(consoleErrors, pageErrors);
});

test('barcode label upload can create editable product nutrition', async ({ page }, testInfo) => {
  const { consoleErrors, pageErrors } = await prepareApp(page, testInfo.title);

  await page.route('**/api/files', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ file_url: '/uploads/e2e-label.jpg' }),
    });
  });

  await page.route('**/api/ai/invoke', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        name: 'Твікс батончик',
        brand: 'Mars',
        package_weight_g: 50,
        calories_per_100g: 495,
        proteins_per_100g: 4.5,
        fats_per_100g: 24,
        carbs_per_100g: 65,
      }),
    });
  });

  await page.goto('/log');
  await page.locator('input[type="file"]').nth(1).setInputFiles({
    name: 'label.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });

  await expect(page.getByRole('textbox', { name: 'Назва страви' })).toHaveValue('Mars Твікс батончик');
  await expect(page.getByText('248')).toBeVisible();

  await page.getByRole('spinbutton').first().fill('55');
  const createLog = page.waitForResponse((response) =>
    response.url().includes('/api/entities/FoodLog') && response.request().method() === 'POST' && response.ok()
  );
  await page.getByRole('button', { name: /Зберегти/ }).click();
  await createLog;

  await expect(page.getByText(/Mars Твікс батончик 55/)).toBeVisible();

  await expectNoRuntimeErrors(consoleErrors, pageErrors);
});

test('water tracker supports add, edit, and delete', async ({ page }, testInfo) => {
  const { consoleErrors, pageErrors } = await prepareApp(page, testInfo.title);

  await page.goto('/water');
  await expect(page.getByRole('heading', { name: /Трекер води/ })).toBeVisible();

  const createWater = page.waitForResponse((response) =>
    response.url().includes('/api/entities/WaterLog') && response.request().method() === 'POST' && response.ok()
  );
  await page.getByRole('button', { name: /150/ }).click();
  await createWater;
  await expect(page.locator('body')).toContainText('150 / 2000');

  await page.getByRole('button', { name: 'Редагувати запис води' }).click();
  await page.getByRole('spinbutton').fill('300');
  const updateWater = page.waitForResponse((response) =>
    response.url().includes('/api/entities/WaterLog') && response.request().method() === 'PUT' && response.ok()
  );
  await page.getByRole('button', { name: 'Зберегти запис води' }).click();
  await updateWater;
  await expect(page.locator('body')).toContainText('300 / 2000');

  const deleteWater = page.waitForResponse((response) =>
    response.url().includes('/api/entities/WaterLog') && response.request().method() === 'DELETE' && response.ok()
  );
  await page.getByRole('button', { name: 'Видалити запис води' }).click();
  await deleteWater;
  await expect(page.locator('body')).toContainText('0 / 2000');

  await expectNoRuntimeErrors(consoleErrors, pageErrors);
});

test('profile language switch and smart goal calculation work', async ({ page }, testInfo) => {
  const { consoleErrors, pageErrors } = await prepareApp(page, testInfo.title);

  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Профіль' })).toBeVisible();

  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();

  await page.getByLabel('Age').fill('24');
  await page.getByLabel('Height, cm').fill('165');
  await page.getByLabel('Current weight, kg').fill('49');
  const saveProfile = page.waitForResponse((response) =>
    response.url().includes('/api/entities/UserProfile') && ['POST', 'PUT'].includes(response.request().method()) && response.ok()
  );
  await page.getByLabel('Target weight, kg').fill('54');
  await expect(page.getByText('Muscle gain')).toBeVisible();
  await saveProfile;
  await expect(page.locator('body')).toContainText('saved');

  await expectNoRuntimeErrors(consoleErrors, pageErrors);
});

test('meal plan builds shopping list from selected meal ingredients', async ({ page }, testInfo) => {
  const { consoleErrors, pageErrors } = await prepareApp(page, testInfo.title);

  await page.route('**/api/ai/invoke', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(makeWeeklyPlan()),
    });
  });

  await page.goto('/meal-plan');
  await expect(page.getByRole('heading', { name: 'План харчування' })).toBeVisible();

  await page.getByRole('button', { name: /Згенерувати план/ }).click();
  await expect(page.getByText('Боул з куркою та рисом')).toBeVisible();
  await expect(page.getByText('Рис з куркою та овочами')).toBeVisible();

  await page.getByRole('button', { name: /Вибрати страву Боул з куркою та рисом/ }).click();
  await page.getByRole('button', { name: /Вибрати страву Рис з куркою та овочами/ }).click();
  await page.getByRole('button', { name: /Скласти список покупок/ }).click();

  await expect(page.getByText('Куряче філе')).toBeVisible();
  await expect(page.getByText('270 г')).toBeVisible();
  await expect(page.getByText('Рис', { exact: true })).toBeVisible();
  await expect(page.getByText('170 г')).toBeVisible();

  await page.getByRole('button', { name: /Позначити купленим Куряче філе/ }).click();
  await expect(page.getByRole('button', { name: /Зняти позначку Куряче філе/ })).toBeVisible();
  await page.getByRole('button', { name: /Видалити Рис/ }).click();
  await expect(page.getByText('170 г')).toHaveCount(0);

  await expectNoRuntimeErrors(consoleErrors, pageErrors);
});

test('rewards can generate a clean personal challenge', async ({ page }, testInfo) => {
  const { consoleErrors, pageErrors } = await prepareApp(page, testInfo.title);

  await page.route('**/api/ai/invoke', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        title: 'Білковий фокус',
        description: 'Маленький тижневий виклик без зайвого тиску.',
        emoji: '✨',
        tasks: [
          'Додати білок у сніданок',
          'Випити норму води',
          'Занести всі прийоми їжі',
          'Підготувати перекус заздалегідь',
          'Перевірити баланс вечері',
        ],
      }),
    });
  });

  await page.goto('/gamification');
  await expect(page.getByRole('heading', { name: /Нагороди/ })).toBeVisible();
  await page.getByRole('button', { name: /Згенерувати виклик ШІ/ }).click();

  await expect(page.getByText('Білковий фокус')).toBeVisible();
  await expect(page.getByText('Додати білок у сніданок')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('*');
  await expect(page.locator('body')).not.toContainText('#');

  await expectNoRuntimeErrors(consoleErrors, pageErrors);
});
