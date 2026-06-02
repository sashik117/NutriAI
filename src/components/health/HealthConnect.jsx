import { motion } from 'framer-motion';
import { Activity, Footprints, Flame, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHealthConnect } from '@/hooks/useHealthConnect';
import { useLanguage } from '@/lib/LanguageContext';

export default function HealthConnect({ onActivityUpdate, weightKg = 70 }) {
  const { text } = useLanguage();
  const {
    connected,
    activity,
    manualSteps,
    setManualSteps,
    showManual,
    handleConnect,
    handleManualSubmit,
    reset,
    estimatedManualCalories,
  } = useHealthConnect({ onActivityUpdate, weightKg });

  if (connected && activity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-3 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
          <Activity className="w-5 h-5 text-green-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-green-600">
            {activity.source === 'manual' ? text('📲 Активність (вручну)', '📲 Activity (manual)') : '✅ Health Connect'}
          </p>
          <div className="flex gap-3 mt-0.5">
            <span className="text-xs flex items-center gap-1">
              <Footprints className="w-3 h-3 text-muted-foreground" />
              {activity.steps?.toLocaleString()} {text('кроків', 'steps')}
            </span>
            <span className="text-xs flex items-center gap-1 font-semibold text-primary">
              <Flame className="w-3 h-3" />
              +{activity.active_calories} {text('ккал до норми', 'kcal to your goal')}
            </span>
          </div>
        </div>
        <button onClick={reset} className="p-1.5 rounded-lg hover:bg-muted">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full rounded-xl h-10 text-xs gap-2"
        onClick={handleConnect}
      >
        <Activity className="w-4 h-4 text-green-500" />
        {text('Підключити активність (Health Connect / кроки)', 'Connect activity (Health Connect / steps)')}
      </Button>

      {showManual && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-muted/40 rounded-xl p-3 space-y-2"
        >
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{text('Health Connect недоступний у браузері. Введіть кількість кроків вручну або встановіть нативний додаток.', 'Health Connect is not available in the browser. Enter steps manually or install the native app later.')}</span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder={text('Кроки за сьогодні', 'Steps today')}
              value={manualSteps}
              onChange={e => setManualSteps(e.target.value)}
              className="flex-1 h-9 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <Button size="sm" className="rounded-xl" onClick={handleManualSubmit} disabled={!manualSteps}>
              OK
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            ~{estimatedManualCalories} {text('ккал буде додано до денної норми', 'kcal will be added to today goal')}
          </p>
        </motion.div>
      )}
    </div>
  );
}
