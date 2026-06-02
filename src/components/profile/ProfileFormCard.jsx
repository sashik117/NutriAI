import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  activityLabelsEn,
  activityLabelsUk,
  goalHintsEn,
  goalHintsUk,
  goalLabelsEn,
  goalLabelsUk,
  personalityLabelsEn,
  personalityLabelsUk,
} from './profileOptions';

function LanguageSelector({ language, setLanguage, text }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{text('Мова', 'Language')}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant={language === 'uk' ? 'default' : 'outline'} className="rounded-xl" onClick={() => setLanguage('uk')}>
          Українська
        </Button>
        <Button type="button" variant={language === 'en' ? 'default' : 'outline'} className="rounded-xl" onClick={() => setLanguage('en')}>
          English
        </Button>
      </div>
    </div>
  );
}

function GenderSelector({ form, update, text }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{text('Стать', 'Gender')}</Label>
      <div className="grid grid-cols-2 gap-2">
        {['male', 'female'].map((gender) => (
          <Button key={gender} variant={form.gender === gender ? 'default' : 'outline'} className="rounded-xl" onClick={() => update('gender', gender)}>
            {gender === 'male' ? text('Чоловік', 'Male') : text('Жінка', 'Female')}
          </Button>
        ))}
      </div>
    </div>
  );
}

function BodyMetricsGrid({ form, update, text }) {
  const fields = [
    ['age', text('Вік', 'Age'), '25'],
    ['height', text('Зріст, см', 'Height, cm'), '170'],
    ['weight', text('Поточна вага, кг', 'Current weight, kg'), '70.5'],
    ['target_weight', text('Цільова вага, кг', 'Target weight, kg'), '65'],
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map(([key, label, placeholder]) => (
        <div key={key} className="space-y-1.5">
          <Label className="text-xs font-semibold">{label}</Label>
          <Input
            inputMode="decimal"
            value={form[key]}
            aria-label={label}
            placeholder={placeholder}
            onChange={(event) => update(key, event.target.value.replace(',', '.'))}
            className="rounded-xl"
          />
        </div>
      ))}
    </div>
  );
}

function ActivitySelector({ activityLabels, form, update, text }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{text('Рівень активності', 'Activity level')}</Label>
      <Select value={form.activity_level} onValueChange={(value) => update('activity_level', value)}>
        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(activityLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function GoalSummary({ calculated, goalHints, goalLabels, isEnglish, targetWeight, text, weight }) {
  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3">
      <Label className="text-xs font-semibold">{text('Ціль визначається автоматично', 'Goal is calculated automatically')}</Label>
      <p className="mt-1 text-lg font-extrabold text-primary">{goalLabels[calculated.goal]}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isEnglish
          ? `${weight} kg now -> ${targetWeight} kg target. ${goalHints[calculated.goal]}`
          : `${weight} кг зараз -> ${targetWeight} кг ціль. ${goalHints[calculated.goal]}`}
      </p>
    </div>
  );
}

function PersonalitySelector({ form, personalityLabels, update, text }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{text('Характер ШІ', 'AI personality')}</Label>
      <Select value={form.ai_personality} onValueChange={(value) => update('ai_personality', value)}>
        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(personalityLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function ProfileFormCard({ calculated, form, isEnglish, language, setLanguage, targetWeight, text, update, weight }) {
  const activityLabels = isEnglish ? activityLabelsEn : activityLabelsUk;
  const goalLabels = isEnglish ? goalLabelsEn : goalLabelsUk;
  const goalHints = isEnglish ? goalHintsEn : goalHintsUk;
  const personalityLabels = isEnglish ? personalityLabelsEn : personalityLabelsUk;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <LanguageSelector language={language} setLanguage={setLanguage} text={text} />
        <GenderSelector form={form} update={update} text={text} />
        <BodyMetricsGrid form={form} update={update} text={text} />
        <ActivitySelector activityLabels={activityLabels} form={form} update={update} text={text} />
        <GoalSummary calculated={calculated} goalHints={goalHints} goalLabels={goalLabels} isEnglish={isEnglish} targetWeight={targetWeight} text={text} weight={weight} />
        <PersonalitySelector form={form} personalityLabels={personalityLabels} update={update} text={text} />
      </CardContent>
    </Card>
  );
}
