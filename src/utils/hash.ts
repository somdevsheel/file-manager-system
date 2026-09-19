import SHA256 from 'crypto-js/sha256';

/** Salt doesn't need to be secret, just unique per credential — defeats rainbow-table lookups. */
export function generateSalt(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 15)}_${Math.random().toString(36).slice(2, 15)}`;
}

export function hashWithSalt(value: string, salt: string): string {
  return SHA256(`${salt}:${value}`).toString();
}
