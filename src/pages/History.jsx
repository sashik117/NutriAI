import { useState } from 'react';
import { nutriApi } from '@/api/nutriApi';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { uk } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Calendar, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MealCard from '../components/dashboard/MealCard';

export default function History() {
  const [selectedDay, setSelectedDay] = useState(0); // 0 = today, 1 = yesterday, etc
  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  const date = format(subDays(new Date(), selectedDay), 'yyyy-MM-dd');

  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => nutriApi.entities.UserProfile.list(),
    initialData: [],
  });

  const { data: foodLogs, isLoading } = useQuery({
    queryKey: ['foodLogs', date],
    queryFn: () => nutriApi.entities.FoodLog.filter({ date }),
    initialData: [],
  });

  const { data: waterLogs } = useQuery({
    queryKey: ['waterLogs', date],
    queryFn: () => nutriApi.entities.WaterLog.filter({ date }),
    initialData: [],
  });

  const profile = profiles[0];

  const totals = foodLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.total_calories || 0),
      proteins: acc.proteins + (log.total_proteins || 0),
      fats: acc.fats + (log.total_fats || 0),
      carbs: acc.carbs + (log.total_carbs || 0),
    }),
    { calories: 0, proteins: 0, fats: 0, carbs: 0 }
  );

  const totalWater = waterLogs.reduce((acc, log) => acc + (log.amount_ml || 0), 0);

  const days = Array.from({ length: 7 }, (_, i) => ({
    offset: i,
    label: i === 0 ? 'Сьогодні' : i === 1 ? 'Вчора' : format(subDays(new Date(), i), 'EEE', { locale: uk }),
    date: format(subDays(new Date(), i), 'd'),
  }));

  const generateSummary = async () => {
    setLoadingSummary(true);
    const goals = {
      calories: profile?.daily_calories || 2000,
      proteins: profile?.daily_proteins || 150,
      fats: profile?.daily_fats || 67,
      carbs: profile?.daily_carbs || 200,
    };

    const personalityMap = {
      caring_grandma: 'Відповідай як турботлива українська бабуся, ласкаво і з теплом.',
      strict_coach: 'Відповідай як суворий фітнес-тренер, прямолінійно і мотивуючи.',
      lofi_friend: 'Відповідай як спокійний дружній приятель.',
    };

    const personality = personalityMap[profile?.ai_personality] || personalityMap.lofi_friend;

    const result = await nutriApi.integrations.Core.InvokeLLM({
      prompt: `${personality}

Проаналізуй денний раціон користувача та дай пораду (2-3 речення українською). Будь конкретним.

Цілі: ${goals.calories} ккал, Б: ${goals.proteins}г, Ж: ${goals.fats}г, В: ${goals.carbs}г
Факт: ${Math.round(totals.calories)} ккал, Б: ${Math.round(totals.proteins)}г, Ж: ${Math.round(totals.fats)}г, В: ${Math.round(totals.carbs)}г
Вода: ${totalWater}мл

Страви: ${foodLogs.map(l => l.description || l.items?.map(i => i.name).join(', ')).join('; ')}`,
      model: 'gemini_3_flash',
    });

    setAiSummary(result);
    setLoadingSummary(false);
  };

  return (
    <div className="pt-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold">Історія 📊</h1>
      </motion.div>

      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {days.map((day) => (
          <button
            key={day.offset}
            onClick={() => { setSelectedDay(day.offset); setAiSummary(''); }}
            className={`flex flex-col items-center px-3 py-2 rounded-xl min-w-[60px] transition-all ${
              selectedDay === day.offset
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border'
            }`}
          >
            <span className="text-[10px] font-medium">{day.label}</span>
            <span className="text-lg font-bold">{day.date}</span>
          </button>
        ))}
      </div>

      {/* Day summary */}
      <motion.div
        key={date}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-2xl p-4 border border-border"
      >
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-lg font-extrabold text-primary">{Math.round(totals.calories)}</p>
            <p className="text-[10px] text-muted-foreground font-medium">ккал</p>
          </div>
          <div>
            <p className="text-lg font-bold">{Math.round(totals.proteins)}г</p>
            <p className="text-[10px] text-muted-foreground">білки</p>
          </div>
          <div>
            <p className="text-lg font-bold">{Math.round(totals.fats)}г</p>
            <p className="text-[10px] text-muted-foreground">жири</p>
          </div>
          <div>
            <p className="text-lg font-bold">{Math.round(totals.carbs)}г</p>
            <p className="text-[10px] text-muted-foreground">вуглеводи</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border text-center">
          <p className="text-sm">💧 {totalWater} мл води</p>
        </div>
      </motion.div>

      {/* AI Summary button */}
      {foodLogs.length > 0 && (
        <div>
          {!aiSummary ? (
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={generateSummary}
              disabled={loadingSummary}
            >
              {loadingSummary ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Отримати аналіз від ШІ
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-accent/50 rounded-xl p-4"
            >
              <p className="text-xs font-semibold text-accent-foreground mb-2">🤖 Аналіз ШІ</p>
              <p className="text-sm text-accent-foreground/90">{aiSummary}</p>
            </motion.div>
          )}
        </div>
      )}

      {/* Meal list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : foodLogs.length > 0 ? (
        <div className="space-y-2">
          {foodLogs.map((log, i) => (
            <MealCard key={log.id} log={log} index={i} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Немає записів за цей день</p>
        </div>
      )}
    </div>
  );
}