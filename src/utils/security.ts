// Security utilities for client-side protection

/**
 * Sanitize user input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/script/gi, '') // Remove script tags
    .trim();
};

/**
 * Validate email format with security considerations
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email) && 
         email.length <= 254 && 
         !email.includes('..') &&
         !email.includes('<') &&
         !email.includes('>');
};

/**
 * Check for potential SQL injection patterns
 */
export const containsSQLInjection = (input: string): boolean => {
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(--|\|\||\/\*|\*\/)/g,
    /(\bor\b.*\b=\b.*\bor\b)/gi,
    /(\band\b.*\b=\b.*\band\b)/gi
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

/**
 * Validate password strength
 */
export const isStrongPassword = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }
  
  return { isValid: true, message: 'Password is strong' };
};

/**
 * Generate secure session token
 */
export const generateSecureToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Rate limiting utility
 */
export const checkRateLimit = (key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const attempts = JSON.parse(localStorage.getItem(`rate_limit_${key}`) || '[]');
  
  // Remove attempts outside the window
  const validAttempts = attempts.filter((timestamp: number) => now - timestamp < windowMs);
  
  if (validAttempts.length >= maxAttempts) {
    return false; // Rate limit exceeded
  }
  
  // Add current attempt
  validAttempts.push(now);
  localStorage.setItem(`rate_limit_${key}`, JSON.stringify(validAttempts));
  
  return true; // Within rate limit
};

/**
 * Clear sensitive data from localStorage on logout
 */
export const clearSensitiveData = (): void => {
  const keysToRemove = Object.keys(localStorage).filter(key => 
    key.includes('rate_limit_') || 
    key.includes('signin_') || 
    key.includes('signup_') ||
    key.includes('temp_')
  );
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

/**
 * Content Security Policy headers for enhanced security
 */
export const getSecurityHeaders = () => ({
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
});