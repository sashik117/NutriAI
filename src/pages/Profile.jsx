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
import ActivityHeatmap from '../components/dashboard/ActivityHeatmap';

const activityLabels = {
  sedentary: 'Сидячий',
  light: 'Легка активність',
  moderate: 'Середня активність',
  active: 'Висока активність',
  very_active: 'Дуже висока активність',
};

const goalLabels = {
  lose: 'Схуднення',
  maintain: 'Підтримка ваги',
  gain: 'Набір маси',
};

const goalHints = {
  lose: 'Система закладає помірний дефіцит, щоб рухатись до цілі без жорстких зривів.',
  maintain: 'Калораж тримається біля підтримки, щоб вага була стабільною.',
  gain: 'Система додає м’який профіцит для набору без зайвого перебору.',
};

const personalityLabels = {
  caring_grandma: 'Турботлива бабуся',
  strict_coach: 'Суворий тренер',
  lofi_friend: 'LoFi-друг',
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
        <h1 className="text-2xl font-extrabold">Профіль</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.nickname || user?.name} · {user?.email}
          {saveState === 'saving' ? ' · автозбереження' : ''}
          {saveState === 'saved' ? ' · збережено' : ''}
          {saveState === 'error' ? ' · помилка автозбереження' : ''}
        </p>
      </motion.div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Стать</Label>
            <div className="grid grid-cols-2 gap-2">
              {['male', 'female'].map((gender) => (
                <Button
                  key={gender}
                  variant={form.gender === gender ? 'default' : 'outline'}
                  className="rounded-xl"
                  onClick={() => update('gender', gender)}
                >
                  {gender === 'male' ? 'Чоловік' : 'Жінка'}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ['age', 'Вік', '25'],
              ['height', 'Зріст, см', '170'],
              ['weight', 'Поточна вага, кг', '70.5'],
              ['target_weight', 'Цільова вага, кг', '65'],
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
            <Label className="text-xs font-semibold">Рівень активності</Label>
            <Select value={form.activity_level} onValueChange={(value) => update('activity_level', value)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(activityLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3">
            <Label className="text-xs font-semibold">Ціль визначається автоматично</Label>
            <p className="mt-1 text-lg font-extrabold text-primary">{goalLabels[calculated.goal]}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {weight} кг зараз {'->'} {targetWeight} кг ціль. {goalHints[calculated.goal]}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Характер ШІ</Label>
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
        <p className="mb-3 text-xs font-bold text-primary">Денна норма</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card p-3 text-center">
            <p className="text-2xl font-extrabold text-primary">{calculated.calories}</p>
            <p className="text-[10px] text-muted-foreground">ккал</p>
          </div>
          <div className="rounded-xl bg-card p-3 text-center">
            <p className="text-2xl font-extrabold">{calculated.water}</p>
            <p className="text-[10px] text-muted-foreground">мл води</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card p-2.5 text-center"><p className="text-lg font-bold">{calculated.proteins} г</p><p className="text-[10px] text-muted-foreground">білки</p></div>
          <div className="rounded-xl bg-card p-2.5 text-center"><p className="text-lg font-bold">{calculated.fats} г</p><p className="text-[10px] text-muted-foreground">жири</p></div>
          <div className="rounded-xl bg-card p-2.5 text-center"><p className="text-lg font-bold">{calculated.carbs} г</p><p className="text-[10px] text-muted-foreground">вуглеводи</p></div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center text-[10px] text-muted-foreground">
          <div className="rounded-xl bg-card p-2">BMR: {calculated.bmr} ккал</div>
          <div className="rounded-xl bg-card p-2">TDEE: {calculated.tdee} ккал</div>
        </div>
      </motion.div>

      <ActivityHeatmap foodLogs={allFoodLogs} caloriesGoal={calculated.calories} />

      <Button
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={() => {
          logout();
          queryClient.clear();
          toast.success('Ви вийшли з профілю');
        }}
      >
        <LogOut className="mr-2 h-4 w-4" /> Вийти
      </Button>
    </div>
  );
}
