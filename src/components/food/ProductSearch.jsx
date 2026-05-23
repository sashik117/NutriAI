import { useState } from 'react';
import { nutriApi } from '@/api/nutriApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Plus, Pencil, Check, Beef, Wheat, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ManualAddForm from './ManualAddForm';
import { cleanFoodText, estimateNutritionFromName, hasUsefulNutrition, repairNutritionItem } from '@/lib/nutritionFallback';

const round = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

function decodeHtml(value) {
  return String(value || '')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ');
}

function stripBrandNoise(name, brand = '') {
  let value = cleanFoodText(decodeHtml(name), '');
  const brandParts = String(brand || '').split(',').map((item) => cleanFoodText(item)).filter(Boolean);
  brandParts.forEach((part) => {
    if (part.length >= 3) value = value.replace(new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), '');
  });

  value = value
    .replace(/["'`«»“”]/g, ' ')
    .replace(/\b(de luxe|deluxe|premium|classic|original|brand|product)\b/gi, ' ')
    .replace(/\s*[-–—|,:;]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const lower = `${value} ${name}`.toLowerCase();
  if (/spaghetti|спагет|спагеті/.test(lower)) return 'Спагетті';
  if (/макарон|pasta|penne|fusilli|farfalle|вермішел/.test(lower)) return 'Макарони';
  if (/snickers|снікерс|сникерс/.test(lower)) return 'Snickers';
  if (/twix|твікс/.test(lower)) return 'Twix';

  return value || cleanFoodText(name, 'Продукт');
}

function canonicalGroup(product, query = '') {
  const text = `${product?.name || ''} ${query}`.toLowerCase();
  if (/spaghetti|спагет|спагеті/.test(text)) return 'spaghetti';
  if (/макарон|pasta|penne|fusilli|farfalle|вермішел/.test(text)) return 'pasta';
  if (/snickers|снікерс|сникерс/.test(text)) return 'snickers';
  if (/twix|твікс/.test(text)) return 'twix';
  return cleanFoodText(product?.name).toLowerCase().slice(0, 24);
}

function isSuspiciousTemplate(product) {
  const calories = Math.round(Number(product?.calories) || 0);
  const proteins = round(product?.proteins, 1);
  const fats = round(product?.fats, 1);
  const carbs = round(product?.carbs, 1);
  return calories === 200 && proteins === 8 && fats === 6 && carbs === 28;
}

function forceEstimate(product, query) {
  return estimateNutritionFromName(`${product?.name || query} ${query}`, {
    ...product,
    calories: 0,
    proteins: 0,
    fats: 0,
    carbs: 0,
  });
}

const cleanProduct = (product, query = '') => {
  const unit = product?.unit === 'ml' ? 'ml' : 'g';
  const amount = Math.max(Math.round(Number(product?.amount ?? product?.volume_ml ?? product?.weight_g) || 100), 1);
  const brand = cleanFoodText(decodeHtml(product?.brand || product?.brands || product?.ingredients), '');
  const cleaned = {
    name: stripBrandNoise(product?.name || query, brand),
    brand,
    serving_label: cleanFoodText(product?.serving_label, `${amount} ${unit === 'ml' ? 'мл' : 'г'}`),
    unit,
    amount,
    weight_g: Math.max(Math.round(Number(product?.weight_g ?? product?.grams ?? amount) || amount), 1),
    calories: Math.max(Math.round(Number(product?.calories) || 0), 0),
    proteins: round(product?.proteins, 1),
    fats: round(product?.fats, 1),
    carbs: round(product?.carbs, 1),
    ingredients: cleanFoodText(product?.ingredients, ''),
    source: product?.source || '',
  };

  if (isSuspiciousTemplate(cleaned)) return forceEstimate(cleaned, query);
  return repairNutritionItem(cleaned, query);
};

function normalizeOpenFoodFacts(product) {
  const nutriments = product?.nutriments || {};
  const calories = Number(nutriments['energy-kcal_100g']) || 0;
  const proteins = Number(nutriments.proteins_100g) || 0;
  const fats = Number(nutriments.fat_100g) || 0;
  const carbs = Number(nutriments.carbohydrates_100g) || 0;

  return {
    name: stripBrandNoise(product?.product_name || product?.generic_name || product?.brands, product?.brands),
    brand: cleanFoodText(decodeHtml(product?.brands?.split(',')?.[0]), ''),
    serving_label: '100 г',
    unit: 'g',
    amount: 100,
    weight_g: 100,
    calories: Math.round(calories),
    proteins: round(proteins, 1),
    fats: round(fats, 1),
    carbs: round(carbs, 1),
    ingredients: '',
    source: 'OpenFoodFacts',
  };
}

async function fetchOpenFoodFacts(query) {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  url.searchParams.set('search_terms', query);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', '5');
  url.searchParams.set('fields', 'product_name,generic_name,brands,nutriments');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return [];
    const data = await response.json();
    return (data.products || [])
      .map(normalizeOpenFoodFacts)
      .filter((item) => item.name && hasUsefulNutrition(item) && !isSuspiciousTemplate(item));
  } catch {
    return [];
  }
}

async function fetchGeminiProducts(query) {
  try {
    const result = await nutriApi.integrations.Core.InvokeLLM({
      prompt: `Дай реальне середнє КБЖУ для продукту "${query}" НА 100 ГРАМІВ.
Це пошук харчової цінності, не генератор випадкових чисел.
Правила:
1. Відповідай тільки JSON.
2. Усі products мають бути на 100 г, unit "g", amount 100, weight_g 100.
3. Не повторюй шаблонні цифри. Заборонений шаблон: 200 ккал, Б 8, Ж 6, В 28.
4. Snickers або Снікерс має бути приблизно 480-500 ккал / 100 г, жири близько 23-25 г, вуглеводи близько 60-65 г.
5. Сухі макарони мають бути приблизно 340-370 ккал / 100 г, жири близько 1-2 г. Варені макарони приблизно 140-160 ккал / 100 г.
6. Якщо точного бренду немає, дай чесну середню оцінку, але реалістичну.
7. Не використовуй markdown, зірочки або пояснювальний текст.`,
      response_json_schema: {
        type: 'object',
        properties: {
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                serving_label: { type: 'string' },
                unit: { type: 'string' },
                amount: { type: 'number' },
                weight_g: { type: 'number' },
                calories: { type: 'number' },
                proteins: { type: 'number' },
                fats: { type: 'number' },
                carbs: { type: 'number' },
                ingredients: { type: 'string' },
              },
            },
          },
        },
      },
      model: 'gemini_3_flash',
    });

    return (result.products || []).map((product) => ({ ...product, source: 'Gemini' }));
  } catch {
    return [];
  }
}

