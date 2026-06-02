import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function CustomTooltip({ active, payload, text }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="font-bold">{payload[0].value} {text('кг', 'kg')}</p>
      <p className="text-xs text-muted-foreground">{payload[0].payload.date}</p>
    </div>
  );
}

export default function WeightChartCard({ chartData, targetWeight, text }) {
  if (chartData.length < 2) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Scale className="mx-auto mb-2 h-10 w-10 opacity-30" />
        <p className="text-sm">{text('Додайте хоча б 2 записи, щоб побачити графік', 'Add at least 2 entries to see the chart')}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <p className="mb-4 text-sm font-bold">{text('Графік за 30 днів', '30-day chart')}</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} domain={['dataMin - 1', 'dataMax + 1']} />
          <Tooltip content={<CustomTooltip text={text} />} />
          {targetWeight && (
            <ReferenceLine
              y={targetWeight}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              label={{ value: text('Ціль', 'Goal'), fontSize: 10, fill: 'hsl(var(--primary))' }}
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
  );
}
