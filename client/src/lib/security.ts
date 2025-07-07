import DOMPurify from 'dompurify';

// Input sanitization
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'br', 'p'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    SAFE_FOR_TEMPLATES: true
  });
}

// API key validation with additional checks
export function validateApiKey(key: string): { valid: boolean; error?: string } {
  if (!key) {
    return { valid: false, error: 'API key is required' };
  }
  
  if (!key.startsWith('sk-')) {
    return { valid: false, error: 'API key must start with "sk-"' };
  }
  
  if (key.length < 40) {
    return { valid: false, error: 'API key appears to be incomplete' };
  }
  
  // Check for common mistakes
  if (key.includes(' ')) {
    return { valid: false, error: 'API key should not contain spaces' };
  }
  
  if (key.includes('\n') || key.includes('\r')) {
    return { valid: false, error: 'API key should not contain line breaks' };
  }
  
  return { valid: true };
}

// Rate limiting for client-side
export class ClientRateLimiter {
  private attempts: number[] = [];
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 10, windowMs: number = 900000) { // 15 minutes
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    
    // Remove old attempts
    this.attempts = this.attempts.filter(time => now - time < this.windowMs);
    
    // Check if under limit
    if (this.attempts.length >= this.maxAttempts) {
      return false;
    }
    
    // Record this attempt
    this.attempts.push(now);
    return true;
  }

  getRemainingAttempts(): number {
    const now = Date.now();
    this.attempts = this.attempts.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxAttempts - this.attempts.length);
  }

  getResetTime(): Date | null {
    if (this.attempts.length === 0) return null;
    
    const oldestAttempt = Math.min(...this.attempts);
    return new Date(oldestAttempt + this.windowMs);
  }
}

// Create global rate limiter instance
export const rateLimiter = new ClientRateLimiter();

// Secure storage wrapper (session only)
export class SecureSessionStorage {
  private static encrypt(text: string): string {
    // Simple obfuscation for session storage (not true encryption)
    return btoa(encodeURIComponent(text));
  }

  private static decrypt(text: string): string {
    try {
      return decodeURIComponent(atob(text));
    } catch {
      return '';
    }
  }

  static setItem(key: string, value: string): void {
    sessionStorage.setItem(key, this.encrypt(value));
  }

  static getItem(key: string): string | null {
    const encrypted = sessionStorage.getItem(key);
    return encrypted ? this.decrypt(encrypted) : null;
  }

  static removeItem(key: string): void {
    sessionStorage.removeItem(key);
  }

  static clear(): void {
    sessionStorage.clear();
  }
} 