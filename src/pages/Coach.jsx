import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, Clipboard, Copy, Loader2, NotebookPen, Shield, Trash2, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { nutriApi } from '@/api/nutriApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

function localIsoDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function round(value) {
  return Math.round(Number(value || 0));
}

function percent(value) {
  return `${Math.round(Math.min(Math.max(Number(value || 0), 0), 1.5) * 100)}%`;
}

function inviteLink(code) {
  if (!code) return '';
  return `${window.location.origin}/profile?coachInvite=${encodeURIComponent(code)}`;
}

function Metric({ label, value, muted }) {
  return (
    <div className="rounded-xl bg-background p-3">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-extrabold ${muted ? 'text-muted-foreground' : ''}`}>{value}</p>
    </div>
  );
}

function ClientCard({ clientView, selected, onSelect, text }) {
  const today = clientView.today || {};
  const nutrition = today.nutrition || {};
  const water = today.water || {};
  const weight = today.weight || {};
  const nutritionAdherence = today.nutrition_adherence || today.adherence;
  const planAdherence = today.plan_adherence;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
        selected ? 'border-primary bg-primary/10' : 'border-border bg-card'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold">{clientView.client?.nickname || clientView.client?.name}</p>
          <p className="truncate text-xs text-muted-foreground">{clientView.client?.email}</p>
        </div>
        <ArrowRight className={`mt-1 h-4 w-4 shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label={text('Ккал', 'Kcal')} value={nutrition ? `${round(nutrition.total_calories)} ккал` : '—'} muted={!nutrition} />
        <Metric label={text('Вода', 'Water')} value={water ? `${round(water.amount_ml)} мл` : '—'} muted={!water} />
        <Metric label={text('Вага', 'Weight')} value={weight?.weight ? `${round(weight.weight)} кг` : '—'} muted={!weight?.weight} />
        <Metric label={text('План', 'Plan')} value={planAdherence ? percent(planAdherence.ratio) : '—'} muted={!planAdherence} />
      </div>
      <div className="mt-2 space-y-1">
        {planAdherence?.label && <p className="text-xs font-bold text-muted-foreground">{planAdherence.label}</p>}
        {nutritionAdherence?.label && <p className="text-[11px] text-muted-foreground">{text('Калорії', 'Calories')}: {nutritionAdherence.label}</p>}
      </div>
    </button>
  );
}

function HistoryRows({ rows = [], valueKey, unit }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">Немає історії</p>;
  return (
    <div className="space-y-2">
      {rows.slice(0, 7).map((row) => (
        <div key={`${row.date}-${valueKey}`} className="flex items-center justify-between rounded-xl bg-background px-3 py-2 text-sm">
          <span className="font-bold">{row.date}</span>
          <span className="text-muted-foreground">{round(row[valueKey])} {unit}</span>
        </div>
      ))}
    </div>
  );
}

