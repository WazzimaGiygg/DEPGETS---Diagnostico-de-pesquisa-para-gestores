import { CollaboratorRecord } from '../types';

export function generateWebUid(existingUids: string[] = []): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let candidate = '';
  do {
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    candidate = `WEB-COL-${suffix}`;
  } while (existingUids.includes(candidate));
  return candidate;
}

export function generateSafeDocId(prefix: string): string {
  const randomPart = Math.random().toString(36).substring(2, 9);
  const timePart = Date.now().toString(36);
  return `${prefix}-${timePart}-${randomPart}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function formatPhoneBR(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function isDuplicateEmail(
  email: string,
  collaborators: CollaboratorRecord[],
  ignoreCollaboratorId?: string
): boolean {
  const target = normalizeEmail(email);
  if (!target) return false;
  return collaborators.some(
    (c) => c.id !== ignoreCollaboratorId && normalizeEmail(c.email) === target
  );
}

export function isDuplicatePhone(
  phone: string,
  collaborators: CollaboratorRecord[],
  ignoreCollaboratorId?: string
): boolean {
  const target = normalizePhone(phone);
  if (target.length < 8) return false;
  return collaborators.some(
    (c) => c.id !== ignoreCollaboratorId && normalizePhone(c.phone) === target
  );
}

export function calculateAgeFromBirthDate(birthDate: string): number {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export interface PasswordStrengthResult {
  score: number; // 0 to 5
  isValid: boolean;
  label: 'Muito Fraca' | 'Fraca' | 'Média' | 'Forte' | 'Muito Forte';
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  const isValid = checks.minLength && checks.hasUpper && checks.hasLower && checks.hasNumber && checks.hasSpecial;

  const labels: Record<number, PasswordStrengthResult['label']> = {
    0: 'Muito Fraca',
    1: 'Muito Fraca',
    2: 'Fraca',
    3: 'Média',
    4: 'Forte',
    5: 'Muito Forte',
  };

  return {
    score,
    isValid,
    label: labels[score] || 'Muito Fraca',
    checks,
  };
}

export interface BrowserCompatibilityInfo {
  isChrome: boolean;
  browserName: string;
  version: string;
  isUpToDateChrome: boolean;
  deviceCategory: 'Mobile' | 'Tablet' | 'Desktop';
}

export function detectBrowserCompatibility(): BrowserCompatibilityInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isChrome: true,
      browserName: 'Google Chrome',
      version: '128+',
      isUpToDateChrome: true,
      deviceCategory: 'Desktop',
    };
  }

  const ua = navigator.userAgent;
  const isEdge = /Edg\/(\d+)/.test(ua);
  const isOpera = /OPR\/(\d+)/.test(ua);
  const isFirefox = /Firefox\/(\d+)/.test(ua);
  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  const isChrome = Boolean(chromeMatch) && !isEdge && !isOpera;
  const version = chromeMatch ? chromeMatch[1] : isFirefox ? 'Firefox' : 'Outro';
  const majorVersion = chromeMatch ? parseInt(chromeMatch[1], 10) : 0;

  let browserName = 'Navegador Externo';
  if (isChrome) browserName = 'Google Chrome';
  else if (isEdge) browserName = 'Microsoft Edge';
  else if (isOpera) browserName = 'Opera';
  else if (isFirefox) browserName = 'Mozilla Firefox';
  else if (/Safari/.test(ua)) browserName = 'Apple Safari';

  const width = window.innerWidth;
  let deviceCategory: 'Mobile' | 'Tablet' | 'Desktop' = 'Desktop';
  if (width < 768 || /Mobi|Android.*Mobile|iPhone/i.test(ua)) {
    deviceCategory = 'Mobile';
  } else if (width < 1024 || /iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) {
    deviceCategory = 'Tablet';
  }

  return {
    isChrome,
    browserName,
    version,
    isUpToDateChrome: isChrome && majorVersion >= 115,
    deviceCategory,
  };
}
