import { motion } from 'framer-motion';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

function WeightDiff({ diff }) {
  if (diff === null) return <p className="text-xl font-extrabold">-</p>;

  const numericDiff = parseFloat(diff);
  const isDown = numericDiff < 0;
  const isUp = numericDiff > 0;

  return (
    <div className="flex items-center justify-center gap-1">
      {isDown ? (
        <TrendingDown className="h-4 w-4 text-green-500" />
      ) : isUp ? (
        <TrendingUp className="h-4 w-4 text-destructive" />
      ) : (
        <Minus className="h-4 w-4 text-muted-foreground" />
      )}
      <p className={`text-xl font-extrabold ${isDown ? 'text-green-500' : isUp ? 'text-destructive' : ''}`}>
        {diff > 0 ? '+' : ''}{diff}
      </p>
    </div>
  );
}

export default function WeightStatsGrid({ latestWeight, diff, entriesCount, text }) {
  const cards = [
    {
      delay: 0,
      value: <p className="text-xl font-extrabold">{latestWeight ?? '-'}</p>,
      label: text('кг зараз', 'kg now'),
    },
    {
      delay: 0.05,
      value: <WeightDiff diff={diff} />,
      label: text('зміна', 'change'),
    },
    {
      delay: 0.1,
      value: <p className="text-xl font-extrabold">{entriesCount}</p>,
      label: text('записів', 'entries'),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: card.delay }}
          className="rounded-2xl border border-border bg-card p-3 text-center"
        >
          {card.value}
          <p className="text-[10px] text-muted-foreground">{card.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
