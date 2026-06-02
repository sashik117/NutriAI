import CopyYesterdayMeal from '@/components/food/CopyYesterdayMeal';
import EditMealDialog from '@/components/food/EditMealDialog';
import QuickPresets from '@/components/food/QuickPresets';
import RecipeGenerator from '@/components/food/RecipeGenerator';
import FoodLogActions from '@/components/food-log/FoodLogActions';
import FoodLogAiInput from '@/components/food-log/FoodLogAiInput';
import FoodLogAiResult from '@/components/food-log/FoodLogAiResult';
import FoodLogEmptyState from '@/components/food-log/FoodLogEmptyState';
import FoodLogFeedback from '@/components/food-log/FoodLogFeedback';
import FoodLogHeader from '@/components/food-log/FoodLogHeader';
import TodayMealsList from '@/components/food-log/TodayMealsList';
import { MEAL_ORDER } from '@/components/food-log/foodLogConfig';
import { useFoodLogPage } from '@/hooks/useFoodLogPage';
import { useLanguage } from '@/lib/LanguageContext';

export default function FoodLog() {
  const { isEnglish, text: tr } = useLanguage();
  const state = useFoodLogPage({ mealOrder: MEAL_ORDER });

  return (
    <div className="space-y-4 pt-6">
      <FoodLogHeader tr={tr} />

      <FoodLogAiInput
        tr={tr}
        isEnglish={isEnglish}
        mealType={state.mealType}
        setMealType={state.setMealType}
        text={state.text}
        setText={state.setText}
        analyzing={state.analyzing}
        analyzeFoodText={state.analyzeFoodText}
        handleVoiceTranscribed={state.handleVoiceTranscribed}
      />

      <FoodLogActions
        tr={tr}
        showSearch={state.showSearch}
        setShowSearch={state.setShowSearch}
        handleAiResult={state.handleAiResult}
        handleBarcodeResult={state.handleBarcodeResult}
        handleSearchAdd={state.handleSearchAdd}
      />

      <FoodLogFeedback
        tr={tr}
        analyzing={state.analyzing}
        saving={state.saving}
        aiTip={state.aiTip}
        hasAiResult={Boolean(state.aiResult)}
      />

      <FoodLogAiResult
        aiResult={state.aiResult}
        setAiResult={state.setAiResult}
        setAiTip={state.setAiTip}
        saveLog={state.saveLog}
        saving={state.saving}
        handleAiResult={state.handleAiResult}
      />

      <CopyYesterdayMeal />
      <QuickPresets presets={state.profile?.quick_presets} onSelect={state.handlePreset} addingName={state.addingPreset} />

      {!state.hasLogs && <FoodLogEmptyState tr={tr} />}

      {state.hasLogs && (
        <TodayMealsList
          tr={tr}
          groupedLogs={state.groupedLogs}
          otherSnacks={state.otherSnacks}
          setEditingLog={state.setEditingLog}
        />
      )}

      <RecipeGenerator remainingCalories={state.remainingCalories} />

      {state.editingLog && (
        <EditMealDialog
          log={state.editingLog}
          open={Boolean(state.editingLog)}
          onClose={() => state.setEditingLog(null)}
          onSaved={state.refreshFoodLogs}
        />
      )}
    </div>
  );
}
