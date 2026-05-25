import { useEffect, useMemo, useState } from 'react';
import { nutriApi } from '@/api/nutriApi';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { motion } from 'framer-motion';
import { CheckCircle2, Flame, Loader2, Snowflake, Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';

const BADGES = [
  { type: 'first_log', emoji: '🍽️', title: 'Перший крок', description: 'Перший запис їжі' },
  { type: 'streak_3', emoji: '🔥', title: '3 дні', description: 'Три дні поспіль' },
  { type: 'streak_7', emoji: '⚡', title: '7 днів', description: 'Тижнева серія' },
  { type: 'streak_30', emoji: '💎', title: '30 днів', description: 'Місячна серія' },
  { type: 'water_5', emoji: '💧', title: 'Вода', description: 'Норма води 5 днів' },
  { type: 'protein_7', emoji: '💪', title: 'Білок', description: 'Норма білка 7 днів' },
  { type: 'logs_50', emoji: '📊', title: '50 записів', description: 'Багато даних' },
  { type: 'weight_logged', emoji: '⚖️', title: 'Вага', description: 'Перший запис ваги' },
];

function getStreak(foodLogs) {
  const dates = new Set(foodLogs.map((log) => log.date));
  let streak = 0;
  for (let index = 0; index < 365; index += 1) {
    const expected = format(subDays(new Date(), index), 'yyyy-MM-dd');
    if (!dates.has(expected)) break;
    streak += 1;
  }
  return streak;
}

function getBestStreak(foodLogs) {
  const sorted = [...new Set(foodLogs.map((log) => log.date))].sort();
  let best = 0;
  let current = 0;
  let previous = null;

  sorted.forEach((date) => {
    if (!previous) {
      current = 1;
    } else {
      const expected = format(subDays(new Date(`${date}T00:00:00`), 1), 'yyyy-MM-dd');
      current = previous === expected ? current + 1 : 1;
    }
    best = Math.max(best, current);
    previous = date;
  });

  return best;
}

function cleanAiText(value, fallback = '') {
  return String(value || fallback)
    .replace(/```json|```/gi, '')
    .replace(/[#*_`>~]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeChallenge(result, isEnglish) {
  return {
    title: cleanAiText(result?.title, isEnglish ? 'Personal challenge' : 'Персональний виклик'),
    description: cleanAiText(result?.description, isEnglish ? 'A small weekly goal for your nutrition progress.' : 'Невелика тижнева ціль для прогресу.'),
    emoji: cleanAiText(result?.emoji, '✨'),
    tasks: Array.isArray(result?.tasks)
      ? result.tasks.map((task) => cleanAiText(task)).filter(Boolean)
      : [],
  };
}

export default function Gamification() {
  const { isEnglish, text } = useLanguage();
  const [generatingChallenge, setGeneratingChallenge] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [freezeCount, setFreezeCount] = useState(() => Number(localStorage.getItem('kbju_streak_freeze') || '1'));

  const { data: profiles } = useQuery({ queryKey: ['userProfile'], queryFn: () => nutriApi.entities.UserProfile.list(), initialData: [] });
  const { data: foodLogs } = useQuery({ queryKey: ['allFoodLogsGamif'], queryFn: () => nutriApi.entities.FoodLog.list('-date', 300), initialData: [] });
  const { data: waterLogs } = useQuery({ queryKey: ['allWaterLogsGamif'], queryFn: () => nutriApi.entities.WaterLog.list('-date', 120), initialData: [] });
  const { data: weightLogs } = useQuery({ queryKey: ['weightLogs'], queryFn: () => nutriApi.entities.WeightLog.list('-date', 80), initialData: [] });
  const { data: achievements, refetch: refetchAchievements } = useQuery({ queryKey: ['achievements'], queryFn: () => nutriApi.entities.Achievement.list(), initialData: [] });

  const profile = profiles[0];
  const today = format(new Date(), 'yyyy-MM-dd');
  const streak = useMemo(() => getStreak(foodLogs), [foodLogs]);
  const bestStreak = useMemo(() => getBestStreak(foodLogs), [foodLogs]);

  useEffect(() => {
    if (!foodLogs.length) return;

    const unlocked = achievements.map((item) => item.type);
    const toUnlock = [];
    const addBadge = (type) => {
      const badge = BADGES.find((item) => item.type === type);
      if (badge && !unlocked.includes(type)) toUnlock.push(badge);
    };

    addBadge('first_log');
    if (streak >= 3) addBadge('streak_3');
    if (streak >= 7) addBadge('streak_7');
    if (streak >= 30) addBadge('streak_30');
    if (foodLogs.length >= 50) addBadge('logs_50');
    if (weightLogs.length >= 1) addBadge('weight_logged');

    const waterGoal = profile?.daily_water_ml || 2000;
    const waterDays = Array.from({ length: 7 }, (_, index) => {
      const date = format(subDays(new Date(), index), 'yyyy-MM-dd');
      return waterLogs.filter((log) => log.date === date).reduce((sum, log) => sum + (log.amount_ml || 0), 0) >= waterGoal;
    }).filter(Boolean).length;
    if (waterDays >= 5) addBadge('water_5');

    const proteinGoal = profile?.daily_proteins || 150;
    const proteinDays = Array.from({ length: 7 }, (_, index) => {
      const date = format(subDays(new Date(), index), 'yyyy-MM-dd');
      return foodLogs.filter((log) => log.date === date).reduce((sum, log) => sum + (log.total_proteins || 0), 0) >= proteinGoal;
    }).filter(Boolean).length;
    if (proteinDays >= 7) addBadge('protein_7');

    if (toUnlock.length > 0) {
      Promise.all(
        toUnlock.map((badge) =>
          nutriApi.entities.Achievement.create({
            type: badge.type,
            title: badge.title,
            description: badge.description,
            emoji: badge.emoji,
            unlocked_date: today,
          })
        )
      ).then(() => {
        refetchAchievements();
        toUnlock.forEach((badge) => toast.success(`Нова нагорода: ${badge.emoji} ${badge.title}`));
      });
    }
  }, [achievements, foodLogs, profile?.daily_proteins, profile?.daily_water_ml, refetchAchievements, streak, today, waterLogs, weightLogs.length]);

  const generateChallenge = async () => {
    setGeneratingChallenge(true);
    try {
      const result = await nutriApi.integrations.Core.InvokeLLM({
        prompt: isEnglish
          ? `Generate a personal weekly nutrition challenge in English.
Goal: ${profile?.goal || 'maintain'}, calories: ${profile?.daily_calories || 2000}, protein: ${profile?.daily_proteins || 150} g, streak: ${streak} days.
Return only clean JSON with title, description, emoji and 5 short daily tasks.
No markdown, no #, no *, no bullet characters.`
          : `Згенеруй персональний тижневий челендж українською.
Ціль: ${profile?.goal || 'maintain'}, калорії: ${profile?.daily_calories || 2000}, білки: ${profile?.daily_proteins || 150} г, серія: ${streak} днів.
Поверни тільки чистий JSON з title, description, emoji і 5 коротких щоденних завдань.
Без markdown, без #, без *, без маркерів списку.`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            emoji: { type: 'string' },
            tasks: { type: 'array', items: { type: 'string' } },
          },
        },
        model: 'gemini_3_flash',
      });
      setChallenge(normalizeChallenge(result, isEnglish));
    } catch (error) {
      toast.error(error.message || text('Не вдалося створити челендж', 'Could not create challenge'));
    } finally {
      setGeneratingChallenge(false);
    }
  };

  const useFreeze = () => {
    if (freezeCount <= 0) return;
    const next = freezeCount - 1;
    setFreezeCount(next);
    localStorage.setItem('kbju_streak_freeze', String(next));
    toast.success(text('Заморозку серії активовано', 'Streak freeze activated'));
  };

  const unlockedTypes = achievements.map((item) => item.type);
  const badgeText = (badge) => {
    if (!isEnglish) return badge;
    const map = {
      first_log: ['First step', 'First food entry'],
      streak_3: ['3 days', 'Three days in a row'],
      streak_7: ['7 days', 'Weekly streak'],
      streak_30: ['30 days', 'Monthly streak'],
      water_5: ['Water', 'Water goal for 5 days'],
      protein_7: ['Protein', 'Protein goal for 7 days'],
      logs_50: ['50 entries', 'Lots of data'],
      weight_logged: ['Weight', 'First weight entry'],
    };
    const [title, description] = map[badge.type] || [badge.title, badge.description];
    return { ...badge, title, description };
  };

  return (
    <div className="space-y-5 pb-8 pt-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold">{text('Нагороди 🏆', 'Rewards 🏆')}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{text('Серія, бейджі та персональні виклики', 'Streaks, badges, and personal challenges')}</p>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl border border-orange-200/60 bg-orange-50 p-4 dark:border-orange-700/30 dark:bg-orange-900/20"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-orange-950/40">
            <Flame className="h-9 w-9 text-orange-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-4xl font-extrabold leading-none text-orange-600">{streak}</p>
            <p className="mt-1 text-sm font-bold">{text('днів поточної серії', 'days in current streak')}</p>
            <p className="text-xs text-muted-foreground">{text('Додай їжу сьогодні, щоб серія не зникла.', 'Add food today to keep the streak alive.')}</p>
          </div>
          <button
            onClick={useFreeze}
            disabled={freezeCount <= 0}
            className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-2xl border border-blue-200 bg-blue-50 p-2 disabled:opacity-40 dark:border-blue-700/40 dark:bg-blue-900/20"
          >
            <Snowflake className="h-5 w-5 text-blue-400" />
            <span className="text-sm font-extrabold text-blue-600">{freezeCount}</span>
            <span className="text-[9px] text-muted-foreground">freeze</span>
          </button>
        </div>
      </motion.section>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="text-xl font-extrabold text-primary">{foodLogs.length}</p>
          <p className="text-[10px] text-muted-foreground">{text('записів', 'entries')}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="text-xl font-extrabold text-chart-3">{achievements.length}</p>
          <p className="text-[10px] text-muted-foreground">{text('бейджів', 'badges')}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="text-xl font-extrabold text-chart-2">{bestStreak}</p>
          <p className="text-[10px] text-muted-foreground">{text('макс. серія', 'best streak')}</p>
        </div>
      </div>

      <section>
        <p className="mb-3 text-sm font-bold">{text('Бейджі', 'Badges')}</p>
        <div className="grid grid-cols-2 gap-2">
          {BADGES.map((rawBadge, index) => {
            const badge = badgeText(rawBadge);
            const isUnlocked = unlockedTypes.includes(badge.type);
            return (
              <motion.div
                key={badge.type}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`flex min-h-[84px] items-center gap-2 rounded-2xl border p-3 ${
                  isUnlocked ? 'border-primary/30 bg-primary/10' : 'border-border bg-muted/25 opacity-65'
                }`}
              >
                <span className="text-2xl">{isUnlocked ? badge.emoji : '🔒'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold leading-tight">{badge.title}</p>
                  <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{badge.description}</p>
                </div>
                {isUnlocked && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
              </motion.div>
            );
          })}
        </div>
      </section>

      <section>
        <p className="mb-3 text-sm font-bold">{text('Персональний виклик', 'Personal challenge')}</p>
        {!challenge ? (
          <Button className="h-12 w-full rounded-xl" onClick={generateChallenge} disabled={generatingChallenge} variant="outline">
            {generatingChallenge ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {text('Згенерувати виклик ШІ', 'Generate AI challenge')}
          </Button>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 rounded-2xl bg-accent/40 p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{challenge.emoji}</span>
              <div className="min-w-0">
                <p className="font-bold">{challenge.title}</p>
                <p className="text-xs text-muted-foreground">{challenge.description}</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {challenge.tasks?.map((task, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => setChallenge(null)}>
              {text('Новий виклик', 'New challenge')}
            </Button>
          </motion.div>
        )}
      </section>
    </div>
  );
}
