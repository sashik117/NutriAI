import { useEffect, useMemo, useState } from 'react';
import {
  EMPTY_FOOD_RESULT_ITEM,
  buildFoodResultSavePayload,
  normalizeFoodResultItem,
  summarizeFoodResultItems,
  updateFoodResultItem,
} from '@/domain/food/foodResultModel';

export function useFoodResultEditor({ result, onSave }) {
  const [items, setItems] = useState(() => (result?.items || []).map(normalizeFoodResultItem));

  useEffect(() => {
    setItems((result?.items || []).map(normalizeFoodResultItem));
  }, [result]);

  const totals = useMemo(() => summarizeFoodResultItems(items), [items]);

  const updateItem = (index, key, value) => {
    setItems((current) =>
      current.map((item, itemIndex) => (
        itemIndex === index ? updateFoodResultItem(item, key, value) : item
      ))
    );
  };

  const addItem = () => {
    setItems((current) => [...current, EMPTY_FOOD_RESULT_ITEM]);
  };

  const removeItem = (index) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const saveEdited = () => {
    onSave(buildFoodResultSavePayload(result, items));
  };

  return {
    items,
    totals,
    updateItem,
    addItem,
    removeItem,
    saveEdited,
  };
}
