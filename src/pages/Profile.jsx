import { Button } from '@/components/ui/button';
import { Loader2, LogOut } from 'lucide-react';
import ActivityHeatmap from '../components/dashboard/ActivityHeatmap';
import ProfileDailyGoalCard from '@/components/profile/ProfileDailyGoalCard';
import ProfileFormCard from '@/components/profile/ProfileFormCard';
import ProfileHeader from '@/components/profile/ProfileHeader';
import { useProfilePage } from '@/hooks/useProfilePage';

export default function Profile() {
  const {
    language,
    isEnglish,
    setLanguage,
    text,
    form,
    update,
    calculated,
    profileMeta,
    allFoodLogs,
    weight,
    targetWeight,
    isLoading,
    logoutProfile,
  } = useProfilePage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center pt-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8 pt-6">
      <ProfileHeader profileMeta={profileMeta} text={text} />
      <ProfileFormCard
        calculated={calculated}
        form={form}
        isEnglish={isEnglish}
        language={language}
        setLanguage={setLanguage}
        targetWeight={targetWeight}
        text={text}
        update={update}
        weight={weight}
      />
      <ProfileDailyGoalCard calculated={calculated} text={text} />

      <ActivityHeatmap foodLogs={allFoodLogs} caloriesGoal={calculated.calories} />

      <Button variant="ghost" className="w-full text-muted-foreground" onClick={logoutProfile}>
        <LogOut className="mr-2 h-4 w-4" /> {text('Вийти', 'Log out')}
      </Button>
    </div>
  );
}
