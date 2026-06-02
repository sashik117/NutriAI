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
import { useDashboardPage } from '@/hooks/useDashboardPage';
import { useLanguage } from '@/lib/LanguageContext';

export default function Dashboard() {
  const { isEnglish, text } = useLanguage();
  const {
    selectedDate,
    setSelectedDate,
    setActivityCalories,
    editingLog,
    setEditingLog,
    isToday,
    profile,
    foodLogs,
    goals,
    totals,
    totalWater,
    logDates,
    calendarStats,
    addWaterMutation,
    refreshSelectedFoodLogs,
  } = useDashboardPage();
  return (
    <div className="space-y-4 pt-5">
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium capitalize text-muted-foreground">
            {format(selectedDate, 'EEEE, d MMMM', isEnglish ? undefined : { locale: uk })}
          </p>
          <h1 className="mt-0.5 truncate text-2xl font-extrabold">
            {isToday ? text('Сьогодні 👋', 'Today 👋') : format(selectedDate, 'd MMMM', isEnglish ? undefined : { locale: uk })}
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
              <p className="truncate text-xs font-bold text-orange-700 dark:text-orange-400">{text('Серія', 'Streak')}</p>
              <p className="truncate text-[10px] text-muted-foreground">{text('Нагороди', 'Rewards')}</p>
            </div>
          </div>
        </Link>
        <Link to="/meal-plan" className="min-w-0">
          <div className="flex h-full items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-3">
            <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-primary">{text('План ШІ', 'AI Plan')}</p>
              <p className="truncate text-[10px] text-muted-foreground">{text('На тиждень', 'Weekly')}</p>
            </div>
          </div>
        </Link>
        <Link to="/weight" className="min-w-0">
          <div className="flex h-full items-center gap-2 rounded-2xl border border-chart-3/20 bg-chart-3/10 p-3">
            <span className="shrink-0 text-base">⚖️</span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{text('Вага', 'Weight')}</p>
              <p className="truncate text-[10px] text-muted-foreground">{text('Графік', 'Chart')}</p>
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
          <MacroRing label={text('Білки', 'Protein')} current={Math.round(totals.proteins)} goal={goals.proteins} color="proteins" />
          <MacroRing label={text('Жири', 'Fats')} current={Math.round(totals.fats)} goal={goals.fats} color="fats" />
          <MacroRing label={text('Вуглеводи', 'Carbs')} current={Math.round(totals.carbs)} goal={goals.carbs} color="carbs" />
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
              <p className="text-sm font-extrabold">{text('Додати їжу', 'Add food')}</p>
              <p className="text-xs opacity-80">{text('Сканер, пошук або текст для ШІ', 'Scanner, search, or AI text')}</p>
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
          <h2 className="mb-2 text-sm font-bold">{text('Прийоми їжі', 'Meals')}</h2>
          <div className="space-y-2">
            {foodLogs.map((log, index) => (
              <MealCard key={log.id} log={log} index={index} onEdit={setEditingLog} />
            ))}
          </div>
        </section>
      ) : (
        <div className="py-6 text-center text-sm text-muted-foreground">{text('Записів немає', 'No entries yet')}</div>
      )}

      {!profile && (
        <div className="rounded-2xl bg-secondary/50 p-4 text-center">
          <p className="text-sm font-medium">{text('Налаштуйте профіль для розрахунку норми КБЖУ', 'Set up your profile to calculate calorie and macro goals')}</p>
        </div>
      )}

      {editingLog && (
        <EditMealDialog
          log={editingLog}
          open={!!editingLog}
          onClose={() => setEditingLog(null)}
          onSaved={refreshSelectedFoodLogs}
        />
      )}
    </div>
  );
}
