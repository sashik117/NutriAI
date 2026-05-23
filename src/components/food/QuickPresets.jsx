import { Button } from '@/components/ui/button';
import { Zap, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';

const defaultPresets = [
  { name: '☕ Кава з молоком', calories: 70, proteins: 3, fats: 3, carbs: 5 },
  { name: '🥚 2 яйця', calories: 155, proteins: 13, fats: 11, carbs: 1 },
  { name: '🍌 Банан', calories: 105, proteins: 1.3, fats: 0.4, carbs: 27 },
  { name: '🥗 Салат овочевий', calories: 80, proteins: 2, fats: 5, carbs: 8 },
  { name: '🍗 Куряча грудка 150г', calories: 165, proteins: 31, fats: 3.6, carbs: 0 },
  { name: '🍚 Рис 100г', calories: 130, proteins: 2.7, fats: 0.3, carbs: 28 },
];

export default function QuickPresets({ presets, onSelect, addingName }) {
  const { isEnglish, text } = useLanguage();
  const items = presets?.length > 0 ? presets : defaultPresets;
  const translatePreset = (name) => {
    if (!isEnglish) return name;
    return name
      .replace('Кава з молоком', 'Coffee with milk')
      .replace('2 яйця', '2 eggs')
      .replace('Банан', 'Banana')
      .replace('Салат овочевий', 'Vegetable salad')
      .replace('Куряча грудка 150г', 'Chicken breast 150g')
      .replace('Рис 100г', 'Rice 100g');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-4 h-4 text-secondary-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">{text('Швидке додавання', 'Quick add')}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((preset, i) => {
          const isAdding = addingName === preset.name;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-8 px-3 gap-1"
                onClick={() => onSelect(preset)}
                disabled={!!addingName}
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{translatePreset(preset.name)}</span>
                  </>
                ) : (
                  <>
                    <span>{translatePreset(preset.name)}</span>
                    <span className="text-muted-foreground">{preset.calories}</span>
                  </>
                )}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
