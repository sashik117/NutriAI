import HistoryAiSummary from '@/components/history/HistoryAiSummary';
import HistoryDaySelector from '@/components/history/HistoryDaySelector';
import HistoryHeader from '@/components/history/HistoryHeader';
import HistoryMealList from '@/components/history/HistoryMealList';
import HistorySummaryCard from '@/components/history/HistorySummaryCard';
import { useHistoryPage } from '@/hooks/useHistoryPage';
import { useLanguage } from '@/lib/LanguageContext';

export default function History() {
  const { isEnglish, text } = useLanguage();
  const {
    selectedDay,
    selectDay,
    aiSummary,
    loadingSummary,
    date,
    foodLogs,
    isLoading,
    totals,
    totalWater,
    days,
    generateSummary,
  } = useHistoryPage({ isEnglish });

  return (
    <div className="space-y-5 pt-6">
      <HistoryHeader text={text} />
      <HistoryDaySelector days={days} selectedDay={selectedDay} selectDay={selectDay} />
      <HistorySummaryCard date={date} totalWater={totalWater} totals={totals} text={text} />
      <HistoryAiSummary
        aiSummary={aiSummary}
        foodLogs={foodLogs}
        generateSummary={generateSummary}
        loadingSummary={loadingSummary}
        text={text}
      />
      <HistoryMealList foodLogs={foodLogs} isLoading={isLoading} text={text} />
    </div>
  );
}
