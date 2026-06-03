import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { calculateDailyNeeds } from '@/domain/nutrition/MacroCalculator';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { foodLogRepository, userProfileRepository } from '@/services/repositories';
import { useProfileAutosave } from '@/hooks/useProfileAutosave';

const defaultForm = {
  gender: 'male',
  age: '',
  weight: '',
  target_weight: '',
  height: '',
  activity_level: 'moderate',
  ai_personality: 'lofi_friend',
};

const toNumber = (value, fallback = 0) => {
  if (value === '' || value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function formFromProfile(profile) {
  return {
    gender: profile.gender || 'male',
    age: profile.age ? String(profile.age) : '',
    weight: profile.weight ? String(profile.weight) : '',
    target_weight: profile.target_weight ? String(profile.target_weight) : profile.weight ? String(profile.weight) : '',
    height: profile.height ? String(profile.height) : '',
    activity_level: profile.activity_level || 'moderate',
    ai_personality: profile.ai_personality || 'lofi_friend',
  };
}

export function useProfilePage() {
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const languageApi = useLanguage();
  const initializedRef = useRef(false);
  const [form, setForm] = useState(defaultForm);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => userProfileRepository.list(),
    initialData: [],
  });

  const { data: allFoodLogs } = useQuery({
    queryKey: ['profileFoodActivity'],
    queryFn: () => foodLogRepository.list('-date', 300),
    initialData: [],
  });

  const existing = profiles[0];

  useEffect(() => {
    if (existing && !initializedRef.current) {
      setForm(formFromProfile(existing));
      initializedRef.current = true;
    }
  }, [existing]);

  const weight = toNumber(form.weight, 70);
  const targetWeight = toNumber(form.target_weight, weight);
  const calculated = calculateDailyNeeds(
    form.gender,
    weight,
    toNumber(form.height, 170),
    toNumber(form.age, 25),
    form.activity_level,
    targetWeight
  );

  const saveState = useProfileAutosave({ form, calculated, existing, isLoading, queryClient });
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const logoutProfile = async () => {
    await logout();
    queryClient.clear();
    toast.success(languageApi.text('Ви вийшли з профілю', 'You are logged out'));
  };

  const profileMeta = [
    user?.nickname || user?.name,
    user?.email,
    saveState === 'saved' ? languageApi.text('збережено', 'saved') : '',
    saveState === 'error' ? languageApi.text('помилка автозбереження', 'autosave error') : '',
  ].filter(Boolean).join(' В· ');

  return {
    ...languageApi,
    user,
    form,
    update,
    calculated,
    saveState,
    profileMeta,
    allFoodLogs,
    weight,
    targetWeight,
    isLoading,
    logoutProfile,
  };
}
