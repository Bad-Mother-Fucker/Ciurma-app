import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import {
  useAssegnazioni,
  useAttivita,
  useCategorie,
  useCompletamenti,
  useProdottiSottoScorta,
  useVociSpesaAperte,
} from '../lib/casaData';
import { formattaRitardo } from '../lib/formattaRitardo';
import {
  attivitaPiuUrgentiPerMembro,
  calcolaStatoAttivita,
  categorieOggiPerMembro,
  type Assegnazione,
  type Attivita,
  type Completamento,
} from '../lib/priorita';
import { supabase } from '../lib/supabase';
import type { AssegnazioneRow, AttivitaRow, CompletamentoRow } from '../types/db';

function versoAttivita(a: AttivitaRow): Attivita {
  return {
    id: a.id,
    categoriaId: a.categoria_id,
    nome: a.nome,
    cadenzaGiorni: a.cadenza_giorni,
    giorniSettimana: a.giorni_settimana,
    attiva: a.attiva,
  };
}

function versoAssegnazione(a: AssegnazioneRow): Assegnazione {
  return { categoriaId: a.categoria_id, membroId: a.membro_id, giorniSettimana: a.giorni_settimana };
}

function versoCompletamento(c: CompletamentoRow): Completamento {
  return { attivitaId: c.attivita_id, completataIl: new Date(c.completata_il) };
}

/**
 * Testo narrativo generico e grammaticalmente corretto in ogni caso.
 * Frasi su misura per singola attività (es. "non si cambiano le lenzuola
 * da 2 settimane") sono un affinamento futuro, non ancora implementato:
 * vedi PIANO.md.
 */
function testoUrgente(nome: string, ritardo: number): string {
  return `Da ${formattaRitardo(ritardo)} non tocchi: ${nome}`;
}

export function Oggi() {
  const { membro } = useAuth();
  const casaId = membro?.casa_id;
  const oggi = new Date();
  const giornoSettimana = oggi.getDay();
  const queryClient = useQueryClient();

  const { data: categorie = [], isLoading: c1 } = useCategorie(casaId);
  const { data: attivitaRows = [], isLoading: c2 } = useAttivita(casaId);
  const { data: assegnazioniRows = [], isLoading: c3 } = useAssegnazioni(casaId);
  const { data: completamentiRows = [], isLoading: c4 } = useCompletamenti(casaId);
  const { data: sottoScorta = [] } = useProdottiSottoScorta(casaId);
  const { data: vociAperte = [] } = useVociSpesaAperte(casaId);

  const caricamento = c1 || c2 || c3 || c4;

  const spunta = useMutation({
    mutationFn: async (attivitaId: string) => {
      const { error } = await supabase
        .from('completamento')
        .insert({ casa_id: casaId, attivita_id: attivitaId, membro_id: membro!.id });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['completamenti', casaId] }),
  });

  if (caricamento || !membro) {
    return <p className="p-6 text-15 text-fondale/60">Carico la tua giornata…</p>;
  }

  const attivita = versoAttivitaLista(attivitaRows);
  const assegnazioni = assegnazioniRows.map(versoAssegnazione);
  const completamenti = completamentiRows.map(versoCompletamento);
  const attivitaConStato = calcolaStatoAttivita(attivita, completamenti, oggi);

  const categorieOggi = categorieOggiPerMembro(
    membro.id,
    giornoSettimana,
    categorie,
    assegnazioni,
    attivitaConStato,
  );
  const urgenti = attivitaPiuUrgentiPerMembro(membro.id, assegnazioni, attivitaConStato);

  const totaleAttivitaOggi = categorieOggi.reduce((n, c) => n + c.attivita.length, 0);

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-24 font-semibold">Ciao {membro.nome}</h1>
        <Link to="/impostazioni" className="touch-target flex items-center justify-center text-15 text-fondale/60">
          Impostazioni
        </Link>
      </div>

      <section className="mt-6">
        <h2 className="text-18 font-semibold text-fondale">Oggi tocca a te</h2>
        {totaleAttivitaOggi === 0 ? (
          <p className="mt-2 text-15 text-fondale/60">
            Nessuna categoria assegnata per oggi. Goditi la giornata, o dai un'occhiata alle attività.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {categorieOggi.map(({ categoria, attivita: elenco }) => (
              <div key={categoria.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="text-15 font-semibold">{categoria.nome}</h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {elenco.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2">
                      <span
                        className={`text-15 ${a.stato === 'molto_in_ritardo' ? 'text-secca' : a.stato === 'in_ritardo' ? 'text-cima' : 'text-fondale'}`}
                      >
                        {a.nome}
                      </span>
                      <button
                        type="button"
                        onClick={() => spunta.mutate(a.id)}
                        className="touch-target rounded-full bg-alga/10 px-4 py-2 text-13 font-medium text-alga"
                      >
                        Fatto
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-18 font-semibold text-fondale">Le più urgenti</h2>
        {urgenti.length === 0 ? (
          <p className="mt-2 text-15 text-fondale/60">Tutto in regola, per ora.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {urgenti.map((a) => (
              <li key={a.id} className="rounded-2xl bg-white p-4 text-15 shadow-sm">
                {testoUrgente(a.nome, a.ritardo)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-18 font-semibold text-fondale">In casa manca</h2>
        <div className="mt-3 flex gap-3">
          <Link
            to="/dispensa"
            className="touch-target flex-1 rounded-2xl bg-white p-4 text-15 shadow-sm"
          >
            <span className="block text-24 font-semibold">{sottoScorta.length}</span>
            prodotti sotto scorta
          </Link>
          <Link to="/spesa" className="touch-target flex-1 rounded-2xl bg-white p-4 text-15 shadow-sm">
            <span className="block text-24 font-semibold">{vociAperte.length}</span>
            voci in lista spesa
          </Link>
        </div>
      </section>
    </div>
  );
}

function versoAttivitaLista(rows: AttivitaRow[]): Attivita[] {
  return rows.map(versoAttivita);
}
