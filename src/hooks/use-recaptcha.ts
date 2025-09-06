import { useState, useCallback, useEffect } from 'react';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

export function useRecaptcha() {
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  const initializeRecaptcha = useCallback(() => {
    try {
      // Clear existing verifier first
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
        setRecaptchaVerifier(null);
      }

      if (typeof window !== 'undefined') {
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved
          }
        });
        setRecaptchaVerifier(verifier);
        return verifier;
      }
    } catch (error) {
      console.warn('Failed to initialize reCAPTCHA:', error);
    }
    return null;
  }, [recaptchaVerifier]);

  const clearRecaptcha = useCallback(() => {
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
      } catch (error) {
        console.warn('Failed to clear reCAPTCHA:', error);
      }
      setRecaptchaVerifier(null);
    }
  }, [recaptchaVerifier]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (error) {
          console.warn('Failed to clear reCAPTCHA:', error);
        }
      }
    };
  }, [recaptchaVerifier]);

  return {
    recaptchaVerifier,
    initializeRecaptcha,
    clearRecaptcha,
  };
}