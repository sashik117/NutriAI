import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useLanguage } from '@/lib/LanguageContext';
import { analyzeFoodDescription } from '@/services/aiNutritionService';
import { buildFoodLogPayload, normalizeFoodItem, normalizeFoodResult } from '@/services/foodLogService';
import { userProfileRepository, foodLogRepository } from '@/services/repositories';


const MEAL_ORDER = [
  { key: 'breakfast', label: 'РЎРЅС–РґР°РЅРѕРє', emoji: 'рџҐћ', Icon: Coffee, tone: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'snack1', label: 'РџРµСЂРµРєСѓСЃ 1', emoji: 'рџЌ“', Icon: Cookie, tone: 'bg-rose-100 text-rose-700 border-rose-200' },
  { key: 'lunch', label: 'РћР±С–Рґ', emoji: 'рџЌІ', Icon: Sun, tone: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { key: 'snack2', label: 'РџРµСЂРµРєСѓСЃ 2', emoji: 'рџ«ђ', Icon: Sparkles, tone: 'bg-sky-100 text-sky-700 border-sky-200' },
  { key: 'dinner', label: 'Р’РµС‡РµСЂСЏ', emoji: 'рџҐ—', Icon: Moon, tone: 'bg-violet-100 text-violet-700 border-violet-200' },
  { key: 'snack3', label: 'РџРµСЂРµРєСѓСЃ 3', emoji: 'рџЌЄ', Icon: Cookie, tone: 'bg-orange-100 text-orange-700 border-orange-200' },
];

const ADD_MEAL_OPTIONS = [
  { key: 'breakfast', label: 'РЎРЅС–РґР°РЅРѕРє', emoji: 'рџҐћ' },
  { key: 'lunch', label: 'РћР±С–Рґ', emoji: 'рџЌІ' },
  { key: 'dinner', label: 'Р’РµС‡РµСЂСЏ', emoji: 'рџҐ—' },
  { key: 'snack', label: 'РџРµСЂРµРєСѓСЃ', emoji: 'рџЌЄ' },
];

const getSuggestedMealType = () => {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 11) return 'breakfast';
  if (hour >= 13 && hour < 16) return 'lunch';
  if (hour >= 18 && hour < 22) return 'dinner';
  return 'snack';
};


