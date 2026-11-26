export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const JOIN_CODE_PATTERN = /^([A-Z0-9]{6}|[A-Z]{2,5}-[0-9]{3,4})$/;

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) {
    return { valid: false, error: 'Email address is required.' };
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return { valid: false, error: 'Enter a valid institutional or personal email address.' };
  }
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long.' };
  }
  return { valid: true };
}

export function validateFullName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: 'Full name is required.' };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: 'Please enter at least 2 characters for your name.' };
  }
  if (trimmed.length > 80) {
    return { valid: false, error: 'Name must be 80 characters or fewer.' };
  }
  return { valid: true };
}

export function normalizeTestCode(rawCode: string): string {
  return rawCode.trim().toUpperCase().replace(/\s+/g, '');
}

export function validateTestJoinCode(rawCode: string): ValidationResult {
  const code = normalizeTestCode(rawCode);
  if (!code) {
    return { valid: false, error: 'Enter a 6-character test join code.' };
  }
  if (!JOIN_CODE_PATTERN.test(code)) {
    return { valid: false, error: 'Enter a valid 6-character join code (e.g. KX7M2P).' };
  }
  return { valid: true };
}

export function validateDraftTestInput(input: {
  title: string;
  subject: string;
  durationMinutes: number;
  totalMarks: number;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.title.trim() || input.title.trim().length < 4) {
    errors.title = 'Enter a descriptive test title (at least 4 characters).';
  }
  if (!input.subject.trim()) {
    errors.subject = 'Subject or course name is required.';
  }
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes < 10 || input.durationMinutes > 360) {
    errors.durationMinutes = 'Duration must be between 10 and 360 minutes.';
  }
  if (!Number.isFinite(input.totalMarks) || input.totalMarks < 5 || input.totalMarks > 500) {
    errors.totalMarks = 'Total marks must be between 5 and 500.';
  }
  return errors;
}
