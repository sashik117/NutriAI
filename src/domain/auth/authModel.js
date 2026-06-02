export const NICKNAME_REGEX = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;

export function sanitizeNickname(value = '') {
  return String(value).replace(/[^A-Za-z0-9_]/g, '');
}

export function sanitizeVerificationCode(value = '') {
  return String(value).replace(/\D/g, '').slice(0, 6);
}

export function validateLogin({ identifier, password }) {
  if (!String(identifier || '').trim() || !password) {
    return 'Введіть нікнейм/пошту і пароль';
  }
  return '';
}

export function validateRegistration({ nickname, email, password, confirmPassword }) {
  if (!NICKNAME_REGEX.test(nickname)) {
    return 'Нікнейм тільки англійською: 3-20 символів, літери/цифри/_';
  }
  if (!String(email || '').trim() || !String(email).includes('@')) {
    return 'Введіть коректну пошту';
  }
  if (String(password || '').length < 6) {
    return 'Пароль має бути мінімум 6 символів';
  }
  if (password !== confirmPassword) {
    return 'Паролі не співпадають';
  }
  return '';
}

export function validateVerificationCode(code) {
  if (!String(code || '').trim()) return 'Введіть код з email';
  return '';
}
