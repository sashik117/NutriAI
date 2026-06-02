import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Ruler } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useBodyMeasurements } from '@/hooks/useBodyMeasurements';
import { useLanguage } from '@/lib/LanguageContext';


export default function BodyMeasurements() {
  const { form, showForm, setShowForm, updateForm, saveMeasurements, canSave, chartData } = useBodyMeasurements();
  const { text } = useLanguage();
  const fields = [
    ['waist', text('Талія', 'Waist')],
    ['hips', text('Стегна', 'Hips')],
    ['chest', text('Груди', 'Chest')],
  ];

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold">{text('Заміри тіла', 'Body measurements')}</p>
        </div>
        <Button size="sm" variant="outline" className="rounded-xl h-7 text-xs" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3 h-3 mr-1" /> {text('Додати', 'Add')}
        </Button>
      </div>

      {showForm && (
        <div className="grid grid-cols-3 gap-2 bg-muted/30 rounded-xl p-3">
          {fields.map(([k, label]) => (
            <div key={k}>
              <Label className="text-[10px] text-muted-foreground">{label} ({text('см', 'cm')})</Label>
              <Input
                type="number"
                value={form[k]}
                onChange={(event) => updateForm(k, event.target.value)}
                className="rounded-lg h-8 text-sm mt-0.5"
                placeholder="0"
                aria-label={`${label}, ${text('см', 'cm')}`}
              />
            </div>
          ))}
          <div className="col-span-3">
            <Button
              size="sm"
              className="w-full rounded-xl"
              onClick={saveMeasurements}
              disabled={!canSave}
            >
              {text('Зберегти заміри', 'Save measurements')}
            </Button>
          </div>
        </div>
      )}

      {chartData.length >= 2 ? (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} domain={['dataMin - 2', 'dataMax + 2']} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="waist" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name={text('Талія', 'Waist')} />
            <Line type="monotone" dataKey="hips" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name={text('Стегна', 'Hips')} />
            <Line type="monotone" dataKey="chest" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name={text('Груди', 'Chest')} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">{text('Додайте хоча б 2 записи для графіку', 'Add at least 2 entries for the chart')}</p>
      )}
    </div>
  );
}
