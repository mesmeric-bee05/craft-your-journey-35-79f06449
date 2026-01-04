/**
 * Shared Password Validation Schema
 * 
 * SECURITY: Standardized password requirements across the application
 * - Minimum 8 characters (OWASP recommendation)
 * - Maximum 72 characters (bcrypt limit)
 * - Clear, actionable error messages
 */

import { z } from 'zod';

// Standard password requirements
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/**
 * Basic password schema - minimum length only
 */
export const passwordSchema = z.string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be under ${PASSWORD_MAX_LENGTH} characters`);

/**
 * Strong password schema - includes complexity requirements
 * Use for registration and password changes
 */
export const strongPasswordSchema = z.string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be under ${PASSWORD_MAX_LENGTH} characters`)
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => /[0-9]/.test(password),
    'Password must contain at least one number'
  );

/**
 * Calculate password strength score (0-4)
 */
export function getPasswordStrength(password: string): {
  score: number;
  label: 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length >= PASSWORD_MIN_LENGTH) {
    score++;
  } else {
    feedback.push(`Add ${PASSWORD_MIN_LENGTH - password.length} more characters`);
  }
  
  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    feedback.push('Add an uppercase letter');
  }
  
  if (/[a-z]/.test(password)) {
    score++;
  } else {
    feedback.push('Add a lowercase letter');
  }
  
  if (/[0-9]/.test(password)) {
    score++;
  } else {
    feedback.push('Add a number');
  }
  
  if (/[^A-Za-z0-9]/.test(password)) {
    score++;
  } else if (score >= 3) {
    feedback.push('Add a special character for extra security');
  }
  
  const labels: Record<number, 'weak' | 'fair' | 'good' | 'strong'> = {
    0: 'weak',
    1: 'weak',
    2: 'fair',
    3: 'good',
    4: 'strong',
  };
  
  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)] || 'weak',
    feedback,
  };
}
