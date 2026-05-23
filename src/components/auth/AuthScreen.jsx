import { useState } from 'react';
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const nicknameRegex = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;

function PasswordInput({ value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-11 rounded-xl pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function AuthScreen() {
  const { login, register, requestRegistrationCode } = useAuth();
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState('form');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [loading, setLoading] = useState(false);

  const submitLogin = async (event) => {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error('Введіть нікнейм/пошту і пароль');
      return;
    }

    setLoading(true);
    try {
      await login({ identifier, password });
      toast.success('Вхід виконано');
    } catch (error) {
      toast.error(error.message || 'Не вдалося увійти');
    } finally {
      setLoading(false);
    }
  };

  const requestCode = async (event) => {
    event.preventDefault();
    if (!nicknameRegex.test(nickname)) {
      toast.error('Нікнейм тільки англійською: 3-20 символів, літери/цифри/_');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Введіть коректну пошту');
      return;
    }
    if (password.length < 6) {
      toast.error('Пароль має бути мінімум 6 символів');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Паролі не співпадають');
      return;
    }

    setLoading(true);
    try {
      const result = await requestRegistrationCode({ email, nickname, password });
      setDevCode(result.dev_code || '');
      setStep('code');
      toast.success('Код підтвердження створено');
    } catch (error) {
      toast.error(error.message || 'Не вдалося створити код');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    if (!code.trim()) {
      toast.error('Введіть код з email');
      return;
    }
    setLoading(true);
    try {
      await register({ email, code });
      toast.success('Email підтверджено. Ви увійшли.');
    } catch (error) {
      toast.error(error.message || 'Невірний код');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setStep('form');
    setPassword('');
    setConfirmPassword('');
    setCode('');
    setDevCode('');
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-[390px] space-y-6">
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold">NutriAI</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Створіть акаунт або увійдіть, щоб усі дані зберігалися окремо для вас.
          </p>
        </div>

        <div className="grid grid-cols-2 rounded-2xl bg-muted p-1">
          <button type="button" onClick={() => switchMode('login')} className={`rounded-xl py-2 text-sm font-bold transition ${mode === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            Увійти
          </button>
          <button type="button" onClick={() => switchMode('register')} className={`rounded-xl py-2 text-sm font-bold transition ${mode === 'register' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            Реєстрація
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={submitLogin} className="space-y-4 rounded-3xl border border-border bg-card p-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Нікнейм або пошта</Label>
              <Input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="nickname або you@example.com" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Пароль</Label>
              <PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ваш пароль" />
            </div>
            <Button type="submit" className="h-12 w-full rounded-xl" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Увійти
            </Button>
          </form>
        ) : step === 'code' ? (
          <form onSubmit={verifyCode} className="space-y-4 rounded-3xl border border-border bg-card p-5">
            <div>
              <h2 className="text-lg font-extrabold">Підтвердіть email</h2>
              <p className="mt-1 text-sm text-muted-foreground">Введіть 6-значний код для {email}.</p>
              {devCode && (
                <p className="mt-2 rounded-xl bg-muted p-2 text-xs text-muted-foreground">
                  Dev-код для локального запуску: <span className="font-bold text-foreground">{devCode}</span>
                </p>
              )}
            </div>
            <Input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="h-12 rounded-xl text-center text-xl font-extrabold tracking-[0.4em]" />
            <Button type="submit" className="h-12 w-full rounded-xl" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Підтвердити і увійти
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('form')}>
              Змінити дані
            </Button>
          </form>
        ) : (
          <form onSubmit={requestCode} className="space-y-4 rounded-3xl border border-border bg-card p-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Нікнейм англійською</Label>
              <Input value={nickname} onChange={(event) => setNickname(event.target.value.replace(/[^A-Za-z0-9_]/g, ''))} placeholder="SahaFit" className="h-11 rounded-xl" />
              <p className="text-[10px] text-muted-foreground">Тільки A-Z, a-z, цифри або _, 3-20 символів.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Пошта</Label>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Пароль</Label>
              <PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Мінімум 6 символів" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Підтвердження паролю</Label>
              <PasswordInput value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Повторіть пароль" />
            </div>
            <Button type="submit" className="h-12 w-full rounded-xl" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Отримати код
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