function dedupeProducts(products) {
  const seen = new Set();
  return products.filter((product) => {
    const key = [
      canonicalGroup(product),
      Math.round((Number(product.calories) || 0) / 25) * 25,
      Math.round((Number(product.proteins) || 0) / 2) * 2,
      Math.round((Number(product.fats) || 0) / 2) * 2,
      Math.round((Number(product.carbs) || 0) / 5) * 5,
    ].join('|');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function EditField({ label, icon, value, onChange }) {
  return (
    <label className="rounded-2xl border border-border bg-background/80 p-2">
      <span className="mb-1 block text-[10px] font-extrabold text-muted-foreground">{icon} {label}</span>
      <Input type="number" inputMode="decimal" value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-xl text-sm font-bold" />
    </label>
  );
}

export default function ProductSearch({ onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [draftProduct, setDraftProduct] = useState(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setShowManual(false);
    setEditingIndex(null);

    try {
      const offProducts = await fetchOpenFoodFacts(query);
      const geminiProducts = await fetchGeminiProducts(query);
      const cleaned = dedupeProducts([...offProducts, ...geminiProducts]
        .map((product) => cleanProduct(product, query))
        .map((product) => (isSuspiciousTemplate(product) ? forceEstimate(product, query) : product))
        .filter((item) => item.name && hasUsefulNutrition(item) && !isSuspiciousTemplate(item)));

      setResults(cleaned.length ? cleaned.slice(0, 5) : [forceEstimate({ name: query }, query)]);
    } finally {
      setLoading(false);
    }
  };

  const addItem = (item) => {
    onAdd(cleanProduct(item, query));
    setResults([]);
    setQuery('');
    setSearched(false);
    setShowManual(false);
    setEditingIndex(null);
    setDraftProduct(null);
  };

  const startEdit = (product, index) => {
    setEditingIndex(index);
    setDraftProduct({ ...product });
  };

  const updateDraft = (field, value) => {
    setDraftProduct((current) => ({ ...current, [field]: value }));
  };

  const saveDraft = () => {
    const nextProduct = cleanProduct(draftProduct, query);
    setResults((current) => current.map((item, index) => (index === editingIndex ? nextProduct : item)));
    setEditingIndex(null);
    setDraftProduct(null);
  };

  return (
    <div className="space-y-3 rounded-3xl border border-border bg-card p-3 shadow-sm">
      <div className="flex gap-2">
        <Input
          placeholder="Пошук продукту... наприклад макарони, кефір, Snickers"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && search()}
          className="rounded-2xl text-sm"
        />
        <Button type="button" onClick={search} disabled={loading || !query.trim()} className="shrink-0 rounded-2xl px-4">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      <AnimatePresence mode="popLayout">
        {loading && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-2 text-center text-xs text-muted-foreground">
            Шукаю в базі і звіряю КБЖУ...
          </motion.p>
        )}

        {!loading && searched && results.length === 0 && !showManual && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-center">
            <p className="text-xs text-muted-foreground">Не знайшла в базі. Можна додати вручну тут же.</p>
            <Button type="button" variant="outline" className="mt-2 h-9 rounded-xl text-xs" onClick={() => setShowManual(true)}>
              Додати вручну
            </Button>
          </motion.div>
        )}

        {showManual && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <ManualAddForm onAdd={addItem} />
          </motion.div>
        )}

        {results.map((product, index) => {
          const isEditing = editingIndex === index;
          const visibleProduct = isEditing ? draftProduct : product;

          return (
            <motion.div
              key={`${product.name}-${index}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ delay: index * 0.03 }}
              className="rounded-3xl border border-border bg-gradient-to-br from-background to-muted/35 p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold">{visibleProduct.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {visibleProduct.serving_label} · {visibleProduct.amount} {visibleProduct.unit === 'ml' ? 'мл' : 'г'} {visibleProduct.source ? `· ${visibleProduct.source}` : ''}
                  </p>
                  {visibleProduct.brand && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">Бренд: {visibleProduct.brand}</p>}
                  {visibleProduct.ingredients && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{visibleProduct.ingredients}</p>}
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] font-bold sm:grid-cols-4">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700"><Flame className="mr-0.5 inline h-3 w-3" />{visibleProduct.calories} ккал</span>
                    <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700"><Beef className="mr-0.5 inline h-3 w-3" />Б: {visibleProduct.proteins}г</span>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">🥑 Ж: {visibleProduct.fats}г</span>
                    <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700"><Wheat className="mr-0.5 inline h-3 w-3" />В: {visibleProduct.carbs}г</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => startEdit(product, index)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => addItem(visibleProduct)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {isEditing && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 space-y-2 rounded-2xl bg-card/90 p-3">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-extrabold text-muted-foreground">Назва продукту</span>
                    <Input value={draftProduct?.name ?? ''} onChange={(event) => updateDraft('name', event.target.value)} className="h-10 rounded-xl text-sm font-bold" />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <EditField label="Порція" icon="⚖️" value={draftProduct?.amount} onChange={(value) => updateDraft('amount', value)} />
                    <EditField label="Ккал" icon="🔥" value={draftProduct?.calories} onChange={(value) => updateDraft('calories', value)} />
                    <EditField label="Білки" icon="🥩" value={draftProduct?.proteins} onChange={(value) => updateDraft('proteins', value)} />
                    <EditField label="Жири" icon="🥑" value={draftProduct?.fats} onChange={(value) => updateDraft('fats', value)} />
                    <EditField label="Вуглеводи" icon="🍞" value={draftProduct?.carbs} onChange={(value) => updateDraft('carbs', value)} />
                  </div>
                  <Button type="button" className="h-10 w-full rounded-2xl text-xs gap-2" onClick={saveDraft}>
                    <Check className="h-3.5 w-3.5" />
                    Зберегти правки
                  </Button>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
