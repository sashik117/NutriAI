import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { nutriApi } from '@/api/nutriApi';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';

export default function RecipeGenerator({ remainingCalories = 0 }) {
  const { isEnglish, text } = useLanguage();
  const [recipe, setRecipe] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const target = Math.max(200, Math.round(remainingCalories || 0));
      const result = await nutriApi.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        prompt: isEnglish
          ? `Suggest one simple meal in English for about ${target} kcal.
Keep it short: title, serving in grams, ingredients, and approximate calories/protein/fats/carbs. No long explanation.`
          : `Запропонуй одну просту страву українською приблизно на ${target} ккал.
Дай коротко: назву, порцію в грамах, інгредієнти і приблизне КБЖУ. Без довгого пояснення.`,
      });
      setRecipe(typeof result === 'string' ? result : result?.text || '');
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
      {recipe && <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{recipe}</p>}
    </section>
  );
}
