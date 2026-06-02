import BodyMeasurements from '../components/weight/BodyMeasurement';
import WeightChartCard from '@/components/weight-page/WeightChartCard';
import WeightEntryCard from '@/components/weight-page/WeightEntryCard';
import WeightForecastCard from '@/components/weight-page/WeightForecastCard';
import WeightHeader from '@/components/weight-page/WeightHeader';
import WeightLogHistory from '@/components/weight-page/WeightLogHistory';
import WeightStatsGrid from '@/components/weight-page/WeightStatsGrid';
import { useWeightTrackerPage } from '@/hooks/useWeightTrackerPage';
import { useLanguage } from '@/lib/LanguageContext';

export default function WeightTracker() {
  const { isEnglish, text } = useLanguage();
  const {
    newWeight,
    setNewWeight,
    forecast,
    setForecast,
    loadingForecast,
    weightLogs,
    profile,
    todayLog,
    chartData,
    stats,
    addMutation,
    generateForecast,
  } = useWeightTrackerPage();

  return (
    <div className="space-y-5 pb-8 pt-6">
      <WeightHeader text={text} />
      <WeightStatsGrid
        latestWeight={stats.latestWeight}
        diff={stats.diff}
        entriesCount={stats.entriesCount}
        text={text}
      />
      <WeightEntryCard
        addMutation={addMutation}
        newWeight={newWeight}
        profile={profile}
        setNewWeight={setNewWeight}
        text={text}
        todayLog={todayLog}
      />
      <WeightChartCard chartData={chartData} targetWeight={stats.targetWeight} text={text} />
      <WeightForecastCard
        chartData={chartData}
        forecast={forecast}
        generateForecast={generateForecast}
        loadingForecast={loadingForecast}
        setForecast={setForecast}
        text={text}
      />
      <BodyMeasurements />
      <WeightLogHistory isEnglish={isEnglish} text={text} weightLogs={weightLogs} />
    </div>
  );
}
