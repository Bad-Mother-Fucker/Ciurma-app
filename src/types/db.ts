/**
 * Tipi che rispecchiano db/schema.sql.
 * Scritti a mano: se lo schema cambia vanno aggiornati insieme
 * (in futuro si possono generare con `supabase gen types typescript`).
 */

export type RuoloMembro = 'admin' | 'membro';
export type CategoriaDispensa = 'frigo' | 'freezer' | 'dispensa' | 'casa' | 'farmacia';
export type TipoConteggio = 'countable' | 'uncountable';

export interface Casa {
  id: string;
  nome: string;
  creata_il: string;
}

export interface Membro {
  id: string;
  casa_id: string;
  utente_id: string;
  nome: string;
  colore: string;
  ruolo: RuoloMembro;
  attivo: boolean;
  creato_il: string;
}

export interface Invito {
  id: string;
  casa_id: string;
  token: string;
  creato_da: string;
  creato_il: string;
  scade_il: string;
  usato_il: string | null;
  usato_da: string | null;
}

export interface CategoriaAttivita {
  id: string;
  casa_id: string;
  nome: string;
  icona: string;
  colore: string;
  archiviata: boolean;
  ordine: number;
  creata_il: string;
}

export interface AttivitaRow {
  id: string;
  casa_id: string;
  categoria_id: string;
  nome: string;
  cadenza_giorni: number;
  giorni_settimana: number[] | null;
  attiva: boolean;
  ordine: number;
  creata_il: string;
}

export interface AssegnazioneRow {
  id: string;
  casa_id: string;
  categoria_id: string;
  membro_id: string;
  giorni_settimana: number[];
  creata_il: string;
}

export interface CompletamentoRow {
  id: string;
  casa_id: string;
  attivita_id: string;
  membro_id: string;
  completata_il: string;
  nota: string | null;
}

export interface Prodotto {
  id: string;
  casa_id: string;
  nome: string;
  categoria_dispensa: CategoriaDispensa;
  tipo_conteggio: TipoConteggio;
  unita: string | null;
  quantita: number;
  scorta_minima: number;
  scadenza: string | null;
  aggiornato_il: string;
  creato_il: string;
}

export interface VoceSpesa {
  id: string;
  casa_id: string;
  prodotto_id: string | null;
  nome: string;
  quantita_desiderata: number | null;
  unita: string | null;
  aggiunta_da: string;
  presa_il: string | null;
  presa_da: string | null;
  creata_il: string;
}
