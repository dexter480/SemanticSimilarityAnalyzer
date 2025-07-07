import { useState, useCallback } from 'react';
import { sanitizeHtml } from '@/lib/security';

export function useSanitizedInput(initialValue: string = '') {
  const [value, setValue] = useState(initialValue);
  const [sanitizedValue, setSanitizedValue] = useState(sanitizeHtml(initialValue));

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    setSanitizedValue(sanitizeHtml(newValue));
  }, []);

  return {
    value,
    sanitizedValue,
    setValue: handleChange,
    reset: () => {
      setValue('');
      setSanitizedValue('');
    }
  };
} 