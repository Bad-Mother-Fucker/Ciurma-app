/**
 * Motore delle priorità: deriva lo stato di un'attività dall'ultimo
 * completamento registrato. Non esistono "turni precalcolati".
 */

export type StatoAttivita = 'in_regola' | 'da_fare_oggi' | 'in_ritardo' | 'molto_in_ritardo';

export interface CalcoloRitardoInput {
  /** Data dell'ultimo completamento, o null se l'attività non è mai stata fatta. */
  ultimoCompletamento: Date | null;
  cadenzaGiorni: number;
  oggi: Date;
}

export interface CalcoloRitardoRisultato {
  giorniTrascorsi: number;
  ritardo: number;
  stato: StatoAttivita;
}

function giorniTra(dataInizio: Date, dataFine: Date): number {
  const inizio = Date.UTC(dataInizio.getFullYear(), dataInizio.getMonth(), dataInizio.getDate());
  const fine = Date.UTC(dataFine.getFullYear(), dataFine.getMonth(), dataFine.getDate());
  return Math.round((fine - inizio) / 86_400_000);
}

export function calcolaRitardo({
  ultimoCompletamento,
  cadenzaGiorni,
  oggi,
}: CalcoloRitardoInput): CalcoloRitardoRisultato {
  const giorniTrascorsi = ultimoCompletamento
    ? giorniTra(ultimoCompletamento, oggi)
    : cadenzaGiorni + 1;

  const ritardo = giorniTrascorsi - cadenzaGiorni;

  let stato: StatoAttivita;
  if (ritardo < 0) stato = 'in_regola';
  else if (ritardo === 0) stato = 'da_fare_oggi';
  else if (ritardo <= cadenzaGiorni) stato = 'in_ritardo';
  else stato = 'molto_in_ritardo';

  return { giorniTrascorsi, ritardo, stato };
}

export interface Attivita {
  id: string;
  categoriaId: string;
  nome: string;
  cadenzaGiorni: number;
  giorniSettimana: number[] | null;
  attiva: boolean;
}

export interface Categoria {
  id: string;
  nome: string;
}

export interface Assegnazione {
  categoriaId: string;
  membroId: string;
  giorniSettimana: number[];
}

export interface Completamento {
  attivitaId: string;
  completataIl: Date;
}

/**
 * Un'attività con giorni propri segue solo quelli; altrimenti segue i
 * giorni dell'assegnazione della categoria a cui appartiene (vedi
 * `attivitaVisibileOggi`).
 */
export function attivitaVisibileOggi(
  attivita: Pick<Attivita, 'giorniSettimana'>,
  giornoSettimana: number,
  giorniAssegnazione: number[],
): boolean {
  if (attivita.giorniSettimana !== null) {
    return attivita.giorniSettimana.includes(giornoSettimana);
  }
  return giorniAssegnazione.includes(giornoSettimana);
}

function ultimoCompletamentoDi(attivitaId: string, completamenti: Completamento[]): Date | null {
  let ultimo: Date | null = null;
  for (const c of completamenti) {
    if (c.attivitaId !== attivitaId) continue;
    if (!ultimo || c.completataIl > ultimo) ultimo = c.completataIl;
  }
  return ultimo;
}

export interface AttivitaConStato extends Attivita {
  ultimoCompletamento: Date | null;
  giorniTrascorsi: number;
  ritardo: number;
  stato: StatoAttivita;
}

export function calcolaStatoAttivita(
  attivita: Attivita[],
  completamenti: Completamento[],
  oggi: Date,
): AttivitaConStato[] {
  return attivita.map((a) => {
    const ultimoCompletamento = ultimoCompletamentoDi(a.id, completamenti);
    const { giorniTrascorsi, ritardo, stato } = calcolaRitardo({
      ultimoCompletamento,
      cadenzaGiorni: a.cadenzaGiorni,
      oggi,
    });
    return { ...a, ultimoCompletamento, giorniTrascorsi, ritardo, stato };
  });
}

/**
 * "Oggi tocca a te": categorie assegnate al membro per il giorno corrente,
 * con dentro le sole attività visibili oggi.
 */
export function categorieOggiPerMembro(
  membroId: string,
  giornoSettimana: number,
  categorie: Categoria[],
  assegnazioni: Assegnazione[],
  attivita: AttivitaConStato[],
): Array<{ categoria: Categoria; attivita: AttivitaConStato[] }> {
  const assegnazioniOggi = assegnazioni.filter(
    (asg) => asg.membroId === membroId && asg.giorniSettimana.includes(giornoSettimana),
  );

  return assegnazioniOggi
    .map((asg) => {
      const categoria = categorie.find((c) => c.id === asg.categoriaId);
      if (!categoria) return null;
      const attivitaCategoria = attivita.filter(
        (a) =>
          a.categoriaId === asg.categoriaId &&
          a.attiva &&
          attivitaVisibileOggi(a, giornoSettimana, asg.giorniSettimana),
      );
      return { categoria, attivita: attivitaCategoria };
    })
    .filter((v): v is { categoria: Categoria; attivita: AttivitaConStato[] } => v !== null);
}

/**
 * "Le più urgenti": tra le categorie assegnate al membro (in qualunque
 * giorno), le attività ordinate per ritardo decrescente.
 */
export function attivitaPiuUrgentiPerMembro(
  membroId: string,
  assegnazioni: Assegnazione[],
  attivita: AttivitaConStato[],
  massimo = 5,
): AttivitaConStato[] {
  const categorieDelMembro = new Set(
    assegnazioni.filter((a) => a.membroId === membroId).map((a) => a.categoriaId),
  );

  return attivita
    .filter((a) => a.attiva && categorieDelMembro.has(a.categoriaId) && a.ritardo > 0)
    .sort((a, b) => b.ritardo - a.ritardo)
    .slice(0, massimo);
}
