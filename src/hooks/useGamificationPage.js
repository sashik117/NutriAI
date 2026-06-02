import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { generatePersonalChallenge } from '@/services/challengeService';
import {
  achievementRepository,
  foodLogRepository,
  userProfileRepository,
  waterLogRepository,
  weightLogRepository,
} from '@/services/repositories';
import { getBadgesToUnlock, getBestStreak, getStreak, translateBadge } from '@/domain/gamification/gamificationModel';

export function useGamificationPage({ isEnglish, text }) {
  const [generatingChallenge, setGeneratingChallenge] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [freezeCount, setFreezeCount] = useState(() => Number(localStorage.getItem('kbju_streak_freeze') || '1'));

  const { data: profiles } = useQuery({ queryKey: ['userProfile'], queryFn: () => userProfileRepository.list(), initialData: [] });
  const { data: foodLogs } = useQuery({ queryKey: ['allFoodLogsGamif'], queryFn: () => foodLogRepository.list('-date', 300), initialData: [] });
  const { data: waterLogs } = useQuery({ queryKey: ['allWaterLogsGamif'], queryFn: () => waterLogRepository.list('-date', 120), initialData: [] });
  const { data: weightLogs } = useQuery({ queryKey: ['weightLogs'], queryFn: () => weightLogRepository.list('-date', 80), initialData: [] });
  const { data: achievements, refetch: refetchAchievements } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => achievementRepository.list(),
    initialData: [],
  });

  const profile = profiles[0];
  const today = format(new Date(), 'yyyy-MM-dd');
  const streak = useMemo(() => getStreak(foodLogs), [foodLogs]);
  const bestStreak = useMemo(() => getBestStreak(foodLogs), [foodLogs]);

  useEffect(() => {
    const toUnlock = getBadgesToUnlock({ achievements, foodLogs, waterLogs, weightLogs, profile, streak });
    if (!toUnlock.length) return;

    Promise.all(
      toUnlock.map((badge) =>
        achievementRepository.create({
          type: badge.type,
          title: badge.title,
          description: badge.description,
          emoji: badge.emoji,
          unlocked_date: today,
        })
      )
    ).then(() => {
      refetchAchievements();
      toUnlock.forEach((badge) => toast.success(`Нова нагорода: ${badge.emoji} ${badge.title}`));
    });
  }, [achievements, foodLogs, profile, refetchAchievements, streak, today, waterLogs, weightLogs]);

  const generateChallenge = async () => {
    setGeneratingChallenge(true);
    try {
      setChallenge(await generatePersonalChallenge({ profile, streak, isEnglish }));
    } catch (error) {
      toast.error(error.message || text('Не вдалося створити челендж', 'Could not create challenge'));
    } finally {
      setGeneratingChallenge(false);
    }
  };

  const useFreeze = () => {
    if (freezeCount <= 0) return;
    const next = freezeCount - 1;
    setFreezeCount(next);
    localStorage.setItem('kbju_streak_freeze', String(next));
    toast.success(text('Заморозку серії активовано', 'Streak freeze activated'));
  };

  return {
    foodLogs,
    achievements,
    streak,
    bestStreak,
    unlockedTypes: achievements.map((item) => item.type),
    challenge,
    setChallenge,
    generatingChallenge,
    generateChallenge,
    freezeCount,
    useFreeze,
    badgeText: (badge) => translateBadge(badge, isEnglish),
  };
}
