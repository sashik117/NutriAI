import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy, Loader2, Save, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';

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
  if (!itemKey || itemKey === mealKey || mealKey.includes(itemKey)) return null;
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

function buildListFromMeals(meals) {
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

function getSavedLists() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function ShoppingList({ day, dayIndex = 0, meals = [], activeMeals, autoGenerateToken = 0, onGenerateRequest }) {
  const { isEnglish, text } = useLanguage();
  const [list, setList] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);

  const sourceMeals = activeMeals || meals;
  const mealSignature = useMemo(() => sourceMeals.map((meal) => meal.id || `${meal.slot}-${meal.title}`).sort().join('-') || 'empty', [sourceMeals]);
  const storageId = `shopping-${dayIndex}-${day?.day || 'plan'}-${mealSignature}`;
  const totalItems = useMemo(() => list?.categories?.reduce((sum, category) => sum + category.items.length, 0) || 0, [list]);
  const checkedCount = useMemo(() => list?.categories?.reduce((sum, category) => sum + category.items.filter((item) => item.checked).length, 0) || 0, [list]);

  useEffect(() => {
    const savedLists = getSavedLists();
    const savedList = savedLists[storageId]?.list;
    setList(savedList || null);
    setSaved(Boolean(savedList));
  }, [storageId]);

  const generate = useCallback(async () => {
    if (!sourceMeals.length) {
      toast.error(text('Спочатку виберіть страви галочкою', 'Select meals with a checkmark first'));
      return;
    }
    setGenerating(true);
    try {
      const nextList = buildListFromMeals(sourceMeals);
      setList(nextList);
      setSaved(false);
      toast.success(text('Список покупок готовий', 'Shopping list is ready'));
    } finally {
      setGenerating(false);
    }
  }, [sourceMeals]);

  useEffect(() => {
    if (autoGenerateToken) generate();
  }, [autoGenerateToken, generate]);

  const updateItem = (categoryId, itemId, patch) => {
    setList((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId
          ? { ...category, items: category.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)) }
          : category
      ),
    }));
    setSaved(false);
  };

  const deleteItem = (categoryId, itemId) => {
    setList((current) => ({
      ...current,
      categories: current.categories
        .map((category) => (category.id === categoryId ? { ...category, items: category.items.filter((item) => item.id !== itemId) } : category))
        .filter((category) => category.items.length),
    }));
    setSaved(false);
    toast.success(text('Прибрано зі списку', 'Removed from list'));
  };

  const saveList = () => {
    if (!list) return;
    const savedLists = getSavedLists();
    savedLists[storageId] = {
      day: day?.day,
      meals: sourceMeals.map((meal) => meal.title),
      savedAt: new Date().toISOString(),
      list,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLists));
    setSaved(true);
    toast.success(text('Список збережено', 'List saved'));
  };

  const copyToClipboard = () => {
    if (!list) return;
    const text = list.categories
      .map((category) => `${category.name}:\n${category.items.map((item) => `- ${item.name} — ${item.displayAmount}`).join('\n')}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success(text('Список скопійовано', 'List copied'));
  };
  const categoryLabel = (name) => {
    if (!isEnglish) return name;
    return name
      .replace('Овочі та фрукти', 'Vegetables & fruit')
      .replace("М'ясо та риба", 'Meat & fish')
      .replace('Молочка', 'Dairy')
      .replace('Бакалія', 'Pantry')
      .replace('Додатково', 'Extras')
      .replace('Інше', 'Other');
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold">{text('Список покупок', 'Shopping list')}</p>
          <p className="text-xs text-muted-foreground">
            {text('Вибрано страв', 'Selected meals')}: <span className="font-semibold text-foreground">{sourceMeals.length}</span>
          </p>
        </div>
        {list && <p className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{checkedCount}/{totalItems}</p>}
      </div>

      {!list ? (
        <Button variant="outline" className="h-12 w-full rounded-xl gap-2" onClick={onGenerateRequest || generate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
          {generating ? text('Складаю список...', 'Building list...') : text('Скласти список покупок', 'Build shopping list')}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-9 flex-1 rounded-xl gap-1.5" onClick={saveList}>
              <Save className="h-3.5 w-3.5" />
              {saved ? text('Збережено', 'Saved') : text('Зберегти', 'Save')}
            </Button>
            <Button size="sm" variant="outline" className="h-9 flex-1 rounded-xl gap-1.5" onClick={copyToClipboard}>
              <Copy className="h-3.5 w-3.5" />
              {text('Копія', 'Copy')}
            </Button>
            <Button size="sm" variant="ghost" className="h-9 rounded-xl px-3" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : text('Оновити', 'Refresh')}
            </Button>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: totalItems ? `${(checkedCount / totalItems) * 100}%` : '0%' }} />
          </div>

          {list.categories.map((category) => (
            <div key={category.id} className="rounded-2xl bg-muted/35 p-3">
              <p className="mb-2 text-xs font-extrabold text-muted-foreground">{categoryLabel(category.name)}</p>
              <div className="space-y-2">
                {category.items.map((item) => (
                  <div key={item.id} className={`rounded-xl bg-background p-2 ${item.checked ? 'opacity-55' : ''}`}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateItem(category.id, item.id, { checked: !item.checked })}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${item.checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}
                      >
                        {item.checked && <Check className="h-3 w-3" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${item.checked ? 'line-through' : ''}`}>{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.displayAmount}</p>
                      </div>
                      <button type="button" className="rounded-full p-2 text-muted-foreground hover:text-destructive" onClick={() => deleteItem(category.id, item.id)} title={text('Видалити', 'Delete')}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {item.note && <p className="mt-1 pl-7 text-[10px] text-muted-foreground">{item.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
