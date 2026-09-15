/** Traduce un errore Supabase/di rete in un messaggio comprensibile. */
export function messaggioErroreGenerico(e: unknown, azione: string): string {
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
    if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
      return 'Sembra che manchi la connessione. Controlla la rete e riprova.';
    }
  }
  return `Non sono riuscito a ${azione}. Riprova tra poco.`;
}
