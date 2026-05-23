import { useState } from 'react';
import { nutriApi } from '@/api/nutriApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, TrendingDown, TrendingUp, Minus, Scale, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import BodyMeasurements from '../components/weight/BodyMeasurement';

export default function WeightTracker() {
  const [newWeight, setNewWeight] = useState('');
  const [forecast, setForecast] = useState('');
  const [loadingForecast, setLoadingForecast] = useState(false);
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: weightLogs } = useQuery({
    queryKey: ['weightLogs'],
    queryFn: () => nutriApi.entities.WeightLog.list('-date', 60),
    initialData: [],
  });

  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => nutriApi.entities.UserProfile.list(),
    initialData: [],
  });

  const profile = profiles[0];

  const addMutation = useMutation({
    mutationFn: (weight) => nutriApi.entities.WeightLog.create({ weight, date: today }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weightLogs'] });
      toast.success('Вага збережена! ✅');
      setNewWeight('');
    },
  });

  const todayLog = weightLogs.find((l) => l.date === today);

  // Sort and deduplicate by date for chart
  const chartData = [...weightLogs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map((l) => ({
      date: format(new Date(l.date), 'd MMM', { locale: uk }),
      weight: l.weight,
    }));

  const latestWeight = weightLogs[0]?.weight;
  const firstWeight = weightLogs[weightLogs.length - 1]?.weight;
  const diff = latestWeight && firstWeight ? (latestWeight - firstWeight).toFixed(1) : null;
  const targetWeight = profile?.weight;

  const generateForecast = async () => {
    setLoadingForecast(true);
    const result = await nutriApi.integrations.Core.InvokeLLM({
      prompt: `Проаналізуй динаміку ваги користувача та зроби прогноз.
Записи (дата: вага): ${chartData.map(d => `${d.date}: ${d.weight}кг`).join(', ')}
Поточна вага: ${latestWeight}кг
Ціль користувача: ${profile?.goal === 'lose' ? 'схуднення' : profile?.goal === 'gain' ? 'набір маси' : 'підтримка ваги'}
Денна норма калорій: ${profile?.daily_calories || 2000} ккал
Зроби персональний прогноз на 2-3 речення українською: коли досягне цілі, темп змін, мотивація.`,
      model: 'gemini_3_flash',
    });
    setForecast(result);
    setLoadingForecast(false);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
          <p className="font-bold">{payload[0].value} кг</p>
          <p className="text-xs text-muted-foreground">{payload[0].payload.date}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pt-6 space-y-5 pb-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold">Вага ⚖️</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Відстежуйте свій прогрес</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-3 border border-border text-center"
        >
          <p className="text-xl font-extrabold">{latestWeight ?? '—'}</p>
          <p className="text-[10px] text-muted-foreground">кг зараз</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl p-3 border border-border text-center"
        >
          {diff !== null ? (
            <div className="flex items-center justify-center gap-1">
              {parseFloat(diff) < 0 ? (
                <TrendingDown className="w-4 h-4 text-green-500" />
              ) : parseFloat(diff) > 0 ? (
                <TrendingUp className="w-4 h-4 text-destructive" />
              ) : (
                <Minus className="w-4 h-4 text-muted-foreground" />
              )}
              <p className={`text-xl font-extrabold ${parseFloat(diff) < 0 ? 'text-green-500' : parseFloat(diff) > 0 ? 'text-destructive' : ''}`}>
                {diff > 0 ? '+' : ''}{diff}
              </p>
            </div>
          ) : (
            <p className="text-xl font-extrabold">—</p>
          )}
          <p className="text-[10px] text-muted-foreground">зміна</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-3 border border-border text-center"
        >
          <p className="text-xl font-extrabold">{weightLogs.length}</p>
          <p className="text-[10px] text-muted-foreground">записів</p>
        </motion.div>
      </div>

      {/* Add weight */}
      <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
        <div>
          <p className="text-sm font-bold">
            {todayLog ? `Сьогодні: ${todayLog.weight} кг ✅` : 'Додати вагу сьогодні'}
          </p>
          {profile?.weight && (
            <p className="text-xs text-muted-foreground mt-0.5">Початкова вага у профілі: {profile.weight} кг</p>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="number"
              step="0.1"
              placeholder="70.5"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className="rounded-xl pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">кг</span>
          </div>
          <Button
            className="rounded-xl px-5"
            onClick={() => addMutation.mutate(parseFloat(newWeight))}
            disabled={!newWeight || isNaN(parseFloat(newWeight))}
          >
            <Plus className="w-4 h-4 mr-1" /> Додати
          </Button>
        </div>
      </div>

      {/* Chart */}
      {chartData.length >= 2 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl p-4 border border-border"
        >
          <p className="text-sm font-bold mb-4">Графік за 30 днів</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip content={<CustomTooltip />} />
              {targetWeight && (
                <ReferenceLine
                  y={targetWeight}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="4 4"
                  label={{ value: 'Ціль', fontSize: 10, fill: 'hsl(var(--primary))' }}
                />
              )}
              <Line
                type="monotone"
                dataKey="weight"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Scale className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Додайте хоча б 2 записи, щоб побачити графік</p>
        </div>
      )}

      {/* AI Forecast */}
      {chartData.length >= 3 && (
        <div>
          {!forecast ? (
            <Button variant="outline" className="w-full rounded-xl" onClick={generateForecast} disabled={loadingForecast}>
              {loadingForecast ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Прогноз від ШІ
            </Button>
          ) : (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-primary">🔮 Прогноз ШІ</p>
              <p className="text-sm">{forecast}</p>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setForecast('')}>Оновити</Button>
            </motion.div>
          )}
        </div>
      )}

      {/* Body Measurements */}
      <BodyMeasurements />

      {/* Log history */}
      {weightLogs.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-muted-foreground">Останні записи</p>
          {weightLogs.slice(0, 10).map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between bg-card rounded-xl p-3 border border-border"
            >
              <span className="text-sm text-muted-foreground">
                {format(new Date(log.date), 'd MMMM', { locale: uk })}
              </span>
              <span className="font-bold">{log.weight} кг</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
