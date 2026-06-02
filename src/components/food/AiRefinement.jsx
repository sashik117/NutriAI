import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { refineFoodAnalysis } from '@/services/aiNutritionService';

export default function AiRefinement({ currentResult, onRefined }) {
  const [refinement, setRefinement] = useState('');
  const [loading, setLoading] = useState(false);

  const refine = async () => {
    if (!refinement.trim()) return;
    setLoading(true);

    try {
      const result = await refineFoodAnalysis(currentResult, refinement);
      onRefined(result);
      setRefinement('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2 rounded-xl bg-muted/50 p-3"
    >
      <p className="text-xs font-semibold text-muted-foreground">Уточнити запис</p>
      <div className="flex gap-2">
        <Input
          placeholder='Напр. "яйця були смажені" або "додай ложку сметани"'
          value={refinement}
          onChange={(event) => setRefinement(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && refine()}
          className="h-9 rounded-xl text-sm"
        />
        <Button
          size="icon"
          variant="outline"
          onClick={refine}
          disabled={loading || !refinement.trim()}
          className="h-9 w-9 shrink-0 rounded-xl"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>
    </motion.div>
  );
}
