import assert from 'node:assert/strict';

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5176';
const apiUrl = process.env.API_URL || 'http://localhost:4001';

const pages = ['/', '/log', '/meal-plan', '/profile', '/water', '/weight', '/history', '/gamification'];

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
}

for (const page of pages) {
  await checkFrontendPage(page);
}

await checkApiHealth();
await checkSessionAuth();

console.log(`http smoke ok: ${pages.length} pages + api health + session auth`);
