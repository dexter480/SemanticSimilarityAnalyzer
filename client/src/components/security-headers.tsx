import { useEffect } from 'react';

export function SecurityHeaders() {
  useEffect(() => {
    // Add client-side security policies
    
    // Prevent clickjacking
    if (window.top !== window.self) {
      window.top?.location.replace(window.self.location.href);
    }

    // Add CSP meta tag
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' data: https:;
      connect-src 'self' https://api.openai.com;
      font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com;
      frame-ancestors 'none';
      base-uri 'self';
      form-action 'self';
    `.replace(/\s+/g, ' ').trim();
    document.head.appendChild(cspMeta);

    // Cleanup
    return () => {
      document.head.removeChild(cspMeta);
    };
  }, []);

  return null;
} 