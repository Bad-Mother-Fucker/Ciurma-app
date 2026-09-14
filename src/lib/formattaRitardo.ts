/** Formatta un numero di giorni di ritardo in italiano corretto. */
export function formattaRitardo(giorni: number): string {
  const g = Math.max(0, Math.round(giorni));

  if (g > 30) return 'oltre un mese';
  if (g >= 14) {
    const settimane = Math.round(g / 7);
    return settimane === 1 ? '1 settimana' : `${settimane} settimane`;
  }
  if (g >= 7) return '1 settimana';
  if (g === 1) return '1 giorno';
  return `${g} giorni`;
}
