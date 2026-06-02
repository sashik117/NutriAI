import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import VoiceButton from '@/components/food/VoiceButton';
import { ADD_MEAL_OPTIONS, ENGLISH_MEAL_LABELS } from './foodLogConfig';

function getVisibleMealLabel(meal, isEnglish) {
  return isEnglish ? ENGLISH_MEAL_LABELS[meal.key] || meal.label : meal.label;
}

export default function FoodLogAiInput({
  tr,
  isEnglish,
  mealType,
  setMealType,
  text,
  setText,
  analyzing,
  analyzeFoodText,
  handleVoiceTranscribed,
}) {
  const selectedMeal = ADD_MEAL_OPTIONS.find((meal) => meal.key === mealType) || ADD_MEAL_OPTIONS[0];

  return (
    <section className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-2">
        <p className="text-sm font-bold">{tr('Написати для ШІ', 'Write for AI')}</p>
        <p className="text-xs text-muted-foreground">
          {tr('Наприклад: молоко 200 мл і пластівці 50 г', 'Example: milk 200 ml and oats 50 g')}
        </p>
      </div>

      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-bold text-muted-foreground">
          {tr('Прийом їжі', 'Meal type')}
        </label>
        <Select value={mealType} onValueChange={setMealType}>
          <SelectTrigger className="h-12 rounded-2xl border-primary/20 bg-primary/5 px-4 text-sm font-bold shadow-sm">
            <SelectValue>
              <span className="inline-flex items-center gap-2">
                <span className="text-lg">{selectedMeal.emoji}</span>
                <span>{getVisibleMealLabel(selectedMeal, isEnglish)}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-64 rounded-2xl">
            {ADD_MEAL_OPTIONS.map((meal) => (
              <SelectItem key={meal.key} value={meal.key} className="rounded-xl py-3 text-sm font-semibold">
                <span className="mr-2">{meal.emoji}</span>
                {getVisibleMealLabel(meal, isEnglish)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end gap-3">
        <div className="relative flex-1">
          <Textarea
            placeholder={tr('Наприклад: гречка з куркою 250 г і салат', 'Example: buckwheat with chicken 250 g and salad')}
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="min-h-[82px] resize-none rounded-xl pr-12 text-sm"
          />
          <Button
            size="icon"
            aria-label={tr('Проаналізувати їжу', 'Analyze food')}
            className="absolute bottom-3 right-3 h-9 w-9 rounded-full"
            onClick={() => analyzeFoodText()}
            disabled={analyzing || !text.trim()}
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <VoiceButton onTranscribed={handleVoiceTranscribed} />
      </div>
    </section>
  );
}