export default function Coach() {
  const { user } = useAuth();
  const { text } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => localIsoDate());
  const [note, setNote] = useState('');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const today = useMemo(() => selectedDate || localIsoDate(), [selectedDate]);
  const canCoach = user?.role === 'coach' || user?.role === 'admin';

  const { data: invites = [], isLoading: loadingInvites } = useQuery({
    queryKey: ['coachInvites'],
    queryFn: () => nutriApi.coach.invites(),
    enabled: canCoach,
    initialData: [],
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['coachClients', today],
    queryFn: () => nutriApi.coach.clients(today),
    enabled: canCoach,
    initialData: [],
  });

  const selectedClient = selectedClientId || clients[0]?.client?.id || '';
  const { data: clientDetail, isFetching: loadingDetail } = useQuery({
    queryKey: ['coachClientDetail', selectedClient, today],
    queryFn: () => nutriApi.coach.client(selectedClient, today),
    enabled: canCoach && Boolean(selectedClient),
  });

  const refreshCoach = () => {
    queryClient.invalidateQueries({ queryKey: ['coachInvites'] });
    queryClient.invalidateQueries({ queryKey: ['coachClients'] });
    queryClient.invalidateQueries({ queryKey: ['coachClientDetail'] });
  };

  const createInvite = async () => {
    setCreatingInvite(true);
    try {
      const invite = await nutriApi.coach.createInvite({
        expires_days: 14,
        max_uses: 20,
        profile: { display_name: user?.nickname || user?.name || 'Coach' },
      });
      toast.success(text('Код запрошення створено', 'Invite code created'));
      try {
        await navigator.clipboard?.writeText(inviteLink(invite.code));
      } catch {
        // Clipboard access can be blocked; the code still appears in the UI.
      }
      refreshCoach();
    } catch (error) {
      toast.error(error.message || text('Не вдалося створити код', 'Could not create invite'));
    } finally {
      setCreatingInvite(false);
    }
  };

  const copyInvite = async (code) => {
    try {
      await navigator.clipboard?.writeText(inviteLink(code));
      toast.success(text('Посилання скопійовано', 'Invite link copied'));
    } catch {
      toast.info(code);
    }
  };

  const revokeInvite = async (inviteId) => {
    setRevokingInviteId(inviteId);
    try {
      await nutriApi.coach.revokeInvite(inviteId);
      toast.success(text('Код відкликано', 'Invite revoked'));
      queryClient.invalidateQueries({ queryKey: ['coachInvites'] });
    } catch (error) {
      toast.error(error.message || text('Не вдалося відкликати код', 'Could not revoke invite'));
    } finally {
      setRevokingInviteId('');
    }
  };

  const addNote = async () => {
    if (!clientDetail?.client?.id || !note.trim()) return;
    setSavingNote(true);
    try {
      await nutriApi.coach.addNote(clientDetail.client.id, note);
      setNote('');
      toast.success(text('Нотатку додано', 'Note added'));
      queryClient.invalidateQueries({ queryKey: ['coachClientDetail', clientDetail.client.id, today] });
    } catch (error) {
      toast.error(error.message || text('Не вдалося додати нотатку', 'Could not add note'));
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = async (noteId) => {
    try {
      await nutriApi.coach.deleteNote(noteId);
      toast.success(text('Нотатку видалено', 'Note deleted'));
      queryClient.invalidateQueries({ queryKey: ['coachClientDetail', clientDetail.client.id, today] });
    } catch (error) {
      toast.error(error.message || text('Не вдалося видалити нотатку', 'Could not delete note'));
    }
  };

  if (!canCoach) {
    return (
      <div className="space-y-5 pb-8 pt-6">
        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold">{text('Кабінет тренера', 'Coach dashboard')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {text('Ця сторінка доступна для акаунтів з роллю тренера.', 'This page is available for coach accounts.')}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8 pt-6">
      <section className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <UsersRound className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold">{text('Кабінет тренера', 'Coach dashboard')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {text('Запрошуйте клієнтів і відстежуйте тільки дозволені дані.', 'Invite clients and track only allowed data.')}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">{text('Код запрошення', 'Invite code')}</h2>
            <p className="text-xs text-muted-foreground">{text('Клієнт вставляє код у профілі або відкриває посилання.', 'Client uses the code in profile or opens the link.')}</p>
          </div>
          <Button type="button" onClick={createInvite} disabled={creatingInvite} className="rounded-xl">
            {creatingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clipboard className="h-4 w-4" />}
          </Button>
        </div>

        {loadingInvites ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : invites.length === 0 ? (
          <p className="rounded-xl bg-muted/45 p-3 text-sm text-muted-foreground">{text('Ще немає кодів.', 'No invite codes yet.')}</p>
        ) : (
          <div className="space-y-2">
            {invites.slice(0, 3).map((invite) => (
              <div key={invite.id} className="space-y-2 rounded-xl bg-muted/35 p-2">
                <div className="flex items-center gap-2">
                  <Input readOnly value={invite.code} className="h-10 rounded-xl font-extrabold" />
                  <Button type="button" variant="secondary" size="icon" onClick={() => copyInvite(invite.code)} className="h-10 w-10 rounded-xl">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => revokeInvite(invite.id)}
                    disabled={invite.status !== 'active' || revokingInviteId === invite.id}
                    className="h-10 w-10 rounded-xl text-destructive disabled:text-muted-foreground"
                    aria-label={text('Відкликати код', 'Revoke invite')}
                  >
                    {revokingInviteId === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 px-1 text-[10px] font-bold uppercase text-muted-foreground">
                  <span>{invite.status}</span>
                  <span>{round(invite.used_count)} / {round(invite.max_uses)}</span>
                  {invite.expires_at && <span>{String(invite.expires_at).slice(0, 10)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">{text('Клієнти', 'Clients')}</h2>
            <p className="text-xs text-muted-foreground">{text('Сьогоднішній зріз по КБЖУ, воді, вазі та плану.', 'Today snapshot for macros, water, weight, and plan.')}</p>
          </div>
          {loadingClients && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
        <label className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm font-bold">
          <CalendarDays className="h-4 w-4 text-primary" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="h-9 border-0 bg-transparent p-0 font-bold shadow-none focus-visible:ring-0"
          />
        </label>

        {clients.length === 0 && !loadingClients ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            {text('Поки немає підключених клієнтів.', 'No connected clients yet.')}
          </p>
        ) : (
          <div className="space-y-3">
            {clients.map((clientView) => (
              <ClientCard
                key={clientView.relationship.id}
                clientView={clientView}
                selected={(selectedClient || '') === clientView.client.id}
                onSelect={() => setSelectedClientId(clientView.client.id)}
                text={text}
              />
            ))}
          </div>
        )}
      </section>

      {selectedClient && (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          {loadingDetail || !clientDetail ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-extrabold">{clientDetail.client.nickname || clientDetail.client.name}</h2>
                <p className="text-xs text-muted-foreground">{clientDetail.client.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Metric label={text('Білки', 'Protein')} value={`${round(clientDetail.today?.nutrition?.total_proteins)} г`} />
                <Metric label={text('Жири', 'Fats')} value={`${round(clientDetail.today?.nutrition?.total_fats)} г`} />
                <Metric label={text('Вуглеводи', 'Carbs')} value={`${round(clientDetail.today?.nutrition?.total_carbs)} г`} />
                <Metric label={text('Вода', 'Water')} value={`${round(clientDetail.today?.water?.amount_ml)} мл`} />
              </div>

              <div className="rounded-2xl bg-primary/10 p-3">
                <p className="text-[10px] font-bold uppercase text-primary">{text('Дотримання плану', 'Plan adherence')}</p>
                <p className="mt-1 text-lg font-extrabold">
                  {clientDetail.today?.plan_adherence ? percent(clientDetail.today.plan_adherence.ratio) : '—'}
                </p>
                {clientDetail.today?.plan_adherence?.label && (
                  <p className="mt-1 text-xs text-muted-foreground">{clientDetail.today.plan_adherence.label}</p>
                )}
                {clientDetail.today?.plan_adherence?.selected_meals?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {clientDetail.today.plan_adherence.selected_meals.slice(0, 4).map((meal) => (
                      <span key={meal.id || meal.title} className="rounded-full bg-background px-2 py-1 text-[10px] font-bold text-muted-foreground">
                        {meal.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-extrabold">{text('Історія калорій', 'Calories history')}</h3>
                <HistoryRows rows={clientDetail.history?.food} valueKey="total_calories" unit="ккал" />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-extrabold">{text('Нотатки тренера', 'Coach notes')}</h3>
                <div className="flex gap-2">
                  <Input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={text('Коротка нотатка для себе', 'Short private note')}
                    className="h-11 rounded-xl"
                  />
                  <Button type="button" onClick={addNote} disabled={savingNote || !note.trim()} className="h-11 rounded-xl px-4">
                    {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <NotebookPen className="h-4 w-4" />}
                  </Button>
                </div>
                {(clientDetail.notes || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">{text('Нотаток ще немає.', 'No notes yet.')}</p>
                ) : (
                  <div className="space-y-2">
                    {clientDetail.notes.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl bg-background p-3 text-sm">
                        <div>
                          <p>{item.note}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">{item.created_date}</p>
                        </div>
                        <button type="button" onClick={() => deleteNote(item.id)} className="text-xs font-bold text-destructive">
                          {text('Видалити', 'Delete')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
