import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function ProductSearchEmptyState({ setShowManual, text }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-center"
    >
      <p className="text-xs text-muted-foreground">{text('Не знайшла в базі. Можна додати вручну тут же.', 'Not found in the database. You can add it manually here.')}</p>
      <Button type="button" variant="outline" className="mt-2 h-9 rounded-xl text-xs" onClick={() => setShowManual(true)}>
        {text('Додати вручну', 'Add manually')}
      </Button>
    </motion.div>
  );
}
