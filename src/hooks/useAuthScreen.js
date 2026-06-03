import { useState } from 'react';
import { toast } from 'sonner';
import {
  sanitizeNickname,
  sanitizeVerificationCode,
  validateLogin,
  validateRegistration,
  validateVerificationCode,
} from '@/domain/auth/authModel';
import { useAuth } from '@/lib/AuthContext';

export function useAuthScreen() {
  const { login, register, requestRegistrationCode } = useAuth();
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState('form');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('user');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCodeValue] = useState('');
  const [devCode, setDevCode] = useState('');
  const [loading, setLoading] = useState(false);

  const setCode = (value) => setCodeValue(sanitizeVerificationCode(value));
  const setCleanNickname = (value) => setNickname(sanitizeNickname(value));

  const submitLogin = async (event) => {
    event.preventDefault();
    const validation = validateLogin({ identifier, password });
    if (validation) {
      toast.error(validation);
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
    const validation = validateRegistration({ nickname, email, password, confirmPassword });
    if (validation) {
      toast.error(validation);
      return;
    }

    setLoading(true);
    try {
      const result = await requestRegistrationCode({ email, nickname, password, role });
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
    const validation = validateVerificationCode(code);
    if (validation) {
      toast.error(validation);
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
    setCodeValue('');
    setDevCode('');
    setRole('user');
  };

  return {
    mode,
    step,
    identifier,
    setIdentifier,
    email,
    setEmail,
    nickname,
    setNickname: setCleanNickname,
    role,
    setRole,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    code,
    setCode,
    devCode,
    loading,
    submitLogin,
    requestCode,
    verifyCode,
    switchMode,
    setStep,
  };
}
