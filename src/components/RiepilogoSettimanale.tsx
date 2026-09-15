import { etichettaGiorno } from '../lib/giorni';
import type { AssegnazioneRow, CategoriaAttivita, Membro } from '../types/db';

const ORDINE_GIORNI = [1, 2, 3, 4, 5, 6, 0];

interface Props {
  categorie: CategoriaAttivita[];
  assegnazioni: AssegnazioneRow[];
  membri: Membro[];
}

/** Vista riepilogativa settimanale: chi fa cosa, giorno per giorno. */
export function RiepilogoSettimanale({ categorie, assegnazioni, membri }: Props) {
  const nomeMembro = (id: string) => membri.find((m) => m.id === id)?.nome ?? '—';
  const nomeCategoria = (id: string) => categorie.find((c) => c.id === id)?.nome ?? '—';

  if (assegnazioni.length === 0) {
    return (
      <p className="text-15 text-fondale/60">
        Nessuna assegnazione ancora. Apri una categoria qui sopra e assegna un membro ai suoi giorni.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-x-auto">
      {ORDINE_GIORNI.map((giorno) => {
        const assegnazioniDelGiorno = assegnazioni.filter((a) => a.giorni_settimana.includes(giorno));
        return (
          <div key={giorno} className="flex gap-3 rounded-xl bg-white p-3 shadow-sm">
            <span className="w-8 shrink-0 text-15 font-semibold text-rotta">{etichettaGiorno(giorno)}</span>
            {assegnazioniDelGiorno.length === 0 ? (
              <span className="text-13 text-fondale/40">Nessuno assegnato</span>
            ) : (
              <ul className="flex flex-1 flex-wrap gap-x-3 gap-y-1 text-13">
                {assegnazioniDelGiorno.map((a) => (
                  <li key={a.id}>
                    <strong>{nomeMembro(a.membro_id)}</strong> · {nomeCategoria(a.categoria_id)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
