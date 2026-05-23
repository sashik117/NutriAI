import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Footprints, Flame, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Health Connect / HealthKit bridge
// In a PWA: we use Web Bluetooth / Web NFC workarounds or manual entry.
// In Capacitor build: replace this with @capacitor-community/health or capacitor-health-connect plugin.

const STORAGE_KEY = 'health_activity_today';

function getStoredActivity() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (stored.date === new Date().toISOString().split('T')[0]) return stored;
  } catch {}
  return null;
}

function storeActivity(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...data,
    date: new Date().toISOString().split('T')[0],
  }));
}

// Estimate calories burned from steps (MET formula)
function stepsToCalories(steps, weightKg = 70) {
  // ~0.04 kcal per step per 70kg
  return Math.round(steps * 0.04 * (weightKg / 70));
}

export default function HealthConnect({ onActivityUpdate, weightKg = 70 }) {
  const [connected, setConnected] = useState(false);
  const [activity, setActivity] = useState(null);
  const [manualSteps, setManualSteps] = useState('');
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    const stored = getStoredActivity();
    if (stored) {
      setActivity(stored);
      setConnected(true);
      onActivityUpdate?.(stored.active_calories || 0);
    }
  }, []);

  // Try Web Health API (Chrome on Android with Health Connect installed)
  const tryNativeConnect = async () => {
    // @ts-ignore
    if (navigator.health) {
      try {
        // @ts-ignore
        await navigator.health.requestPermission(['steps', 'activeCalories']);
        // @ts-ignore
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // @ts-ignore
        const steps = await navigator.health.query({ type: 'steps', startDate: today, endDate: new Date() });
        const stepCount = steps?.total || 0;
        const active_calories = stepsToCalories(stepCount, weightKg);
        const data = { steps: stepCount, active_calories, source: 'HealthConnect' };
        setActivity(data);
        storeActivity(data);
        setConnected(true);
        onActivityUpdate?.(active_calories);
        return true;
      } catch {}
    }
    return false;
  };

  const handleConnect = async () => {
    const ok = await tryNativeConnect();
    if (!ok) setShowManual(true);
  };

  const handleManualSubmit = () => {
    const steps = parseInt(manualSteps) || 0;
    const active_calories = stepsToCalories(steps, weightKg);
    const data = { steps, active_calories, source: 'manual' };
    setActivity(data);
    storeActivity(data);
    setConnected(true);
    setShowManual(false);
    setManualSteps('');
    onActivityUpdate?.(active_calories);
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setActivity(null);
    setConnected(false);
    onActivityUpdate?.(0);
  };

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
            {activity.source === 'manual' ? '📲 Активність (вручну)' : '✅ Health Connect'}
          </p>
          <div className="flex gap-3 mt-0.5">
            <span className="text-xs flex items-center gap-1">
              <Footprints className="w-3 h-3 text-muted-foreground" />
              {activity.steps?.toLocaleString()} кроків
            </span>
            <span className="text-xs flex items-center gap-1 font-semibold text-primary">
              <Flame className="w-3 h-3" />
              +{activity.active_calories} ккал до норми
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
        Підключити активність (Health Connect / кроки)
      </Button>

      {showManual && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-muted/40 rounded-xl p-3 space-y-2"
        >
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Health Connect недоступний у браузері. Введіть кількість кроків вручну або встановіть нативний додаток.</span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Кроки за сьогодні"
              value={manualSteps}
              onChange={e => setManualSteps(e.target.value)}
              className="flex-1 h-9 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <Button size="sm" className="rounded-xl" onClick={handleManualSubmit} disabled={!manualSteps}>
              OK
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            ~{stepsToCalories(parseInt(manualSteps) || 0, weightKg)} ккал буде додано до денної норми
          </p>
        </motion.div>
      )}
    </div>
  );
}