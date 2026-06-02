import assert from 'node:assert/strict';

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5176';
const apiUrl = process.env.API_URL || 'http://localhost:4001';

const pages = ['/', '/log', '/meal-plan', '/profile', '/water', '/weight', '/gamification'];

async function fetchWithTimeout(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
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

for (const page of pages) {
  await checkFrontendPage(page);
}

await checkApiHealth();

console.log(`http smoke ok: ${pages.length} pages + api health`);
