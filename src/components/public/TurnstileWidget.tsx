"use client";

import { Turnstile } from "@marsidev/react-turnstile";

/**
 * Cloudflare Turnstile CAPTCHA widget for public forms.
 *
 * Renders the invisible/managed Turnstile challenge when the site key
 * is configured (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`). Renders nothing if
 * the key is missing, allowing graceful degradation.
 *
 * @param onSuccess - Called with the verification token on success.
 * @param onError   - Called when the challenge fails.
 * @param onExpire  - Called when the token expires (user should re-verify).
 */
interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export function TurnstileWidget({ onSuccess, onError, onExpire }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // No site key configured — render nothing; server-side will skip verification.
  if (!siteKey) return null;

  return (
    <Turnstile
      siteKey={siteKey}
      onSuccess={onSuccess}
      onError={onError}
      onExpire={onExpire}
      options={{
        theme: "light",
        size: "flexible",
      }}
    />
  );
}
