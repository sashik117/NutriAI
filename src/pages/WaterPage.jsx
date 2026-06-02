import WaterReminder from '../components/water/WaterReminder';
import WaterCustomAmount from '@/components/water-page/WaterCustomAmount';
import WaterHeader from '@/components/water-page/WaterHeader';
import WaterLogList from '@/components/water-page/WaterLogList';
import WaterProgressCard from '@/components/water-page/WaterProgressCard';
import WaterQuickAdd from '@/components/water-page/WaterQuickAdd';
import { useWaterTrackerPage } from '@/hooks/useWaterTrackerPage';
import { useLanguage } from '@/lib/LanguageContext';

export default function WaterPage() {
  const { text } = useLanguage();
  const {
    customAmount,
    setCustomAmount,
    editingId,
    setEditingId,
    editingAmount,
    setEditingAmount,
    waterLogs,
    goal,
    totalWater,
    progress,
    addWaterMutation,
    deleteWaterMutation,
    mood,
    startEditing,
    saveEditing,
  } = useWaterTrackerPage({ text });

  return (
    <div className="space-y-6 pt-6">
      <WaterHeader text={text} />
      <WaterProgressCard mood={mood} progress={progress} totalWater={totalWater} goal={goal} text={text} />
      <WaterQuickAdd addWaterMutation={addWaterMutation} text={text} />
      <WaterCustomAmount
        customAmount={customAmount}
        setCustomAmount={setCustomAmount}
        addWaterMutation={addWaterMutation}
        text={text}
      />

      <WaterReminder currentMl={totalWater} goalMl={goal} />
      <WaterLogList
        editingId={editingId}
        setEditingId={setEditingId}
        editingAmount={editingAmount}
        setEditingAmount={setEditingAmount}
        waterLogs={waterLogs}
        deleteWaterMutation={deleteWaterMutation}
        startEditing={startEditing}
        saveEditing={saveEditing}
        text={text}
      />
    </div>
  );
}
