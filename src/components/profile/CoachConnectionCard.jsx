import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Link2, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { nutriApi } from '@/api/nutriApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const permissionLabels = [
  { key: 'nutrition', uk: 'КБЖУ', en: 'Macros' },
  { key: 'water', uk: 'Вода', en: 'Water' },
  { key: 'weight', uk: 'Вага', en: 'Weight' },
  { key: 'plan', uk: 'План', en: 'Plan' },
  { key: 'history', uk: 'Історія', en: 'History' },
  { key: 'notes', uk: 'Нотатки', en: 'Notes' },
];

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

export default function CoachConnectionCard({ text, isEnglish }) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const inviteFromUrl = new URLSearchParams(location.search).get('coachInvite') || '';
  const [code, setCode] = useState(() => normalizeCode(inviteFromUrl));
  const [connecting, setConnecting] = useState(false);
  const [savingId, setSavingId] = useState('');

  const { data: coaches = [], isLoading } = useQuery({
    queryKey: ['myCoaches'],
    queryFn: () => nutriApi.coach.myCoaches(),
    initialData: [],
  });

  useEffect(() => {
    if (inviteFromUrl) setCode(normalizeCode(inviteFromUrl));
  }, [inviteFromUrl]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['myCoaches'] });

  const connect = async () => {
    const cleanCode = normalizeCode(code);
    if (!cleanCode) {
      toast.error(text('Введіть код тренера', 'Enter coach code'));
      return;
    }

    setConnecting(true);
    try {
      const result = await nutriApi.coach.connect(cleanCode);
      toast.success(text(`Підключено до ${result.coach?.name || result.coach?.nickname || 'тренера'}`, 'Coach connected'));
      setCode('');
      window.history.replaceState({}, '', window.location.pathname);
      refresh();
    } catch (error) {
      toast.error(error.message || text('Не вдалося підключитися', 'Could not connect'));
    } finally {
      setConnecting(false);
    }
  };

  const updatePermission = async (connection, key) => {
    const nextPermissions = {
      ...(connection.relationship?.permissions || {}),
      [key]: !connection.relationship?.permissions?.[key],
    };
    setSavingId(`${connection.relationship.id}:${key}`);
    try {
      await nutriApi.coach.updateMyCoachPermissions(connection.relationship.id, nextPermissions);
      toast.success(text('Дозволи оновлено', 'Permissions updated'));
      refresh();
    } catch (error) {
      toast.error(error.message || text('Не вдалося оновити дозволи', 'Could not update permissions'));
    } finally {
      setSavingId('');
    }
  };

  const disconnect = async (connection) => {
    setSavingId(connection.relationship.id);
    try {
      await nutriApi.coach.disconnectMyCoach(connection.relationship.id);
      toast.success(text('Тренера відключено', 'Coach disconnected'));
      refresh();
    } catch (error) {
      toast.error(error.message || text('Не вдалося відключити тренера', 'Could not disconnect coach'));
    } finally {
      setSavingId('');
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold">{text('Тренерський доступ', 'Coach access')}</h2>
          <p className="text-xs text-muted-foreground">
            {text('Підключайте тренера кодом і самі керуйте тим, що він бачить.', 'Connect a coach by code and control what they can see.')}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(event) => setCode(normalizeCode(event.target.value))}
          placeholder="NAI-00000000"
          className="h-11 rounded-xl font-bold uppercase"
        />
        <Button type="button" onClick={connect} disabled={connecting} className="h-11 rounded-xl px-4">
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : coaches.length === 0 ? (
        <p className="rounded-xl bg-muted/45 p-3 text-sm text-muted-foreground">
          {text('Поки немає підключених тренерів.', 'No connected coaches yet.')}
        </p>
      ) : (
        <div className="space-y-3">
          {coaches.map((connection) => (
            <article key={connection.relationship.id} className="space-y-3 rounded-xl bg-muted/35 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold">{connection.coach.name || connection.coach.nickname}</p>
                  <p className="text-xs text-muted-foreground">{connection.coach.email}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => disconnect(connection)}
                  disabled={savingId === connection.relationship.id}
                  aria-label={text('Відключити тренера', 'Disconnect coach')}
                  className="h-9 w-9 rounded-xl text-destructive"
                >
                  {savingId === connection.relationship.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {permissionLabels.map((item) => {
                  const enabled = Boolean(connection.relationship.permissions?.[item.key]);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => updatePermission(connection, item.key)}
                      disabled={savingId === `${connection.relationship.id}:${item.key}`}
                      className={`flex h-10 items-center justify-between rounded-xl border px-3 text-xs font-bold transition ${
                        enabled ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'
                      }`}
                    >
                      <span>{isEnglish ? item.en : item.uk}</span>
                      {enabled && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
