export const GIORNI: Array<{ valore: number; lettera: string; nomeCompleto: string }> = [
  { valore: 1, lettera: 'L', nomeCompleto: 'Lunedì' },
  { valore: 2, lettera: 'M', nomeCompleto: 'Martedì' },
  { valore: 3, lettera: 'M', nomeCompleto: 'Mercoledì' },
  { valore: 4, lettera: 'G', nomeCompleto: 'Giovedì' },
  { valore: 5, lettera: 'V', nomeCompleto: 'Venerdì' },
  { valore: 6, lettera: 'S', nomeCompleto: 'Sabato' },
  { valore: 0, lettera: 'D', nomeCompleto: 'Domenica' },
];

export function etichettaGiorno(giorno: number): string {
  return GIORNI.find((g) => g.valore === giorno)?.lettera ?? '?';
}

export function etichettaGiorniCompatta(giorni: number[]): string {
  return [...giorni]
    .sort((a, b) => a - b)
    .map(etichettaGiorno)
    .join('');
}
