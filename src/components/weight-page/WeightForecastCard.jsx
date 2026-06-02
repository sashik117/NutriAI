import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WeightForecastCard({ chartData, forecast, generateForecast, loadingForecast, setForecast, text }) {
  if (chartData.length < 3) return null;

  if (!forecast) {
    return (
      <Button variant="outline" className="w-full rounded-xl" onClick={generateForecast} disabled={loadingForecast}>
        {loadingForecast ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {text('Прогноз від ШІ', 'AI forecast')}
      </Button>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-xs font-bold text-primary">🔮 {text('Прогноз ШІ', 'AI forecast')}</p>
      <p className="text-sm">{forecast}</p>
      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setForecast('')}>{text('Оновити', 'Refresh')}</Button>
    </motion.div>
  );
}
