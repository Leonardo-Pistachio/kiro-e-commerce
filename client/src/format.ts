const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatPrice(cents: number): string {
  return usd.format(cents / 100);
}

export function formatDollars(dollars: number): string {
  return usd.format(dollars);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' });
}

/** Only allows same-site relative paths, to avoid open redirects via ?next=. */
export function safeNextPath(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/';
}
