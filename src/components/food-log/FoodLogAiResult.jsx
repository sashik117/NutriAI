import AiRefinement from '@/components/food/AiRefinement';
import FoodResultCard from '@/components/food/FoodResultCard';

export default function FoodLogAiResult({ aiResult, setAiResult, setAiTip, saveLog, saving, handleAiResult }) {
  if (!aiResult) return null;

  return (
    <div className="space-y-2">
      <FoodResultCard
        result={aiResult}
        onSave={saveLog}
        onCancel={() => {
          setAiResult(null);
          setAiTip('');
        }}
        saving={saving}
      />
      <AiRefinement currentResult={aiResult} onRefined={handleAiResult} />
    </div>
  );
}
