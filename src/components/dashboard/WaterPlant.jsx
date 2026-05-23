import { motion } from 'framer-motion';
import { Droplets, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/LanguageContext';

export default function WaterPlant({ current, goal, onAddWater }) {
  const { text } = useLanguage();
  const progress = Math.min(current / (goal || 2000), 1);
  const glasses = Math.floor(current / 250);
  const totalGlasses = Math.ceil((goal || 2000) / 250);

  // Plant mood based on progress
  const getMood = () => {
    if (progress >= 0.8) return { emoji: '🌸', label: text('Квітне!', 'Blooming!') };
    if (progress >= 0.5) return { emoji: '🌿', label: text('Росте', 'Growing') };
    if (progress >= 0.2) return { emoji: '🌱', label: text('Паросток', 'Sprout') };
    return { emoji: '🥀', label: text('Спрагла...', 'Thirsty...') };
  };

  const mood = getMood();

  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-chart-5" />
          <span className="font-bold text-sm">{text('Вода', 'Water')}</span>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {current} / {goal} {text('мл', 'ml')}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Plant visualization */}
        <motion.div
          className="flex flex-col items-center justify-end w-16 h-20 bg-muted rounded-xl relative overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-chart-5/20 rounded-b-xl"
            animate={{ height: `${progress * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <motion.span
            className="text-3xl relative z-10 mb-1"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {mood.emoji}
          </motion.span>
        </motion.div>

        {/* Glasses progress */}
        <div className="flex-1">
          <div className="flex flex-wrap gap-1 mb-2">
            {Array.from({ length: totalGlasses }).map((_, i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-md transition-all duration-300 ${
                  i < glasses ? 'bg-chart-5' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{mood.label}</p>
        </div>

        <Button
          size="icon"
          variant="outline"
          className="rounded-full h-10 w-10 shrink-0"
          onClick={() => onAddWater(250)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
