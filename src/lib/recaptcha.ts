// reCAPTCHA Enterprise helper
export const RECAPTCHA_SITE_KEY = "6LfcVM4sAAAAAP_7448Ck-BEc9nsCji5PJG0_fsd";

declare global {
  interface Window {
    grecaptcha?: {
      enterprise: {
        ready: (cb: () => void) => void;
        execute: (siteKey: string, opts: { action: string }) => Promise<string>;
      };
    };
  }
}

/**
 * Execute reCAPTCHA Enterprise for a given action and return the token.
 * Resolves to null if reCAPTCHA failed to load (non-blocking).
 */
export function executeRecaptcha(action: string): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const tryRun = (attemptsLeft: number) => {
      const g = window.grecaptcha;
      if (g?.enterprise?.ready) {
        g.enterprise.ready(async () => {
          try {
            const token = await g.enterprise.execute(RECAPTCHA_SITE_KEY, { action });
            resolve(token);
          } catch (err) {
            console.warn("[recaptcha] execute failed", err);
            resolve(null);
          }
        });
      } else if (attemptsLeft > 0) {
        setTimeout(() => tryRun(attemptsLeft - 1), 200);
      } else {
        console.warn("[recaptcha] not loaded");
        resolve(null);
      }
    };
    tryRun(25); // ~5s
  });
}
