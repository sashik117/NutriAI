import { useState } from 'react';

const emptyManualFoodItem = {
  name: '',
  unit: 'g',
  amount: 100,
  weight_g: 100,
  calories: 0,
  proteins: 0,
  fats: 0,
  carbs: 0,
};

export function useManualFoodForm(onAdd) {
  const [form, setForm] = useState(emptyManualFoodItem);
  const canSubmit = Boolean(form.name.trim());

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = () => {
    if (!canSubmit) return;

    const amount = Number(form.amount) || Number(form.weight_g) || 100;
    const unit = form.unit === 'ml' ? 'ml' : 'g';
    onAdd({
      ...form,
      unit,
      amount,
      weight_g: unit === 'g' ? amount : Number(form.weight_g) || amount,
      calories: Number(form.calories),
      proteins: Number(form.proteins),
      fats: Number(form.fats),
      carbs: Number(form.carbs),
    });
    setForm(emptyManualFoodItem);
  };

  return {
    form,
    canSubmit,
    setField,
    submit,
  };
}
