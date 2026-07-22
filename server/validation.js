export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeUsername(value) {
  return String(value || '').trim();
}

export function normalizeSearchText(value) {
  const trimmed = String(value || '').trim();
  return trimmed;
}

export function validatePassword(password) {
  if (typeof password !== 'string') {
    return { ok: false, error: 'Password is required.' };
  }
  const trimmed = password.trim();
  if (trimmed.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' };
  }
  if (!/[A-Z]/.test(trimmed) || !/[a-z]/.test(trimmed) || !/[0-9]/.test(trimmed)) {
    return { ok: false, error: 'Password must include upper, lower, and numeric characters.' };
  }
  return { ok: true };
}

export function validateIdentifier(identifier) {
  const value = String(identifier || '').trim();
  if (!value) return { ok: false, error: 'Identifier is required.' };
  if (value.includes('@')) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? { ok: true } : { ok: false, error: 'Please enter a valid email address.' };
  }
  return { ok: true };
}
