import { useState } from 'react';
import { nutriApi } from '@/api/nutriApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AiRefinement({ currentResult, onRefined }) {
  const [refinement, setRefinement] = useState('');
  const [loading, setLoading] = useState(false);

  const refine = async () => {
    if (!refinement.trim()) return;
    setLoading(true);

    const result = await nutriApi.integrations.Core.InvokeLLM({
      prompt: `Користувач вже зробив запис їжі і хоче уточнити його.

Поточний запис (JSON):
${JSON.stringify(currentResult, null, 2)}

Уточнення від користувача: "${refinement}"

Скоригуй відповідні позиції та перерахуй тотали. Поверни той самий JSON-формат з оновленими значеннями. Не додавай нові продукти якщо не просять, лише коригуй існуючі.`,
      response_json_schema: {
        type: 'object',
        properties: {
          total_calories: { type: 'number' },
          total_proteins: { type: 'number' },
          total_fats: { type: 'number' },
          total_carbs: { type: 'number' },
          ai_tip: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                weight_g: { type: 'number' },
                calories: { type: 'number' },
                proteins: { type: 'number' },
                fats: { type: 'number' },
                carbs: { type: 'number' },
              },
            },
          },
        },
      },
      model: 'gemini_3_flash',
    });

    onRefined(result);
    setRefinement('');
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-muted/50 rounded-xl p-3 space-y-2"
    >
      <p className="text-xs font-semibold text-muted-foreground">✏️ Уточнити запис</p>
      <div className="flex gap-2">
        <Input
          placeholder='Напр. "Яйця були смажені" або "Додай ложку сметани"'
          value={refinement}
          onChange={e => setRefinement(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && refine()}
          className="rounded-xl text-sm h-9"
        />
        <Button
          size="icon"
          variant="outline"
          onClick={refine}
          disabled={loading || !refinement.trim()}
          className="rounded-xl h-9 w-9 shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>
    </motion.div>
  );
}