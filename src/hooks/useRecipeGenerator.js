import { useState } from 'react';
import { toast } from 'sonner';
import { generateRecipeSuggestion } from '@/services/recipeSuggestionService';

export function useRecipeGenerator({ remainingCalories = 0, isEnglish, text }) {
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

  return {
    recipe,
    loading,
    generate,
  };
}
