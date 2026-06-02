import { useEffect, useRef, useState } from 'react';
import { nutriApi } from '@/api/nutriApi';

const toNumber = (value, fallback = 0) => {
  if (value === '' || value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function buildProfilePayload(form, calculated) {
  return {
    ...form,
    age: toNumber(form.age),
    weight: toNumber(form.weight),
    target_weight: toNumber(form.target_weight, toNumber(form.weight)),
    height: toNumber(form.height),
    goal: calculated.goal,
    daily_calories: calculated.calories,
    daily_proteins: calculated.proteins,
    daily_fats: calculated.fats,
    daily_carbs: calculated.carbs,
    daily_water_ml: calculated.water,
  };
}

export function useProfileAutosave({ form, calculated, existing, isLoading, queryClient }) {
  const autosaveTimerRef = useRef(null);
  const [saveState, setSaveState] = useState('idle');

  useEffect(() => {
    if (isLoading) return undefined;
    if (!form.age || !form.weight || !form.target_weight || !form.height) return undefined;

    clearTimeout(autosaveTimerRef.current);
    setSaveState('saving');
    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const data = buildProfilePayload(form, calculated);
        if (existing) {
          await nutriApi.entities.UserProfile.update(existing.id, data);
        } else {
          await nutriApi.entities.UserProfile.create(data);
        }
        queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        setSaveState('saved');
      } catch (error) {
        console.error(error);
        setSaveState('error');
      }
    }, 700);

    return () => clearTimeout(autosaveTimerRef.current);
  }, [form, calculated.goal, calculated.calories, calculated.proteins, calculated.fats, calculated.carbs, calculated.water, existing, isLoading, queryClient]);

  return saveState;
}
