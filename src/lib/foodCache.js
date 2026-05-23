// Simple localStorage-based cache for AI food queries
const CACHE_KEY = 'kbju_food_cache';
const MAX_ENTRIES = 100;

function getCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

function normalizeKey(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function getCachedFood(text) {
  const cache = getCache();
  return cache[normalizeKey(text)] || null;
}

export function setCachedFood(text, result) {
  const cache = getCache();
  const key = normalizeKey(text);
  cache[key] = { ...result, _cached_at: Date.now() };

  // Keep only latest MAX_ENTRIES
  const keys = Object.keys(cache);
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys.sort((a, b) => (cache[a]._cached_at || 0) - (cache[b]._cached_at || 0));
    sorted.slice(0, keys.length - MAX_ENTRIES).forEach(k => delete cache[k]);
  }

  setCache(cache);
}

export function isCacheableQuery(text) {
  // Cache short, simple food entries (not complex descriptions)
  const t = text.trim();
  return t.length < 60 && !t.includes(' і ') && !t.includes(' та ') && !t.includes(',');
}