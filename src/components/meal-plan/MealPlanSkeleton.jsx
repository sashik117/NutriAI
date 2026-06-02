import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function MealPlanSkeleton({ status }) {
  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
        {status}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full w-1/2 rounded-full bg-primary"
          animate={{ x: ['-100%', '220%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="space-y-2 rounded-2xl bg-muted/40 p-3">
          <div className="h-3 w-24 animate-pulse rounded-full bg-muted-foreground/15" />
          <div className="h-4 w-4/5 animate-pulse rounded-full bg-muted-foreground/20" />
          <div className="flex gap-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-muted-foreground/15" />
            <div className="h-6 w-14 animate-pulse rounded-full bg-muted-foreground/15" />
            <div className="h-6 w-14 animate-pulse rounded-full bg-muted-foreground/15" />
          </div>
        </div>
      ))}
    </div>
  );
}
