import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { buildListFromMeals, getSavedLists, saveShoppingList, shoppingListToClipboardText } from '@/services/shoppingListService';

export function useShoppingList({ day, dayIndex = 0, sourceMeals = [], autoGenerateToken = 0, translate }) {
  const [list, setList] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);

  const mealSignature = useMemo(
    () => sourceMeals.map((meal) => meal.id || `${meal.slot}-${meal.title}`).sort().join('-') || 'empty',
    [sourceMeals]
  );
  const storageId = `shopping-${dayIndex}-${day?.day || 'plan'}-${mealSignature}`;
  const totalItems = useMemo(() => list?.categories?.reduce((sum, category) => sum + category.items.length, 0) || 0, [list]);
  const checkedCount = useMemo(
    () => list?.categories?.reduce((sum, category) => sum + category.items.filter((item) => item.checked).length, 0) || 0,
    [list]
  );

  useEffect(() => {
    const savedLists = getSavedLists();
    const savedList = savedLists[storageId]?.list;
    setList(savedList || null);
    setSaved(Boolean(savedList));
  }, [storageId]);

  const generate = useCallback(async () => {
    if (!sourceMeals.length) {
      toast.error(translate('Спочатку виберіть страви галочкою', 'Select meals with a checkmark first'));
      return;
    }
    setGenerating(true);
    try {
      setList(buildListFromMeals(sourceMeals));
      setSaved(false);
      toast.success(translate('Список покупок готовий', 'Shopping list is ready'));
    } finally {
      setGenerating(false);
    }
  }, [sourceMeals, translate]);

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
    toast.success(translate('Прибрано зі списку', 'Removed from list'));
  };

  const saveList = () => {
    if (!list) return;
    saveShoppingList({ storageId, day, sourceMeals, list });
    setSaved(true);
    toast.success(translate('Список збережено', 'List saved'));
  };

  const copyToClipboard = () => {
    if (!list) return;
    navigator.clipboard.writeText(shoppingListToClipboardText(list));
    toast.success(translate('Список скопійовано', 'List copied'));
  };

  return {
    list,
    generating,
    saved,
    totalItems,
    checkedCount,
    generate,
    updateItem,
    deleteItem,
    saveList,
    copyToClipboard,
  };
}
