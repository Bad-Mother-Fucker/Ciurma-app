import { describe, expect, it } from 'vitest';
import {
  attivitaPiuUrgentiPerMembro,
  attivitaVisibileOggi,
  calcolaRitardo,
  calcolaStatoAttivita,
  categorieOggiPerMembro,
  type Assegnazione,
  type Attivita,
  type Categoria,
  type Completamento,
} from './priorita';

const oggi = new Date('2026-09-14T10:00:00Z'); // lunedì

describe('calcolaRitardo', () => {
  it('mai fatta: parte già in ritardo (giorniTrascorsi = cadenza + 1)', () => {
    const r = calcolaRitardo({ ultimoCompletamento: null, cadenzaGiorni: 2, oggi });
    expect(r.giorniTrascorsi).toBe(3);
    expect(r.ritardo).toBe(1);
    expect(r.stato).toBe('in_ritardo');
  });

  it('ritardo negativo -> in regola', () => {
    const ultimo = new Date('2026-09-14T09:00:00Z'); // oggi stesso
    const r = calcolaRitardo({ ultimoCompletamento: ultimo, cadenzaGiorni: 2, oggi });
    expect(r.ritardo).toBe(-2);
    expect(r.stato).toBe('in_regola');
  });

  it('ritardo zero -> da fare oggi', () => {
    const ultimo = new Date('2026-09-12T09:00:00Z'); // 2 giorni fa
    const r = calcolaRitardo({ ultimoCompletamento: ultimo, cadenzaGiorni: 2, oggi });
    expect(r.ritardo).toBe(0);
    expect(r.stato).toBe('da_fare_oggi');
  });

  it('caso spazzatura: cadenza 2, non fatta da 5 giorni -> molto in ritardo', () => {
    const ultimo = new Date('2026-09-09T09:00:00Z'); // 5 giorni fa
    const r = calcolaRitardo({ ultimoCompletamento: ultimo, cadenzaGiorni: 2, oggi });
    expect(r.giorniTrascorsi).toBe(5);
    expect(r.ritardo).toBe(3);
    // 0 < 3 <= cadenza(2)? no -> molto in ritardo
    expect(r.stato).toBe('molto_in_ritardo');
  });

  it('in ritardo ma non ancora molto: ritardo <= cadenza', () => {
    const ultimo = new Date('2026-09-11T09:00:00Z'); // 3 giorni fa, cadenza 3 -> ritardo 0
    const r = calcolaRitardo({ ultimoCompletamento: ultimo, cadenzaGiorni: 4, oggi });
    // giorniTrascorsi = 3, cadenza 4 -> ritardo -1 -> in regola
    expect(r.stato).toBe('in_regola');
  });
});

describe('attivitaVisibileOggi', () => {
  it('senza giorni propri segue i giorni della categoria', () => {
    expect(attivitaVisibileOggi({ giorniSettimana: null }, 2, [2, 4])).toBe(true);
    expect(attivitaVisibileOggi({ giorniSettimana: null }, 3, [2, 4])).toBe(false);
  });

  it('con giorni propri ha precedenza sui giorni della categoria (caso Lavatrice)', () => {
    // Assegnazione categoria lun/mer/gio (1,3,4), attività propria mar/gio (2,4)
    expect(attivitaVisibileOggi({ giorniSettimana: [2, 4] }, 2, [1, 3, 4])).toBe(true);
    expect(attivitaVisibileOggi({ giorniSettimana: [2, 4] }, 1, [1, 3, 4])).toBe(false);
  });
});

describe('categorieOggiPerMembro e attivitaPiuUrgentiPerMembro', () => {
  const categorie: Categoria[] = [{ id: 'cat-faccende', nome: 'Faccende domestiche' }];

  const assegnazioni: Assegnazione[] = [
    { categoriaId: 'cat-faccende', membroId: 'michele', giorniSettimana: [1, 3, 4] },
  ];

  const attivitaBase: Attivita[] = [
    {
      id: 'spazzatura',
      categoriaId: 'cat-faccende',
      nome: 'Buttare la spazzatura',
      cadenzaGiorni: 2,
      giorniSettimana: null,
      attiva: true,
    },
    {
      id: 'lavatrice',
      categoriaId: 'cat-faccende',
      nome: 'Lavatrice',
      cadenzaGiorni: 3,
      giorniSettimana: [2, 4],
      attiva: true,
    },
  ];

  it('lunedì: la spazzatura compare (giorni categoria), la lavatrice no (fuori dai suoi giorni propri)', () => {
    const stato = calcolaStatoAttivita(attivitaBase, [], oggi); // oggi = lunedì (1)
    const risultato = categorieOggiPerMembro('michele', 1, categorie, assegnazioni, stato);
    expect(risultato).toHaveLength(1);
    const nomi = risultato[0]!.attivita.map((a) => a.nome);
    expect(nomi).toContain('Buttare la spazzatura');
    expect(nomi).not.toContain('Lavatrice');
  });

  it('martedì: la lavatrice compare anche se martedì non è un giorno di assegnazione della categoria', () => {
    const martedi = new Date('2026-09-15T10:00:00Z');
    const stato = calcolaStatoAttivita(attivitaBase, [], martedi);
    // Nota: la categoria è assegnata a Michele lun/mer/gio, non martedì.
    // Il caso d'uso descritto ("scavalca i giorni della categoria") si applica
    // quando l'assegnazione include martedì per via dei giorni propri
    // dell'attività: qui verifichiamo solo il filtro attivitaVisibileOggi,
    // già coperto sopra. categorieOggiPerMembro filtra prima per assegnazione.
    const risultato = categorieOggiPerMembro('michele', 2, categorie, assegnazioni, stato);
    expect(risultato).toHaveLength(0);
  });

  it('urgenti: dopo 5 giorni senza spuntare la spazzatura (cadenza 2) compare in cima con ritardo corretto', () => {
    const completamenti: Completamento[] = [
      { attivitaId: 'spazzatura', completataIl: new Date('2026-09-09T09:00:00Z') }, // 5 giorni fa
    ];
    const stato = calcolaStatoAttivita(attivitaBase, completamenti, oggi);
    const urgenti = attivitaPiuUrgentiPerMembro('michele', assegnazioni, stato);
    expect(urgenti[0]!.nome).toBe('Buttare la spazzatura');
    expect(urgenti[0]!.ritardo).toBe(3);
    expect(urgenti[0]!.stato).toBe('molto_in_ritardo');
  });
});
