export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

/** Demo-only password "hash". NOT cryptographic security — the real backend will replace this. Never store plaintext. */
export function hashPassword(pw: string): string {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) + h + pw.charCodeAt(i)) | 0;
  return `demo$${h.toString(16)}$${pw.length}`;
}
