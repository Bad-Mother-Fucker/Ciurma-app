import { describe, expect, it } from 'vitest';
import { formattaRitardo } from './formattaRitardo';

describe('formattaRitardo', () => {
  it('0 giorni', () => {
    expect(formattaRitardo(0)).toBe('0 giorni');
  });

  it('singolare per 1 giorno', () => {
    expect(formattaRitardo(1)).toBe('1 giorno');
  });

  it('plurale per pochi giorni', () => {
    expect(formattaRitardo(3)).toBe('3 giorni');
    expect(formattaRitardo(6)).toBe('6 giorni');
  });

  it('una settimana tra 7 e 13 giorni', () => {
    expect(formattaRitardo(7)).toBe('1 settimana');
    expect(formattaRitardo(10)).toBe('1 settimana');
    expect(formattaRitardo(13)).toBe('1 settimana');
  });

  it('più settimane tra 14 e 30 giorni', () => {
    expect(formattaRitardo(14)).toBe('2 settimane');
    expect(formattaRitardo(21)).toBe('3 settimane');
  });

  it('oltre un mese oltre i 30 giorni', () => {
    expect(formattaRitardo(31)).toBe('oltre un mese');
    expect(formattaRitardo(90)).toBe('oltre un mese');
  });
});
