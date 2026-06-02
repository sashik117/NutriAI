import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  EMPTY_MEAL_ITEM,
  buildMealUpdatePayload,
  normalizeEditableMealItem,
  summarizeEditableMealItems,
  updateEditableMealItem,
} from '@/domain/food/editMealModel';
import { foodLogRepository } from '@/services/repositories';

export function useEditMealDialog({ log, onClose, onSaved }) {
  const [mealType, setMealType] = useState(log?.meal_type || 'lunch');
  const [items, setItems] = useState((log?.items || []).map(normalizeEditableMealItem));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!log) return;
    setMealType(log.meal_type || 'lunch');
    setItems((log.items || []).map(normalizeEditableMealItem));
  }, [log]);

  const updateItem = (index, key, value) => {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? updateEditableMealItem(item, key, value) : item
    )));
  };

  const removeItem = (index) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const addItem = () => setItems((current) => [...current, EMPTY_MEAL_ITEM]);
  const totals = summarizeEditableMealItems(items);

  const finish = () => {
    onSaved?.();
    onClose?.();
  };

  const handleSave = async () => {
    if (!log?.id) return;
    setSaving(true);
    try {
      await foodLogRepository.update(log.id, buildMealUpdatePayload({ mealType, items }));
      toast.success('Збережено');
      finish();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!log?.id) return;
    await foodLogRepository.delete(log.id);
    toast.success('Видалено');
    finish();
  };

  return {
    mealType,
    setMealType,
    items,
    updateItem,
    removeItem,
    addItem,
    totals,
    saving,
    handleSave,
    handleDelete,
  };
}
