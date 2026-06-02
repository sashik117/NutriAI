const STORAGE_KEY = 'nutriai_shopping_lists';

const CATEGORY_ORDER = [
  '🥦 Овочі та фрукти',
  "🥩 М'ясо та риба",
  '🥛 Молочка',
  '🥖 Бакалія',
  '🧂 Додатково',
  '🛒 Інше',
];

function cleanText(value, fallback = '') {
  if (value && typeof value === 'object') return cleanText(value.name || value.title || value.description, fallback);
  return String(value || fallback)
    .replace(/\*/g, '')
    .replace(/[•]/g, '')
    .replace(/```json|```/gi, '')
    .replace(/["{}[\]]/g, '')
    .replace(/\b(name|amount|unit|ingredients|description|note)\s*:/gi, '')
    .replace(/,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseJsonish(value) {
  if (!value || typeof value !== 'string') return value;
  const text = value.replace(/```json|```/gi, '').trim();
  const candidates = [
    text,
    text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1),
    text.slice(text.indexOf('['), text.lastIndexOf(']') + 1),
  ].filter((candidate) => candidate && candidate.length > 1);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try next.
    }
  }
  return value;
}

function makeId(prefix, index, name) {
  return `${prefix}-${index}-${String(name || 'item').toLowerCase().replace(/[^a-zа-яіїєґ0-9]+/gi, '-')}`;
}

function canonicalName(name) {
  return cleanText(name)
    .toLowerCase()
    .replace(/\b(філе|свіже|свіжа|свіжий|варений|варена|готовий|готова)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAmountUnit(ingredient) {
  const rawUnit = cleanText(ingredient?.unit).toLowerCase();
  const rawAmount = ingredient?.amount ?? ingredient?.quantity ?? ingredient?.weight_g ?? ingredient?.grams;
  const amountText = cleanText(rawAmount);
  const joined = `${amountText} ${rawUnit}`.toLowerCase();
  const number = Number(String(amountText).replace(',', '.').match(/\d+(\.\d+)?/)?.[0]);

  let unit = rawUnit || joined.match(/\b(кг|kg|г|g|гр|л|l|мл|ml|шт|pcs|pc)\b/i)?.[1] || '';
  let amount = Number.isFinite(number) && number > 0 ? number : Number(ingredient?.weight_g) || 1;

  if (['kg', 'кг'].includes(unit)) {
    amount *= 1000;
    unit = 'г';
  } else if (['g', 'гр'].includes(unit)) {
    unit = 'г';
  } else if (['l', 'л'].includes(unit)) {
    amount *= 1000;
    unit = 'мл';
  } else if (unit === 'ml') {
    unit = 'мл';
  } else if (['pcs', 'pc'].includes(unit)) {
    unit = 'шт';
  }

  if (!unit) unit = Number(ingredient?.weight_g) > 0 ? 'г' : 'шт';
  return { amount: Math.round(amount * 10) / 10, unit };
}

function formatAmount(amount, unit) {
  if (unit === 'мл' && amount >= 1000 && amount % 1000 === 0) return `${amount / 1000} л`;
  if (unit === 'г' && amount >= 1000 && amount % 1000 === 0) return `${amount / 1000} кг`;
  return `${Math.round(amount * 10) / 10} ${unit}`;
}

function categoryForProduct(name) {
  const value = name.toLowerCase();
  if (/(яблу|банан|ягод|огір|помід|томат|морк|салат|перець|овоч|фрукт|зелень|авокадо|капуст|цибул|часник|буряк|черрі)/i.test(value)) return '🥦 Овочі та фрукти';
  if (/(кур|індич|ялов|свин|риба|лосос|тунец|тунець|кревет|морепр|фарш|філе|м'яс|мяс)/i.test(value)) return "🥩 М'ясо та риба";
  if (/(молок|йогурт|кефір|кефир|сир|творог|вершк|сметан|моцарел|фета)/i.test(value)) return '🥛 Молочка';
  if (/(рис|греч|булгур|кіноа|вівс|пластів|макарон|паста|хліб|лаваш|круп|нут|сочев|квасол|борошн|тост)/i.test(value)) return '🥖 Бакалія';
  if (/(олія|масло|горіх|насін|соус|мед|спец|сіль|перець|хумус)/i.test(value)) return '🧂 Додатково';
  return '🛒 Інше';
}

function normalizeIngredient(ingredient, meal) {
  const name = cleanText(ingredient?.name || ingredient?.product);
  if (!name) return null;
  const itemKey = canonicalName(name);
  const mealKey = canonicalName(meal?.title);
  if (!itemKey || itemKey === mealKey) return null;
  const { amount, unit } = parseAmountUnit(ingredient);
  if (!amount || amount <= 0) return null;
  return {
    name,
    key: `${itemKey}:${unit}`,
    amount,
    unit,
    sourceMeal: cleanText(meal?.title, 'Страва'),
  };
}

export function buildListFromMeals(meals) {
  const grouped = new Map();

  meals.forEach((meal) => {
    const ingredients = parseJsonish(meal.ingredients);
    const list = Array.isArray(ingredients) ? ingredients : [];
    list.forEach((ingredient) => {
      const item = normalizeIngredient(ingredient, meal);
      if (!item) return;

      const current = grouped.get(item.key) || {
        name: item.name,
        amount: 0,
        unit: item.unit,
        sources: [],
      };
      current.amount += item.amount;
      current.sources = [...new Set([...current.sources, item.sourceMeal])];
      grouped.set(item.key, current);
    });
  });

  const categories = new Map(CATEGORY_ORDER.map((category) => [category, []]));
  Array.from(grouped.values()).forEach((item, index) => {
    const categoryName = categoryForProduct(item.name);
    const items = categories.get(categoryName) || [];
    items.push({
      id: makeId(categoryName, index, `${item.name}-${item.unit}`),
      name: cleanText(item.name),
      amount: Math.round(item.amount * 10) / 10,
      unit: item.unit,
      displayAmount: formatAmount(item.amount, item.unit),
      note: item.sources.length > 1 ? `Для страв: ${item.sources.join(', ')}` : `Для страви: ${item.sources[0]}`,
      checked: false,
    });
    categories.set(categoryName, items);
  });

  return {
    categories: Array.from(categories.entries())
      .map(([name, items], index) => ({
        id: makeId('cat', index, name),
        name,
        items: items.sort((a, b) => a.name.localeCompare(b.name, 'uk')),
      }))
      .filter((category) => category.items.length),
  };
}

export function getSavedLists() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveShoppingList({ storageId, day, sourceMeals, list }) {
  const savedLists = getSavedLists();
  savedLists[storageId] = {
    day: day?.day,
    meals: sourceMeals.map((meal) => meal.title),
    savedAt: new Date().toISOString(),
    list,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLists));
}

export function shoppingListToClipboardText(list) {
  return list.categories
    .map((category) => `${category.name}:\n${category.items.map((item) => `- ${item.name} - ${item.displayAmount}`).join('\n')}`)
    .join('\n\n');
}
