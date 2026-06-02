import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import { generateRecipeSuggestion } from '@/services/recipeSuggestionService';

export default function RecipeGenerator({ remainingCalories = 0 }) {
  const { isEnglish, text } = useLanguage();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      setRecipe(await generateRecipeSuggestion({ remainingCalories, isEnglish }));
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
