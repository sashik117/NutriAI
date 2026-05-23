import { useState } from 'react';
import { nutriApi } from '@/api/nutriApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Ruler } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function BodyMeasurements() {
  const [form, setForm] = useState({ waist: '', hips: '', chest: '' });
  const [showForm, setShowForm] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');
  const queryClient = useQueryClient();

  const { data: measurements } = useQuery({
    queryKey: ['bodyMeasurements'],
    queryFn: () => nutriApi.entities.BodyMeasurement.list('-date', 30),
    initialData: [],
  });

  const addMutation = useMutation({
    mutationFn: (data) => nutriApi.entities.BodyMeasurement.create({ ...data, date: today }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bodyMeasurements'] });
      toast.success('Заміри збережено ✅');
      setForm({ waist: '', hips: '', chest: '' });
      setShowForm(false);
    },
  });

  const chartData = [...measurements]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(m => ({
      date: format(new Date(m.date), 'd MMM', { locale: uk }),
      waist: m.waist,
      hips: m.hips,
      chest: m.chest,
    }));

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold">Заміри тіла</p>
        </div>
        <Button size="sm" variant="outline" className="rounded-xl h-7 text-xs" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3 h-3 mr-1" /> Додати
        </Button>
      </div>

      {showForm && (
        <div className="grid grid-cols-3 gap-2 bg-muted/30 rounded-xl p-3">
          {[['waist', 'Талія'], ['hips', 'Стегна'], ['chest', 'Груди']].map(([k, label]) => (
            <div key={k}>
              <Label className="text-[10px] text-muted-foreground">{label} (см)</Label>
              <Input
                type="number"
                value={form[k]}
                onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                className="rounded-lg h-8 text-sm mt-0.5"
                placeholder="0"
              />
            </div>
          ))}
          <div className="col-span-3">
            <Button
              size="sm"
              className="w-full rounded-xl"
              onClick={() => addMutation.mutate({ waist: Number(form.waist), hips: Number(form.hips), chest: Number(form.chest) })}
              disabled={!form.waist && !form.hips && !form.chest}
            >
              Зберегти заміри
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
            <Line type="monotone" dataKey="waist" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Талія" />
            <Line type="monotone" dataKey="hips" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="Стегна" />
            <Line type="monotone" dataKey="chest" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Груди" />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">Додайте хоча б 2 записи для графіку</p>
      )}
    </div>
  );
}