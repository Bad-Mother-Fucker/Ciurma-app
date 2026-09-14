import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useAssegnazioni, useAttivita, useCategorie, useCompletamenti } from '../lib/casaData';
import { calcolaStatoAttivita, type Attivita as AttivitaTipo, type Completamento } from '../lib/priorita';
import { supabase } from '../lib/supabase';
import type { AttivitaRow, CompletamentoRow } from '../types/db';

const GIORNI = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];

const PRESET_CADENZA = [
  { etichetta: 'Ogni giorno', giorni: 1 },
  { etichetta: 'Ogni 2 giorni', giorni: 2 },
  { etichetta: 'Settimanale', giorni: 7 },
  { etichetta: 'Quindicinale', giorni: 14 },
  { etichetta: 'Mensile', giorni: 30 },
];

export function Attivita() {
  const { membro } = useAuth();
  const casaId = membro?.casa_id;
  const queryClient = useQueryClient();
  const oggi = new Date();

  const { data: categorie = [] } = useCategorie(casaId);
  const { data: attivitaRows = [] } = useAttivita(casaId);
  const { data: assegnazioniRows = [] } = useAssegnazioni(casaId);
  const { data: completamentiRows = [] } = useCompletamenti(casaId);

  const [categoriaAperta, setCategoriaAperta] = useState<string | null>(null);
  const [nuovaCategoria, setNuovaCategoria] = useState('');
  const [nuovaAttivita, setNuovaAttivita] = useState<Record<string, string>>({});

  const invalida = () => {
    void queryClient.invalidateQueries({ queryKey: ['categorie', casaId] });
    void queryClient.invalidateQueries({ queryKey: ['attivita', casaId] });
    void queryClient.invalidateQueries({ queryKey: ['completamenti', casaId] });
  };

  const creaCategoria = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('categoria_attivita')
        .insert({ casa_id: casaId, nome: nuovaCategoria, ordine: categorie.length });
      if (error) throw error;
    },
    onSuccess: () => {
      setNuovaCategoria('');
      invalida();
    },
  });

  const creaAttivita = useMutation({
    mutationFn: async ({ categoriaId, nome, cadenza }: { categoriaId: string; nome: string; cadenza: number }) => {
      const { error } = await supabase
        .from('attivita')
        .insert({ casa_id: casaId, categoria_id: categoriaId, nome, cadenza_giorni: cadenza });
      if (error) throw error;
    },
    onSuccess: invalida,
  });

  const spunta = useMutation({
    mutationFn: async (attivitaId: string) => {
      const { error } = await supabase
        .from('completamento')
        .insert({ casa_id: casaId, attivita_id: attivitaId, membro_id: membro!.id });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['completamenti', casaId] }),
  });

  const attivita: AttivitaTipo[] = attivitaRows.map((a: AttivitaRow) => ({
    id: a.id,
    categoriaId: a.categoria_id,
    nome: a.nome,
    cadenzaGiorni: a.cadenza_giorni,
    giorniSettimana: a.giorni_settimana,
    attiva: a.attiva,
  }));
  const completamenti: Completamento[] = completamentiRows.map((c: CompletamentoRow) => ({
    attivitaId: c.attivita_id,
    completataIl: new Date(c.completata_il),
  }));
  const attivitaConStato = calcolaStatoAttivita(attivita, completamenti, oggi);

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <h1 className="text-24 font-semibold">Attività</h1>

      <div className="mt-4 flex flex-col gap-3">
        {categorie.map((cat) => {
          const attivitaDellaCategoria = attivitaConStato.filter((a) => a.categoriaId === cat.id);
          const assegnazioniDellaCategoria = assegnazioniRows.filter((a) => a.categoria_id === cat.id);
          const aperta = categoriaAperta === cat.id;
          return (
            <div key={cat.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <button
                type="button"
                className="touch-target flex w-full items-center justify-between text-left"
                onClick={() => setCategoriaAperta(aperta ? null : cat.id)}
              >
                <span className="text-15 font-semibold">{cat.nome}</span>
                <span className="text-13 text-fondale/50">{attivitaDellaCategoria.length} attività</span>
              </button>

              {aperta && (
                <div className="mt-3 flex flex-col gap-3">
                  {assegnazioniDellaCategoria.length > 0 && (
                    <p className="text-13 text-fondale/60">
                      Giorni:{' '}
                      {assegnazioniDellaCategoria
                        .map((a) => a.giorni_settimana.map((g) => GIORNI[g]).join(''))
                        .join(' · ')}
                    </p>
                  )}
                  <ul className="flex flex-col gap-2">
                    {attivitaDellaCategoria.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2">
                        <span
                          className={`text-15 ${a.stato === 'molto_in_ritardo' ? 'text-secca' : a.stato === 'in_ritardo' ? 'text-cima' : 'text-fondale'}`}
                        >
                          {a.nome} · ogni {a.cadenzaGiorni}g
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

                  <div className="flex flex-wrap items-center gap-2 border-t border-fondale/10 pt-3">
                    <input
                      className="touch-target min-w-0 flex-1 rounded-xl border border-fondale/20 px-3 text-15"
                      placeholder="Nuova attività"
                      value={nuovaAttivita[cat.id] ?? ''}
                      onChange={(e) => setNuovaAttivita((s) => ({ ...s, [cat.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const nome = nuovaAttivita[cat.id];
                        if (!nome) return;
                        creaAttivita.mutate({ categoriaId: cat.id, nome, cadenza: 7 });
                        setNuovaAttivita((s) => ({ ...s, [cat.id]: '' }));
                      }}
                      className="touch-target rounded-full bg-rotta px-4 py-2 text-13 font-medium text-white"
                    >
                      Aggiungi
                    </button>
                  </div>
                  <p className="text-13 text-fondale/40">
                    Preset cadenza: {PRESET_CADENZA.map((p) => p.etichetta).join(' · ')} — modificabile dal
                    dettaglio attività.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <input
          className="touch-target min-w-0 flex-1 rounded-xl border border-fondale/20 px-3 text-15"
          placeholder="Nuova categoria"
          value={nuovaCategoria}
          onChange={(e) => setNuovaCategoria(e.target.value)}
        />
        <button
          type="button"
          onClick={() => nuovaCategoria && creaCategoria.mutate()}
          className="touch-target rounded-full bg-fondale px-4 py-2 text-13 font-medium text-white"
        >
          Crea categoria
        </button>
      </div>
    </div>
  );
}
