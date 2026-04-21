import { ValidationError } from "./errors";

export const USER_ROLES = ["admin", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function requireValidEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized || !EMAIL_PATTERN.test(normalized)) {
    throw new ValidationError("Enter a valid email address");
  }
  return normalized;
}

export function requireValidName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new ValidationError("Name is required");
  }
  if (trimmed.length > 200) {
    throw new ValidationError("Name must be 200 characters or fewer");
  }
  return trimmed;
}

export function requireValidPassword(password: string) {
  if (password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters");
  }
  return password;
}
