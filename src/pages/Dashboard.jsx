import { useState } from 'react';
import { nutriApi } from '@/api/nutriApi';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { ClipboardList, Flame, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import CaloriesRing from '../components/dashboard/CaloriesRing';
import MacroRing from '../components/dashboard/MacroRing';
import WaterPlant from '../components/dashboard/WaterPlant';
import MealCard from '../components/dashboard/MealCard';
import ScrollableCalendar from '../components/dashboard/ScrollableCalendar';
import SmartRemaining from '../components/dashboard/SmartRemaining';
import EditMealDialog from '../components/food/EditMealDialog';
import ThemeToggle from '../components/layout/ThemeToggle';
import HealthConnect from '../components/health/HealthConnect';

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activityCalories, setActivityCalories] = useState(0);
  const [editingLog, setEditingLog] = useState(null);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');
  const isToday = dateStr === today;
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => nutriApi.entities.UserProfile.list(),
    initialData: [],
  });

  const profile = profiles[0];

  const { data: foodLogs } = useQuery({
    queryKey: ['foodLogs', dateStr],
    queryFn: () => nutriApi.entities.FoodLog.filter({ date: dateStr }),
    initialData: [],
  });

  const { data: allFoodLogs } = useQuery({
    queryKey: ['allFoodLogsForDots'],
    queryFn: () => nutriApi.entities.FoodLog.list('-date', 300),
    initialData: [],
  });

  const { data: waterLogs } = useQuery({
    queryKey: ['waterLogs', dateStr],
    queryFn: () => nutriApi.entities.WaterLog.filter({ date: dateStr }),
    initialData: [],
  });

  const addWaterMutation = useMutation({
    mutationFn: (amount) => nutriApi.entities.WaterLog.create({ amount_ml: amount, date: today }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waterLogs', today] }),
  });

  const goals = {
    calories: (profile?.daily_calories || 2000) + (isToday ? activityCalories : 0),
    proteins: profile?.daily_proteins || 150,
    fats: profile?.daily_fats || 67,
    carbs: profile?.daily_carbs || 200,
    water: profile?.daily_water_ml || 2000,
  };

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
  const logDates = allFoodLogs.map((log) => String(log.date).slice(0, 10));
  const calendarStats = allFoodLogs.reduce((acc, log) => {
    const date = String(log.date).slice(0, 10);
    acc[date] = acc[date] || { calories: 0, proteins: 0, fats: 0, carbs: 0, ratio: 0 };
    acc[date].calories += log.total_calories || 0;
    acc[date].proteins += log.total_proteins || 0;
    acc[date].fats += log.total_fats || 0;
    acc[date].carbs += log.total_carbs || 0;
    const ratios = [
      acc[date].calories / (goals.calories || 1),
      acc[date].proteins / (goals.proteins || 1),
      acc[date].fats / (goals.fats || 1),
      acc[date].carbs / (goals.carbs || 1),
    ];
    acc[date].ratio = ratios.reduce((sum, value) => sum + Math.min(value, 1.3), 0) / ratios.length;
    return acc;
  }, {});
  return (
    <div className="space-y-4 pt-5">
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium capitalize text-muted-foreground">
            {format(selectedDate, 'EEEE, d MMMM', { locale: uk })}
          </p>
          <h1 className="mt-0.5 truncate text-2xl font-extrabold">
            {isToday ? 'Сьогодні 👋' : format(selectedDate, 'd MMMM', { locale: uk })}
          </h1>
        </div>
        <ThemeToggle />
      </motion.header>

      {isToday && <HealthConnect onActivityUpdate={setActivityCalories} weightKg={profile?.weight || 70} />}

      <div className="grid grid-cols-3 gap-2">
        <Link to="/gamification" className="min-w-0">
          <div className="flex h-full items-center gap-2 rounded-2xl border border-orange-200/50 bg-orange-50 p-3 dark:border-orange-700/30 dark:bg-orange-900/20">
            <Flame className="h-5 w-5 shrink-0 text-orange-500" />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-orange-700 dark:text-orange-400">Серія</p>
              <p className="truncate text-[10px] text-muted-foreground">Нагороди</p>
            </div>
          </div>
        </Link>
        <Link to="/meal-plan" className="min-w-0">
          <div className="flex h-full items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-3">
            <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-primary">План ШІ</p>
              <p className="truncate text-[10px] text-muted-foreground">На тиждень</p>
            </div>
          </div>
        </Link>
        <Link to="/weight" className="min-w-0">
          <div className="flex h-full items-center gap-2 rounded-2xl border border-chart-3/20 bg-chart-3/10 p-3">
            <span className="shrink-0 text-base">⚖️</span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">Вага</p>
              <p className="truncate text-[10px] text-muted-foreground">Графік</p>
            </div>
          </div>
        </Link>
      </div>

      <ScrollableCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} logDates={logDates} dayStats={calendarStats} />

      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center rounded-3xl border border-border bg-card p-6"
      >
        <CaloriesRing current={totals.calories} goal={goals.calories} />
        <div className="mt-5 flex w-full justify-around">
          <MacroRing label="Білки" current={Math.round(totals.proteins)} goal={goals.proteins} color="proteins" />
          <MacroRing label="Жири" current={Math.round(totals.fats)} goal={goals.fats} color="fats" />
          <MacroRing label="Вуглеводи" current={Math.round(totals.carbs)} goal={goals.carbs} color="carbs" />
        </div>
      </motion.section>

      <SmartRemaining totals={totals} goals={goals} />

      {isToday && (
        <Link to="/log" className="block">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-3 rounded-3xl bg-primary px-5 py-4 text-primary-foreground shadow-lg shadow-primary/20"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
              <Plus className="h-5 w-5" />
            </span>
            <div className="text-left">
              <p className="text-sm font-extrabold">Додати їжу</p>
              <p className="text-xs opacity-80">Сканер, пошук або текст для ШІ</p>
            </div>
          </motion.div>
        </Link>
      )}

      {isToday && (
        <WaterPlant
          current={totalWater}
          goal={goals.water}
          onAddWater={(ml) => addWaterMutation.mutate(ml)}
        />
      )}

      {foodLogs.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold">Прийоми їжі</h2>
          <div className="space-y-2">
            {foodLogs.map((log, index) => (
              <MealCard key={log.id} log={log} index={index} onEdit={setEditingLog} />
            ))}
          </div>
        </section>
      ) : (
        <div className="py-6 text-center text-sm text-muted-foreground">Записів немає</div>
      )}

      {!profile && (
        <div className="rounded-2xl bg-secondary/50 p-4 text-center">
          <p className="text-sm font-medium">Налаштуйте профіль для розрахунку норми КБЖУ</p>
        </div>
      )}

      {editingLog && (
        <EditMealDialog
          log={editingLog}
          open={!!editingLog}
          onClose={() => setEditingLog(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['foodLogs', dateStr] })}
        />
      )}
    </div>
  );
}
