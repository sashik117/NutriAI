import { useState } from 'react';
import { nutriApi } from '@/api/nutriApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Coffee, Cookie, Loader2, Moon, Pencil, Search, Send, Sparkles, Sun } from 'lucide-react';
import { toast } from 'sonner';

import FoodResultCard from '../components/food/FoodResultCard';
import QuickPresets from '../components/food/QuickPresets';
import VoiceButton from '../components/food/VoiceButton';
import ProductSearch from '../components/food/ProductSearch';
import EditMealDialog from '../components/food/EditMealDialog';
import AiRefinement from '../components/food/AiRefinement';
import CopyYesterdayMeal from '../components/food/CopyYesterdayMeal';
import BarcodeScanner from '../components/food/BarcodeScanner';
import LiveCameraAnalyzer from '../components/food/LiveCameraAnalyzer';
import RecipeGenerator from '../components/food/RecipeGenerator';
import MealCard from '../components/dashboard/MealCard';
import { repairNutritionItem } from '@/lib/nutritionFallback';

const MEAL_ORDER = [
  { key: 'breakfast', label: 'Сніданок', emoji: '🥞', Icon: Coffee, tone: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'snack1', label: 'Перекус 1', emoji: '🍓', Icon: Cookie, tone: 'bg-rose-100 text-rose-700 border-rose-200' },
  { key: 'lunch', label: 'Обід', emoji: '🍲', Icon: Sun, tone: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { key: 'snack2', label: 'Перекус 2', emoji: '🫐', Icon: Sparkles, tone: 'bg-sky-100 text-sky-700 border-sky-200' },
  { key: 'dinner', label: 'Вечеря', emoji: '🥗', Icon: Moon, tone: 'bg-violet-100 text-violet-700 border-violet-200' },
  { key: 'snack3', label: 'Перекус 3', emoji: '🍪', Icon: Cookie, tone: 'bg-orange-100 text-orange-700 border-orange-200' },
];

const ADD_MEAL_OPTIONS = [
  { key: 'breakfast', label: 'Сніданок', emoji: '🥞' },
  { key: 'lunch', label: 'Обід', emoji: '🍲' },
  { key: 'dinner', label: 'Вечеря', emoji: '🥗' },
  { key: 'snack', label: 'Перекус', emoji: '🍪' },
];

const getSuggestedMealType = () => {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 11) return 'breakfast';
  if (hour >= 13 && hour < 16) return 'lunch';
  if (hour >= 18 && hour < 22) return 'dinner';
  return 'snack';
};

const normalizeItem = (item) => {
  const unit = item?.unit === 'ml' ? 'ml' : 'g';
  const amount = Math.max(Math.round(Number(item?.amount ?? item?.volume_ml ?? item?.weight_g) || 100), 1);
  const normalized = {
    name: String(item?.name || item?.dish_name || item?.meal_name || item?.title || item?.dish || item?.food_name || item?.description || 'Їжа').replace(/\*/g, '').trim(),
    unit,
    amount,
    weight_g: Math.max(Math.round(Number(item?.weight_g ?? item?.grams ?? (unit === 'g' ? amount : amount)) || 100), 1),
    calories: Math.max(Math.round(Number(item?.calories) || 0), 0),
    proteins: Math.round((Number(item?.proteins) || 0) * 10) / 10,
    fats: Math.round((Number(item?.fats) || 0) * 10) / 10,
    carbs: Math.round((Number(item?.carbs) || 0) * 10) / 10,
  };
  return repairNutritionItem(normalized, normalized.name);
};

const normalizeResult = (result) => {
  const items = (result?.items || []).map(normalizeItem).filter((item) => item.name);
  const sum = (key) => Math.round(items.reduce((total, item) => total + (Number(item[key]) || 0), 0) * 10) / 10;
  return {
    description: String(result?.description || items.map((item) => `${item.name} ${item.amount} ${item.unit === 'ml' ? 'мл' : 'г'}`).join(', ')).replace(/\*/g, '').trim(),
    items,
    total_calories: Math.round(Number(result?.total_calories) || sum('calories')),
    total_proteins: Math.round((Number(result?.total_proteins) || sum('proteins')) * 10) / 10,
    total_fats: Math.round((Number(result?.total_fats) || sum('fats')) * 10) / 10,
    total_carbs: Math.round((Number(result?.total_carbs) || sum('carbs')) * 10) / 10,
    ai_tip: String(result?.ai_tip || '').replace(/\*/g, '').trim(),
  };
};

