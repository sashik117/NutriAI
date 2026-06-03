import assert from 'node:assert/strict';

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5176';
const apiUrl = process.env.API_URL || 'http://localhost:4001';

const pages = ['/', '/log', '/meal-plan', '/profile', '/water', '/weight', '/history', '/gamification'];

function localIsoDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
  if (typeof options === 'number') {
    timeoutMs = options;
    options = {};
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkFrontendPage(path) {
  const url = new URL(path, frontendUrl).toString();
  const response = await fetchWithTimeout(url);
  assert.ok(response.ok, `${url} returned ${response.status}`);

  const html = await response.text();
  assert.match(html, /<div id="root"><\/div>/, `${url} does not look like the Vite app shell`);
  assert.doesNotMatch(html, /ReferenceError|TypeError|SyntaxError/, `${url} contains obvious runtime error text`);
}

async function checkApiHealth() {
  const url = new URL('/api/health', apiUrl).toString();
  const response = await fetchWithTimeout(url);
  assert.ok(response.ok, `${url} returned ${response.status}`);

  const body = await response.json();
  assert.equal(body.ok, true, `${url} did not return { ok: true }`);
}

async function checkSessionAuth() {
  const protectedUrl = new URL('/api/entities/UserProfile', apiUrl).toString();
  const unauthenticated = await fetchWithTimeout(protectedUrl);
  assert.equal(unauthenticated.status, 401, 'protected entity API should require a session cookie');

  const stamp = Date.now().toString(36);
  const registerUrl = new URL('/api/auth/register', apiUrl).toString();
  const registerResponse = await fetchWithTimeout(registerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `smoke-${stamp}@nutriai.test`,
      nickname: `Smoke${stamp}`.replace(/[^A-Za-z0-9_]/g, '').slice(0, 19),
      password: 'Test12345!',
      role: 'coach',
    }),
  });
  assert.ok(registerResponse.ok, `${registerUrl} returned ${registerResponse.status}`);

  const sessionCookie = registerResponse.headers.get('set-cookie')?.split(';')[0];
  assert.ok(sessionCookie?.startsWith('nutriai_session='), 'register should set nutriai_session cookie');

  const registeredUser = await registerResponse.json();
  assert.equal(registeredUser.role, 'coach');

  const meUrl = new URL('/api/auth/me', apiUrl).toString();
  const meResponse = await fetchWithTimeout(meUrl, { headers: { Cookie: sessionCookie } });
  assert.ok(meResponse.ok, `${meUrl} returned ${meResponse.status}`);

  const me = await meResponse.json();
  assert.equal(me.email, registeredUser.email);
  assert.equal(me.role, 'coach');

  const inviteUrl = new URL('/api/coach/invites', apiUrl).toString();
  const inviteResponse = await fetchWithTimeout(inviteUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ expires_days: 7, max_uses: 5 }),
  });
  assert.ok(inviteResponse.ok, `${inviteUrl} returned ${inviteResponse.status}`);
  const invite = await inviteResponse.json();
  assert.match(invite.code, /^NAI-[A-F0-9]{8}$/);

  const clientStamp = `${stamp}c`;
  const clientResponse = await fetchWithTimeout(registerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `client-${clientStamp}@nutriai.test`,
      nickname: `Client${clientStamp}`.replace(/[^A-Za-z0-9_]/g, '').slice(0, 19),
      password: 'Test12345!',
      role: 'user',
    }),
  });
  assert.ok(clientResponse.ok, `${registerUrl} client returned ${clientResponse.status}`);
  const clientCookie = clientResponse.headers.get('set-cookie')?.split(';')[0];
  const client = await clientResponse.json();

  const connectUrl = new URL('/api/coach/connect', apiUrl).toString();
  const connectResponse = await fetchWithTimeout(connectUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientCookie },
    body: JSON.stringify({ code: invite.code }),
  });
  assert.ok(connectResponse.ok, `${connectUrl} returned ${connectResponse.status}`);
  const connection = await connectResponse.json();
  assert.equal(connection.coach.email, registeredUser.email);

  const mealPlanResponse = await fetchWithTimeout(new URL('/api/entities/MealPlan', apiUrl).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientCookie },
    body: JSON.stringify({
      title: 'Smoke plan',
      selected_day_index: 0,
      plan: {
        generatedAt: new Date().toISOString(),
        startDate: localIsoDate(),
        days: [
          {
            day: 'Smoke day',
            meals: [
              {
                id: 'smoke-meal-1',
                slot: 'lunch',
                title: 'Smoke Pasta',
                calories: 420,
                proteins: 20,
                fats: 12,
                carbs: 55,
                ingredients: [{ name: 'Pasta', amount: 80, unit: 'g' }],
              },
            ],
          },
          {
            day: 'Smoke tomorrow',
            meals: [
              {
                id: 'smoke-meal-2',
                slot: 'lunch',
                title: 'Smoke Rice Bowl',
                calories: 520,
                proteins: 24,
                fats: 16,
                carbs: 68,
                ingredients: [{ name: 'Rice', amount: 90, unit: 'g' }],
              },
            ],
          },
        ],
        selectedMeals: ['smoke-meal-1', 'smoke-meal-2'],
      },
    }),
  });
  assert.ok(mealPlanResponse.ok, `client meal plan returned ${mealPlanResponse.status}`);

  const foodLogResponse = await fetchWithTimeout(new URL('/api/entities/FoodLog', apiUrl).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientCookie },
    body: JSON.stringify({
      meal_type: 'lunch',
      description: 'Smoke Pasta',
      items: [{ name: 'Smoke Pasta', amount: 250, unit: 'g', calories: 420, proteins: 20, fats: 12, carbs: 55 }],
      total_calories: 420,
      total_proteins: 20,
      total_fats: 12,
      total_carbs: 55,
      date: localIsoDate(),
    }),
  });
  assert.ok(foodLogResponse.ok, `client food log returned ${foodLogResponse.status}`);

  const clientsUrl = new URL(`/api/coach/clients?date=${localIsoDate()}`, apiUrl).toString();
  const clientsResponse = await fetchWithTimeout(clientsUrl, { headers: { Cookie: sessionCookie } });
  assert.ok(clientsResponse.ok, `${clientsUrl} returned ${clientsResponse.status}`);
  const clients = await clientsResponse.json();
  assert.equal(clients[0]?.client?.email, client.email);
  assert.equal(clients[0]?.today?.plan_adherence?.matched_count, 1);
  assert.equal(clients[0]?.today?.plan_adherence?.selected_count, 1);
  assert.equal(clients[0]?.today?.plan_adherence?.plan_day_index, 0);

  const noteUrl = new URL(`/api/coach/clients/${client.id}/notes`, apiUrl).toString();
  const noteResponse = await fetchWithTimeout(noteUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ note: 'Smoke note' }),
  });
  assert.ok(noteResponse.ok, `${noteUrl} returned ${noteResponse.status}`);

  const disconnectUrl = new URL(`/api/coach/my-coaches/${connection.relationship.id}`, apiUrl).toString();
  const disconnectResponse = await fetchWithTimeout(disconnectUrl, {
    method: 'DELETE',
    headers: { Cookie: clientCookie },
  });
  assert.ok(disconnectResponse.ok, `${disconnectUrl} returned ${disconnectResponse.status}`);

  const revokeResponse = await fetchWithTimeout(new URL(`/api/coach/invites/${invite.id}`, apiUrl).toString(), {
    method: 'DELETE',
    headers: { Cookie: sessionCookie },
  });
  assert.ok(revokeResponse.ok, `coach invite revoke returned ${revokeResponse.status}`);
  assert.equal((await revokeResponse.json()).status, 'revoked');
}

for (const page of pages) {
  await checkFrontendPage(page);
}

await checkApiHealth();
await checkSessionAuth();

console.log(`http smoke ok: ${pages.length} pages + api health + session auth + coach flow`);
