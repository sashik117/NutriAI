import { useState, useEffect, useRef } from 'react';
import { nutriApi } from '@/api/nutriApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { calculateDailyNeeds } from '../lib/kbjuCalculator';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import ActivityHeatmap from '../components/dashboard/ActivityHeatmap';

const activityLabelsUk = {
  sedentary: 'Сидячий',
  light: 'Легка активність',
  moderate: 'Середня активність',
  active: 'Висока активність',
  very_active: 'Дуже висока активність',
};

const activityLabelsEn = {
  sedentary: 'Sedentary',
  light: 'Light activity',
  moderate: 'Moderate activity',
  active: 'High activity',
  very_active: 'Very high activity',
};

const goalLabelsUk = {
  lose: 'Схуднення',
  maintain: 'Підтримка ваги',
  gain: 'Набір маси',
};

const goalLabelsEn = {
  lose: 'Weight loss',
  maintain: 'Weight maintenance',
  gain: 'Muscle gain',
};

const goalHintsUk = {
  lose: 'Система закладає помірний дефіцит, щоб рухатись до цілі без жорстких зривів.',
  maintain: 'Калораж тримається біля підтримки, щоб вага була стабільною.',
  gain: 'Система додає м’який профіцит для набору без зайвого перебору.',
};

const goalHintsEn = {
  lose: 'The system sets a moderate deficit so the goal feels realistic and sustainable.',
  maintain: 'Calories stay close to maintenance so weight remains stable.',
  gain: 'The system adds a gentle surplus for steady gain without going too far over.',
};

const personalityLabelsUk = {
  caring_grandma: 'Турботлива бабуся',
  strict_coach: 'Суворий тренер',
  lofi_friend: 'LoFi-друг',
};

const personalityLabelsEn = {
  caring_grandma: 'Caring guide',
  strict_coach: 'Strict coach',
  lofi_friend: 'LoFi friend',
};

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

