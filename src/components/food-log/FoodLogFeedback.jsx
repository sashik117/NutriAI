import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function FoodLogFeedback({ tr, analyzing, saving, aiTip, hasAiResult }) {
  return (
    <>
      {analyzing && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-sm font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {tr('ШІ рахує КБЖУ...', 'AI is calculating macros...')}
        </div>
      )}

      {saving && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-sm font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {tr('Зберігаю...', 'Saving...')}
        </div>
      )}

      {aiTip && !hasAiResult && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-accent/50 p-3"
        >
          <p className="mb-1 text-xs font-semibold text-accent-foreground">{tr('Порада ШІ', 'AI tip')}</p>
          <p className="text-xs text-accent-foreground/80">{aiTip}</p>
        </motion.div>
      )}
    </>
  );
}
