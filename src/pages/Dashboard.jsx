import ScrollableCalendar from '../components/dashboard/ScrollableCalendar';
import SmartRemaining from '../components/dashboard/SmartRemaining';
import HealthConnect from '../components/health/HealthConnect';
import DashboardAddFoodCta from '@/components/dashboard-page/DashboardAddFoodCta';
import DashboardEditMealDialog from '@/components/dashboard-page/DashboardEditMealDialog';
import DashboardHeader from '@/components/dashboard-page/DashboardHeader';
import DashboardMealsSection from '@/components/dashboard-page/DashboardMealsSection';
import DashboardNutritionPanel from '@/components/dashboard-page/DashboardNutritionPanel';
import DashboardProfilePrompt from '@/components/dashboard-page/DashboardProfilePrompt';
import DashboardQuickLinks from '@/components/dashboard-page/DashboardQuickLinks';
import DashboardWaterSection from '@/components/dashboard-page/DashboardWaterSection';
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
      <DashboardHeader isEnglish={isEnglish} isToday={isToday} selectedDate={selectedDate} text={text} />
      {isToday && <HealthConnect onActivityUpdate={setActivityCalories} weightKg={profile?.weight || 70} />}
      <DashboardQuickLinks text={text} />
      <ScrollableCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} logDates={logDates} dayStats={calendarStats} />
      <DashboardNutritionPanel goals={goals} text={text} totals={totals} />
      <SmartRemaining totals={totals} goals={goals} />
      <DashboardAddFoodCta isToday={isToday} text={text} />
      <DashboardWaterSection addWaterMutation={addWaterMutation} goals={goals} isToday={isToday} totalWater={totalWater} />
      <DashboardMealsSection foodLogs={foodLogs} setEditingLog={setEditingLog} text={text} />
      <DashboardProfilePrompt profile={profile} text={text} />
      <DashboardEditMealDialog
        editingLog={editingLog}
        refreshSelectedFoodLogs={refreshSelectedFoodLogs}
        setEditingLog={setEditingLog}
      />
    </div>
  );
}
