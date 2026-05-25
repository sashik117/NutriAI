import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { nutriApi } from '@/api/nutriApi';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';

function cleanAiText(value, fallback = '') {
  return String(value || fallback)
    .replace(/```json|```/gi, '')
    .replace(/[#*_`>~]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeRecipe(result, isEnglish) {
  if (typeof result === 'string') {
    return { raw: cleanAiText(result) };
  }

  const title = cleanAiText(result?.title || result?.name, isEnglish ? 'Balanced meal idea' : 'Ідея страви');
  const ingredients = Array.isArray(result?.ingredients)
    ? result.ingredients.map((item) => cleanAiText(item)).filter(Boolean)
    : [];

  return {
    title,
    serving: cleanAiText(result?.serving || result?.portion || result?.grams, isEnglish ? '1 serving' : '1 порція'),
    ingredients,
    calories: Math.round(Number(result?.calories) || 0),
    proteins: Math.round((Number(result?.proteins) || 0) * 10) / 10,
    fats: Math.round((Number(result?.fats) || 0) * 10) / 10,
    carbs: Math.round((Number(result?.carbs) || 0) * 10) / 10,
    note: cleanAiText(result?.note || result?.description),
  };
}

export default function RecipeGenerator({ remainingCalories = 0 }) {
  const { isEnglish, text } = useLanguage();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const target = Math.max(200, Math.round(remainingCalories || 0));
      const result = await nutriApi.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        prompt: isEnglish
          ? `Suggest one simple meal in English for about ${target} kcal.
Return only clean JSON. No markdown, no headings, no #, no *, no bullet characters.
Keep it realistic and balanced, not extremely fatty.
Fields: title, serving, ingredients array, calories, proteins, fats, carbs, note.`
          : `Запропонуй одну просту страву українською приблизно на ${target} ккал.
Поверни тільки чистий JSON. Без markdown, без заголовків, без #, без *, без маркерів списку.
Страва має бути реалістична і збалансована, не жирна на максимум.
Поля: title, serving, ingredients масив, calories, proteins, fats, carbs, note.`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            serving: { type: 'string' },
            ingredients: { type: 'array', items: { type: 'string' } },
            calories: { type: 'number' },
            proteins: { type: 'number' },
            fats: { type: 'number' },
            carbs: { type: 'number' },
            note: { type: 'string' },
          },
        },
      });
      setRecipe(normalizeRecipe(result, isEnglish));
    } catch (error) {
      toast.error(error.message || text('Не вдалося згенерувати ідею', 'Could not generate an idea'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold">{text('Ідея від ШІ', 'AI idea')}</p>
          <p className="text-xs text-muted-foreground">
            {text('Підібрати страву під залишок калорій', 'Pick a meal for your remaining calories')}
          </p>
        </div>
        <Button size="sm" className="shrink-0 rounded-xl" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </Button>
      </div>
      {recipe && (
        <div className="mt-3 rounded-2xl bg-background/70 p-3 text-xs leading-relaxed">
          {recipe.raw ? (
            <p className="whitespace-pre-line text-muted-foreground">{recipe.raw}</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-extrabold text-foreground">{recipe.title}</p>
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">{text('Порція', 'Serving')}:</span> {recipe.serving}
              </p>
              {recipe.ingredients.length > 0 && (
                <div>
                  <p className="mb-1 font-semibold text-foreground">{text('Інгредієнти', 'Ingredients')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {recipe.ingredients.map((item) => (
                      <span key={item} className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <span className="rounded-xl bg-emerald-50 px-1.5 py-1 text-emerald-700">{recipe.calories || '≈'} {text('ккал', 'kcal')}</span>
                <span className="rounded-xl bg-sky-50 px-1.5 py-1 text-sky-700">{text('Б', 'P')}: {recipe.proteins || '≈'} {text('г', 'g')}</span>
                <span className="rounded-xl bg-amber-50 px-1.5 py-1 text-amber-700">{text('Ж', 'F')}: {recipe.fats || '≈'} {text('г', 'g')}</span>
                <span className="rounded-xl bg-rose-50 px-1.5 py-1 text-rose-700">{text('В', 'C')}: {recipe.carbs || '≈'} {text('г', 'g')}</span>
              </div>
              {recipe.note && <p className="text-muted-foreground">{recipe.note}</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
