import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HistoryAiSummary({ aiSummary, foodLogs, generateSummary, loadingSummary, text }) {
  if (!foodLogs.length) return null;

  if (!aiSummary) {
    return (
      <Button variant="outline" className="w-full rounded-xl" onClick={generateSummary} disabled={loadingSummary}>
        {loadingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {text('Отримати аналіз від ШІ', 'Get AI analysis')}
      </Button>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-accent/50 p-4">
      <p className="mb-2 text-xs font-semibold text-accent-foreground">🤖 {text('Аналіз ШІ', 'AI analysis')}</p>
      <p className="text-sm text-accent-foreground/90">{aiSummary}</p>
    </motion.div>
  );
}
