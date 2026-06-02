export default function DashboardProfilePrompt({ profile, text }) {
  if (profile) return null;

  return (
    <div className="rounded-2xl bg-secondary/50 p-4 text-center">
      <p className="text-sm font-medium">
        {text('Налаштуйте профіль для розрахунку норми КБЖУ', 'Set up your profile to calculate calorie and macro goals')}
      </p>
    </div>
  );
}
