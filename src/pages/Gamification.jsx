import { motion } from 'framer-motion';
import { CheckCircle2, Flame, Loader2, Snowflake, Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/LanguageContext';
import { useGamificationPage } from '@/hooks/useGamificationPage';
import { BADGES } from '@/domain/gamification/gamificationModel';

export default function Gamification() {
  const { isEnglish, text } = useLanguage();
  const {
    foodLogs,
    achievements,
    streak,
    bestStreak,
    unlockedTypes,
    challenge,
    setChallenge,
    generatingChallenge,
    generateChallenge,
    freezeCount,
    useFreeze,
    badgeText,
  } = useGamificationPage({ isEnglish, text });

  return (
    <div className="space-y-5 pb-8 pt-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold">{text('Нагороди 🏆', 'Rewards 🏆')}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{text('Серія, бейджі та персональні виклики', 'Streaks, badges, and personal challenges')}</p>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl border border-orange-200/60 bg-orange-50 p-4 dark:border-orange-700/30 dark:bg-orange-900/20"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-orange-950/40">
            <Flame className="h-9 w-9 text-orange-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-4xl font-extrabold leading-none text-orange-600">{streak}</p>
            <p className="mt-1 text-sm font-bold">{text('днів поточної серії', 'days in current streak')}</p>
            <p className="text-xs text-muted-foreground">{text('Додай їжу сьогодні, щоб серія не зникла.', 'Add food today to keep the streak alive.')}</p>
          </div>
          <button
            onClick={useFreeze}
            disabled={freezeCount <= 0}
            className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-2xl border border-blue-200 bg-blue-50 p-2 disabled:opacity-40 dark:border-blue-700/40 dark:bg-blue-900/20"
          >
            <Snowflake className="h-5 w-5 text-blue-400" />
            <span className="text-sm font-extrabold text-blue-600">{freezeCount}</span>
            <span className="text-[9px] text-muted-foreground">freeze</span>
          </button>
        </div>
      </motion.section>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="text-xl font-extrabold text-primary">{foodLogs.length}</p>
          <p className="text-[10px] text-muted-foreground">{text('записів', 'entries')}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="text-xl font-extrabold text-chart-3">{achievements.length}</p>
          <p className="text-[10px] text-muted-foreground">{text('бейджів', 'badges')}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="text-xl font-extrabold text-chart-2">{bestStreak}</p>
          <p className="text-[10px] text-muted-foreground">{text('макс. серія', 'best streak')}</p>
        </div>
      </div>

      <section>
        <p className="mb-3 text-sm font-bold">{text('Бейджі', 'Badges')}</p>
        <div className="grid grid-cols-2 gap-2">
          {BADGES.map((rawBadge, index) => {
            const badge = badgeText(rawBadge);
            const isUnlocked = unlockedTypes.includes(badge.type);
            return (
              <motion.div
                key={badge.type}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`flex min-h-[84px] items-center gap-2 rounded-2xl border p-3 ${
                  isUnlocked ? 'border-primary/30 bg-primary/10' : 'border-border bg-muted/25 opacity-65'
                }`}
              >
                <span className="text-2xl">{isUnlocked ? badge.emoji : '🔒'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold leading-tight">{badge.title}</p>
                  <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{badge.description}</p>
                </div>
                {isUnlocked && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
              </motion.div>
            );
          })}
        </div>
      </section>

      <section>
        <p className="mb-3 text-sm font-bold">{text('Персональний виклик', 'Personal challenge')}</p>
        {!challenge ? (
          <Button className="h-12 w-full rounded-xl" onClick={generateChallenge} disabled={generatingChallenge} variant="outline">
            {generatingChallenge ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {text('Згенерувати виклик ШІ', 'Generate AI challenge')}
          </Button>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 rounded-2xl bg-accent/40 p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{challenge.emoji}</span>
              <div className="min-w-0">
                <p className="font-bold">{challenge.title}</p>
                <p className="text-xs text-muted-foreground">{challenge.description}</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {challenge.tasks?.map((task, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => setChallenge(null)}>
              {text('Новий виклик', 'New challenge')}
            </Button>
          </motion.div>
        )}
      </section>
    </div>
  );
}