export default function FoodLog() {
  const [mealType, setMealType] = useState(() => getSuggestedMealType());
  const [text, setText] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiTip, setAiTip] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [addingPreset, setAddingPreset] = useState(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => nutriApi.entities.UserProfile.list(),
    initialData: [],
  });

  const { data: todayLogs } = useQuery({
    queryKey: ['foodLogs', today],
    queryFn: () => nutriApi.entities.FoodLog.filter({ date: today }),
    initialData: [],
  });

  const profile = profiles[0];
  const goals = {
    calories: profile?.daily_calories || 2000,
    proteins: profile?.daily_proteins || 150,
    fats: profile?.daily_fats || 67,
    carbs: profile?.daily_carbs || 200,
  };
  const totals = todayLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.total_calories || 0),
      proteins: acc.proteins + (log.total_proteins || 0),
      fats: acc.fats + (log.total_fats || 0),
      carbs: acc.carbs + (log.total_carbs || 0),
    }),
    { calories: 0, proteins: 0, fats: 0, carbs: 0 }
  );
  const remainingCalories = Math.max(goals.calories - totals.calories, 0);

  const handleAiResult = (result) => {
    const normalized = normalizeResult(result);
    setAiResult(normalized);
    setAiTip(normalized.ai_tip || '');
  };

  const handleBarcodeResult = (result) => {
    const item = normalizeItem({
      name: `${result.brand ? `${result.brand} ` : ''}${result.name}`.trim(),
      unit: result.unit,
      amount: result.amount || result.weight_g || 100,
      weight_g: result.weight_g || 100,
      calories: result.calories,
      proteins: result.proteins,
      fats: result.fats,
      carbs: result.carbs,
    });
    handleAiResult({ description: item.name, items: [item], ai_tip: '' });
  };

  const analyzeFoodText = async (inputText = text) => {
    const value = inputText.trim();
    if (!value) return;

    setAnalyzing(true);
    setAiResult(null);
    setAiTip('');
    try {
      const result = await nutriApi.integrations.Core.InvokeLLM({
        prompt: `Ти професійний дієтолог NutriAI. Користувач описав їжу текстом або голосом.
Опис: "${value}"
Розбери це як один прийом їжі з окремими компонентами.
Для рідин використовуй unit "ml" і amount у мілілітрах, наприклад молоко 200 мл.
Для твердої їжі використовуй unit "g" і amount у грамах, наприклад пластівці 50 г.
Кожен компонент має окремі КБЖУ, а весь прийом має загальні total_*.
Не став 0, якщо продукт описано. Не використовуй markdown, зірочки або маркери.
Поверни тільки структурований JSON.`,
        response_json_schema: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            total_calories: { type: 'number' },
            total_proteins: { type: 'number' },
            total_fats: { type: 'number' },
            total_carbs: { type: 'number' },
            ai_tip: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  unit: { type: 'string' },
                  amount: { type: 'number' },
                  weight_g: { type: 'number' },
                  calories: { type: 'number' },
                  proteins: { type: 'number' },
                  fats: { type: 'number' },
                  carbs: { type: 'number' },
                },
              },
            },
          },
        },
        model: 'gemini_3_flash',
      });
      handleAiResult(result);
    } catch (error) {
      toast.error(error?.message || 'Не вдалося проаналізувати опис');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleVoiceTranscribed = (transcribedText) => {
    setText(transcribedText);
  };

  const createFoodLog = async ({ description, items, total_calories, total_proteins, total_fats, total_carbs }) => {
    await nutriApi.entities.FoodLog.create({
      meal_type: mealType,
      description,
      items: items.map(normalizeItem),
      total_calories: Math.round(total_calories || 0),
      total_proteins: Math.round((total_proteins || 0) * 10) / 10,
      total_fats: Math.round((total_fats || 0) * 10) / 10,
      total_carbs: Math.round((total_carbs || 0) * 10) / 10,
      date: today,
    });
    queryClient.invalidateQueries({ queryKey: ['foodLogs'] });
  };

  const handleSearchAdd = async (item) => {
    setSaving(true);
    try {
      const normalized = normalizeItem(item);
      await createFoodLog({
        description: normalized.name,
        items: [normalized],
        total_calories: normalized.calories,
        total_proteins: normalized.proteins,
        total_fats: normalized.fats,
        total_carbs: normalized.carbs,
      });
      toast.success(`${normalized.name} додано`);
      setShowSearch(false);
    } finally {
      setSaving(false);
    }
  };

  const saveLog = async (resultToSave = aiResult) => {
    if (!resultToSave) return;
    const normalized = normalizeResult(resultToSave);
    setSaving(true);
    try {
      await createFoodLog(normalized);
      toast.success('Прийом їжі збережено');
      setText('');
      setAiResult(null);
      setAiTip('');
    } finally {
      setSaving(false);
    }
  };

  const handlePreset = async (preset) => {
    setAddingPreset(preset.name);
    try {
      const item = normalizeItem({ ...preset, amount: preset.weight_g || 100, unit: 'g' });
      await createFoodLog({ description: item.name, items: [item], total_calories: item.calories, total_proteins: item.proteins, total_fats: item.fats, total_carbs: item.carbs });
      toast.success(`${item.name} додано`);
    } finally {
      setAddingPreset(null);
    }
  };

  const groupedLogs = MEAL_ORDER.map((meal) => ({ ...meal, logs: todayLogs.filter((log) => log.meal_type === meal.key) })).filter((group) => group.logs.length > 0);
  const knownMealKeys = MEAL_ORDER.map((meal) => meal.key);
  const otherSnacks = todayLogs.filter((log) => !knownMealKeys.includes(log.meal_type));
  const hasLogs = groupedLogs.length > 0 || otherSnacks.length > 0;

  return (
    <div className="space-y-4 pt-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold">Додати їжу</h1>
        <p className="mt-1 text-sm text-muted-foreground">Опишіть, сфоткайте або знайдіть продукт</p>
      </motion.div>

      <section className="rounded-2xl border border-border bg-card p-3">
        <div className="mb-2">
          <p className="text-sm font-bold">Написати для ШІ</p>
          <p className="text-xs text-muted-foreground">Наприклад: молоко 200 мл і пластівці 50 г</p>
        </div>
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {ADD_MEAL_OPTIONS.map((meal) => {
            const active = mealType === meal.key;
            return (
              <motion.button
                key={meal.key}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setMealType(meal.key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  active ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-background text-muted-foreground'
                }`}
              >
                <span className="mr-1">{meal.emoji}</span>
                {meal.label}
              </motion.button>
            );
          })}
        </div>
        <div className="flex items-end gap-3">
          <div className="relative flex-1">
            <Textarea
              placeholder="Наприклад: гречка з куркою 250 г і салат"
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="min-h-[82px] resize-none rounded-xl pr-12 text-sm"
            />
            <Button size="icon" className="absolute bottom-3 right-3 h-9 w-9 rounded-full" onClick={() => analyzeFoodText()} disabled={analyzing || !text.trim()}>
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <VoiceButton onTranscribed={handleVoiceTranscribed} />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <LiveCameraAnalyzer onResult={handleAiResult} />
        <Button type="button" variant={showSearch ? 'default' : 'outline'} className="h-12 rounded-xl text-xs gap-2" onClick={() => setShowSearch((value) => !value)}>
          <Search className="h-4 w-4" />
          Пошук
        </Button>
        <BarcodeScanner onResult={handleBarcodeResult} />
      </section>

      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <ProductSearch onAdd={handleSearchAdd} />
          </motion.div>
        )}
      </AnimatePresence>

      {analyzing && <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-sm font-medium"><Loader2 className="h-4 w-4 animate-spin text-primary" />ШІ рахує КБЖУ...</div>}
      {saving && <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-sm font-medium"><Loader2 className="h-4 w-4 animate-spin text-primary" />Зберігаю...</div>}

      {aiResult && (
        <div className="space-y-2">
          <FoodResultCard result={aiResult} onSave={saveLog} onCancel={() => { setAiResult(null); setAiTip(''); }} saving={saving} />
          <AiRefinement currentResult={aiResult} onRefined={handleAiResult} />
        </div>
      )}

      {aiTip && !aiResult && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-accent/50 p-3">
          <p className="mb-1 text-xs font-semibold text-accent-foreground">Порада ШІ</p>
          <p className="text-xs text-accent-foreground/80">{aiTip}</p>
        </motion.div>
      )}

      <CopyYesterdayMeal />
      <QuickPresets presets={profile?.quick_presets} onSelect={handlePreset} addingName={addingPreset} />

      {!hasLogs && (
        <div className="rounded-3xl border border-dashed border-border bg-card p-5 text-center">
          <Camera className="mx-auto mb-2 h-8 w-8 text-primary" />
          <p className="text-sm font-bold">Ще нічого не з'їли?</p>
          <p className="mt-1 text-xs text-muted-foreground">Сфоткайте свою тарілку або знайдіть продукт через пошук.</p>
        </div>
      )}

      {hasLogs && (
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-bold">Сьогоднішній раціон</h2>
          {groupedLogs.map((group) => (
            <div key={group.key}>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{group.label}</p>
              <div className="space-y-1.5">
                {group.logs.map((log, index) => (
                  <div key={log.id} className="relative">
                    <MealCard log={log} index={index} />
                    <button onClick={() => setEditingLog(log)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-muted/80 hover:bg-muted">
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {otherSnacks.map((log, index) => (
            <div key={log.id} className="relative">
              <MealCard log={log} index={index} />
              <button onClick={() => setEditingLog(log)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-muted/80 hover:bg-muted">
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      <RecipeGenerator remainingCalories={remainingCalories} />

      {editingLog && (
        <EditMealDialog log={editingLog} open={!!editingLog} onClose={() => setEditingLog(null)} onSaved={() => queryClient.invalidateQueries({ queryKey: ['foodLogs'] })} />
      )}
    </div>
  );
}
