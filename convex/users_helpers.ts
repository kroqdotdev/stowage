import { ConvexError } from "convex/values";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireValidEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized || !EMAIL_PATTERN.test(normalized)) {
    throw new ConvexError("Enter a valid email address");
  }
  return normalized;
}

export function requireValidName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new ConvexError("Name is required");
  }
  if (trimmed.length > 200) {
    throw new ConvexError("Name must be 200 characters or fewer");
  }
  return trimmed;
}

export function requireValidPassword(password: string) {
  if (password.length < 8) {
    throw new ConvexError("Password must be at least 8 characters");
  }
  return password;
}