export default function FoodLog() {
  const { isEnglish, text: tr } = useLanguage();
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
    queryFn: () => userProfileRepository.list(),
    initialData: [],
  });

  const { data: todayLogs } = useQuery({
    queryKey: ['foodLogs', today],
    queryFn: () => foodLogRepository.filter({ date: today }),
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
    const normalized = normalizeFoodResult(result);
    setAiResult(normalized);
    setAiTip(normalized.ai_tip || '');
  };

  const handleBarcodeResult = (result) => {
    const item = normalizeFoodItem({
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
      const result = await analyzeFoodDescription(value);
      handleAiResult(result);
    } catch (error) {
      toast.error(error?.message || 'РќРµ РІРґР°Р»РѕСЃСЏ РїСЂРѕР°РЅР°Р»С–Р·СѓРІР°С‚Рё РѕРїРёСЃ');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleVoiceTranscribed = (transcribedText) => {
    setText(transcribedText);
  };

  const createFoodLog = async (result) => {
    await foodLogRepository.create(buildFoodLogPayload({ result, mealType, date: today }));
    queryClient.invalidateQueries({ queryKey: ['foodLogs'] });
  };

  const handleSearchAdd = async (item) => {
    setSaving(true);
    try {
      const normalized = normalizeFoodItem(item);
      await createFoodLog({
        description: normalized.name,
        items: [normalized],
        total_calories: normalized.calories,
        total_proteins: normalized.proteins,
        total_fats: normalized.fats,
        total_carbs: normalized.carbs,
      });
      toast.success(`${normalized.name} РґРѕРґР°РЅРѕ`);
      setShowSearch(false);
    } finally {
      setSaving(false);
    }
  };

  const saveLog = async (resultToSave = aiResult) => {
    if (!resultToSave) return;
    const normalized = normalizeFoodResult(resultToSave);
    setSaving(true);
    try {
      await createFoodLog(normalized);
      toast.success('РџСЂРёР№РѕРј С—Р¶С– Р·Р±РµСЂРµР¶РµРЅРѕ');
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
      const item = normalizeFoodItem({ ...preset, amount: preset.weight_g || 100, unit: 'g' });
      await createFoodLog({ description: item.name, items: [item], total_calories: item.calories, total_proteins: item.proteins, total_fats: item.fats, total_carbs: item.carbs });
      toast.success(`${item.name} РґРѕРґР°РЅРѕ`);
    } finally {
      setAddingPreset(null);
    }
  };

  const groupedLogs = MEAL_ORDER.map((meal) => ({ ...meal, logs: todayLogs.filter((log) => log.meal_type === meal.key) })).filter((group) => group.logs.length > 0);
  const knownMealKeys = MEAL_ORDER.map((meal) => meal.key);
  const otherSnacks = todayLogs.filter((log) => !knownMealKeys.includes(log.meal_type));
  const hasLogs = groupedLogs.length > 0 || otherSnacks.length > 0;
  const selectedMeal = ADD_MEAL_OPTIONS.find((meal) => meal.key === mealType) || ADD_MEAL_OPTIONS[0];
  const englishMealLabels = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
  };
  const visibleMealLabel = (meal) => (isEnglish ? englishMealLabels[meal.key] || meal.label : meal.label);

  return (
    <div className="space-y-4 pt-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold">{tr('Р”РѕРґР°С‚Рё С—Р¶Сѓ', 'Add food')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tr('РћРїРёС€С–С‚СЊ, СЃС„РѕС‚РєР°Р№С‚Рµ Р°Р±Рѕ Р·РЅР°Р№РґС–С‚СЊ РїСЂРѕРґСѓРєС‚', 'Describe, scan, or search for food')}</p>
      </motion.div>

      <section className="rounded-2xl border border-border bg-card p-3">
        <div className="mb-2">
          <p className="text-sm font-bold">{tr('РќР°РїРёСЃР°С‚Рё РґР»СЏ РЁР†', 'Write for AI')}</p>
          <p className="text-xs text-muted-foreground">{tr('РќР°РїСЂРёРєР»Р°Рґ: РјРѕР»РѕРєРѕ 200 РјР» С– РїР»Р°СЃС‚С–РІС†С– 50 Рі', 'Example: milk 200 ml and oats 50 g')}</p>
        </div>
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-bold text-muted-foreground">{tr('РџСЂРёР№РѕРј С—Р¶С–', 'Meal type')}</label>
          <Select value={mealType} onValueChange={setMealType}>
            <SelectTrigger className="h-12 rounded-2xl border-primary/20 bg-primary/5 px-4 text-sm font-bold shadow-sm">
              <SelectValue>
                <span className="inline-flex items-center gap-2">
                  <span className="text-lg">{selectedMeal.emoji}</span>
                  <span>{visibleMealLabel(selectedMeal)}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-64 rounded-2xl">
              {ADD_MEAL_OPTIONS.map((meal) => (
                <SelectItem key={meal.key} value={meal.key} className="rounded-xl py-3 text-sm font-semibold">
                  <span className="mr-2">{meal.emoji}</span>
                  {visibleMealLabel(meal)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-3">
          <div className="relative flex-1">
            <Textarea
              placeholder={tr('РќР°РїСЂРёРєР»Р°Рґ: РіСЂРµС‡РєР° Р· РєСѓСЂРєРѕСЋ 250 Рі С– СЃР°Р»Р°С‚', 'Example: buckwheat with chicken 250 g and salad')}
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
          {tr('РџРѕС€СѓРє', 'Search')}
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

      {analyzing && <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-sm font-medium"><Loader2 className="h-4 w-4 animate-spin text-primary" />{tr('РЁР† СЂР°С…СѓС” РљР‘Р–РЈ...', 'AI is calculating macros...')}</div>}
      {saving && <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-sm font-medium"><Loader2 className="h-4 w-4 animate-spin text-primary" />{tr('Р—Р±РµСЂС–РіР°СЋ...', 'Saving...')}</div>}

      {aiResult && (
        <div className="space-y-2">
          <FoodResultCard result={aiResult} onSave={saveLog} onCancel={() => { setAiResult(null); setAiTip(''); }} saving={saving} />
          <AiRefinement currentResult={aiResult} onRefined={handleAiResult} />
        </div>
      )}

      {aiTip && !aiResult && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-accent/50 p-3">
          <p className="mb-1 text-xs font-semibold text-accent-foreground">{tr('РџРѕСЂР°РґР° РЁР†', 'AI tip')}</p>
          <p className="text-xs text-accent-foreground/80">{aiTip}</p>
        </motion.div>
      )}

      <CopyYesterdayMeal />
      <QuickPresets presets={profile?.quick_presets} onSelect={handlePreset} addingName={addingPreset} />

      {!hasLogs && (
        <div className="rounded-3xl border border-dashed border-border bg-card p-5 text-center">
          <Camera className="mx-auto mb-2 h-8 w-8 text-primary" />
          <p className="text-sm font-bold">{tr("Р©Рµ РЅС–С‡РѕРіРѕ РЅРµ Р·'С—Р»Рё?", 'No food yet?')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tr('РЎС„РѕС‚РєР°Р№С‚Рµ СЃРІРѕСЋ С‚Р°СЂС–Р»РєСѓ Р°Р±Рѕ Р·РЅР°Р№РґС–С‚СЊ РїСЂРѕРґСѓРєС‚ С‡РµСЂРµР· РїРѕС€СѓРє.', 'Scan your plate or find a product with search.')}</p>
        </div>
      )}

      {hasLogs && (
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-bold">{tr('РЎСЊРѕРіРѕРґРЅС–С€РЅС–Р№ СЂР°С†С–РѕРЅ', 'Today meals')}</h2>
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