export default function Profile() {
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { language, isEnglish, setLanguage, text } = useLanguage();
  const initializedRef = useRef(false);
  const autosaveTimerRef = useRef(null);
  const [saveState, setSaveState] = useState('idle');

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => nutriApi.entities.UserProfile.list(),
    initialData: [],
  });

  const { data: allFoodLogs } = useQuery({
    queryKey: ['profileFoodActivity'],
    queryFn: () => nutriApi.entities.FoodLog.list('-date', 300),
    initialData: [],
  });

  const existing = profiles[0];
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (existing && !initializedRef.current) {
      setForm({
        gender: existing.gender || 'male',
        age: existing.age ? String(existing.age) : '',
        weight: existing.weight ? String(existing.weight) : '',
        target_weight: existing.target_weight ? String(existing.target_weight) : existing.weight ? String(existing.weight) : '',
        height: existing.height ? String(existing.height) : '',
        activity_level: existing.activity_level || 'moderate',
        ai_personality: existing.ai_personality || 'lofi_friend',
      });
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

  useEffect(() => {
    if (isLoading) return;
    if (!form.age || !form.weight || !form.target_weight || !form.height) return;

    clearTimeout(autosaveTimerRef.current);
    setSaveState('saving');
    autosaveTimerRef.current = setTimeout(async () => {
      const data = {
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

      try {
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

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const activityLabels = isEnglish ? activityLabelsEn : activityLabelsUk;
  const goalLabels = isEnglish ? goalLabelsEn : goalLabelsUk;
  const goalHints = isEnglish ? goalHintsEn : goalHintsUk;
  const personalityLabels = isEnglish ? personalityLabelsEn : personalityLabelsUk;
  const profileMeta = [
    user?.nickname || user?.name,
    user?.email,
    saveState === 'saving' ? text('автозбереження', 'autosaving') : '',
    saveState === 'saved' ? text('збережено', 'saved') : '',
    saveState === 'error' ? text('помилка автозбереження', 'autosave error') : '',
  ].filter(Boolean).join(' · ');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center pt-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8 pt-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold">{text('Профіль', 'Profile')}</h1>
        {profileMeta && <p className="mt-1 text-sm text-muted-foreground">{profileMeta}</p>}
      </motion.div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{text('Мова', 'Language')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={language === 'uk' ? 'default' : 'outline'}
                className="rounded-xl"
                onClick={() => setLanguage('uk')}
              >
                Українська
              </Button>
              <Button
                type="button"
                variant={language === 'en' ? 'default' : 'outline'}
                className="rounded-xl"
                onClick={() => setLanguage('en')}
              >
                English
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{text('Стать', 'Gender')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {['male', 'female'].map((gender) => (
                <Button
                  key={gender}
                  variant={form.gender === gender ? 'default' : 'outline'}
                  className="rounded-xl"
                  onClick={() => update('gender', gender)}
                >
                  {gender === 'male' ? text('Чоловік', 'Male') : text('Жінка', 'Female')}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ['age', text('Вік', 'Age'), '25'],
              ['height', text('Зріст, см', 'Height, cm'), '170'],
              ['weight', text('Поточна вага, кг', 'Current weight, kg'), '70.5'],
              ['target_weight', text('Цільова вага, кг', 'Target weight, kg'), '65'],
            ].map(([key, label, placeholder]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-semibold">{label}</Label>
                <Input
                  inputMode="decimal"
                  value={form[key]}
                  placeholder={placeholder}
                  onChange={(event) => update(key, event.target.value.replace(',', '.'))}
                  className="rounded-xl"
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{text('Рівень активності', 'Activity level')}</Label>
            <Select value={form.activity_level} onValueChange={(value) => update('activity_level', value)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(activityLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3">
            <Label className="text-xs font-semibold">{text('Ціль визначається автоматично', 'Goal is calculated automatically')}</Label>
            <p className="mt-1 text-lg font-extrabold text-primary">{goalLabels[calculated.goal]}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isEnglish
                ? `${weight} kg now -> ${targetWeight} kg target. ${goalHints[calculated.goal]}`
                : `${weight} кг зараз -> ${targetWeight} кг ціль. ${goalHints[calculated.goal]}`}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{text('Характер ШІ', 'AI personality')}</Label>
            <Select value={form.ai_personality} onValueChange={(value) => update('ai_personality', value)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(personalityLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="mb-3 text-xs font-bold text-primary">{text('Денна норма', 'Daily goal')}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card p-3 text-center">
            <p className="text-2xl font-extrabold text-primary">{calculated.calories}</p>
            <p className="text-[10px] text-muted-foreground">{text('ккал', 'kcal')}</p>
          </div>
          <div className="rounded-xl bg-card p-3 text-center">
            <p className="text-2xl font-extrabold">{calculated.water}</p>
            <p className="text-[10px] text-muted-foreground">{text('мл води', 'ml water')}</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card p-2.5 text-center"><p className="text-lg font-bold">{calculated.proteins} {text('г', 'g')}</p><p className="text-[10px] text-muted-foreground">{text('білки', 'protein')}</p></div>
          <div className="rounded-xl bg-card p-2.5 text-center"><p className="text-lg font-bold">{calculated.fats} {text('г', 'g')}</p><p className="text-[10px] text-muted-foreground">{text('жири', 'fats')}</p></div>
          <div className="rounded-xl bg-card p-2.5 text-center"><p className="text-lg font-bold">{calculated.carbs} {text('г', 'g')}</p><p className="text-[10px] text-muted-foreground">{text('вуглеводи', 'carbs')}</p></div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center text-[10px] text-muted-foreground">
          <div className="rounded-xl bg-card p-2">BMR: {calculated.bmr} {text('ккал', 'kcal')}</div>
          <div className="rounded-xl bg-card p-2">TDEE: {calculated.tdee} {text('ккал', 'kcal')}</div>
        </div>
      </motion.div>

      <ActivityHeatmap foodLogs={allFoodLogs} caloriesGoal={calculated.calories} />

      <Button
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={() => {
          logout();
          queryClient.clear();
          toast.success(text('Ви вийшли з профілю', 'You are logged out'));
        }}
      >
        <LogOut className="mr-2 h-4 w-4" /> {text('Вийти', 'Log out')}
      </Button>
    </div>
  );
}
