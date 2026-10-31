/**
 * The address to go to after sign-up, for another app sharing these accounts. Only origins listed
 * in `allowedOrigins` (comma-separated), so a link can't send people to a foreign site.
 */
export function safeReturnTo(value: unknown, allowedOrigins: string | undefined): string | null {
  if (typeof value !== 'string' || !URL.canParse(value)) return null
  const url = new URL(value)
  const allowed = (allowedOrigins ?? '').split(',').map((origin) => origin.trim())
  return allowed.includes(url.origin) ? url.href : null
}
