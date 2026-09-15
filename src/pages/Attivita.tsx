import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AssegnazioniCategoria } from '../components/AssegnazioniCategoria';
import { BannerErrore } from '../components/BannerErrore';
import { messaggioErroreGenerico } from '../lib/erroreGenerico';
import { BottoneSpunta } from '../components/BottoneSpunta';
import { DettaglioAttivita } from '../components/DettaglioAttivita';
import { DettaglioCategoria } from '../components/DettaglioCategoria';
import { RiepilogoSettimanale } from '../components/RiepilogoSettimanale';
import { useAuth } from '../lib/AuthContext';
import { useAssegnazioni, useAttivita, useCategorie, useCompletamenti, useMembri } from '../lib/casaData';
import { calcolaStatoAttivita, type Attivita as AttivitaTipo, type Completamento } from '../lib/priorita';
import { supabase } from '../lib/supabase';
import type { AttivitaRow, CompletamentoRow } from '../types/db';

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
  const { data: membri = [] } = useMembri(casaId);

  const [categoriaAperta, setCategoriaAperta] = useState<string | null>(null);
  const [categoriaInModifica, setCategoriaInModifica] = useState<string | null>(null);
  const [attivitaInModifica, setAttivitaInModifica] = useState<string | null>(null);
  const [nuovaCategoria, setNuovaCategoria] = useState('');
  const [nuovaAttivita, setNuovaAttivita] = useState<Record<string, string>>({});
  const [cadenzaNuovaAttivita, setCadenzaNuovaAttivita] = useState<Record<string, number>>({});
  const [mostraRiepilogo, setMostraRiepilogo] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const invalida = () => {
    void queryClient.invalidateQueries({ queryKey: ['categorie', casaId] });
    void queryClient.invalidateQueries({ queryKey: ['attivita', casaId] });
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
    onError: (e) => setErrore(messaggioErroreGenerico(e, 'creare la categoria')),
  });

  const creaAttivita = useMutation({
    mutationFn: async ({ categoriaId, nome, cadenza }: { categoriaId: string; nome: string; cadenza: number }) => {
      const { error } = await supabase
        .from('attivita')
        .insert({ casa_id: casaId, categoria_id: categoriaId, nome, cadenza_giorni: cadenza });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['attivita', casaId] }),
    onError: (e) => setErrore(messaggioErroreGenerico(e, "creare l'attività")),
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
      <div className="flex items-center justify-between">
        <h1 className="text-24 font-semibold">Attività</h1>
        <button
          type="button"
          onClick={() => setMostraRiepilogo((v) => !v)}
          className="touch-target text-13 font-medium text-rotta"
        >
          {mostraRiepilogo ? 'Nascondi riepilogo' : 'Chi fa cosa'}
        </button>
      </div>

      <BannerErrore messaggio={errore} onChiudi={() => setErrore(null)} />

      {mostraRiepilogo && (
        <div className="mt-4">
          <RiepilogoSettimanale categorie={categorie} assegnazioni={assegnazioniRows} membri={membri} />
        </div>
      )}

      {categorie.length === 0 ? (
        <p className="mt-6 text-15 text-fondale/60">
          Nessuna categoria ancora. Creane una qui sotto per iniziare a organizzare le attività di casa.
        </p>
      ) : (
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
                    {categoriaInModifica === cat.id ? (
                      <DettaglioCategoria
                        casaId={casaId!}
                        categoria={cat}
                        onChiudi={() => setCategoriaInModifica(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCategoriaInModifica(cat.id)}
                        className="touch-target self-start text-13 text-rotta"
                      >
                        Modifica categoria
                      </button>
                    )}

                    <AssegnazioniCategoria
                      casaId={casaId!}
                      categoriaId={cat.id}
                      assegnazioni={assegnazioniDellaCategoria}
                      membri={membri}
                    />

                    <ul className="flex flex-col gap-2">
                      {attivitaDellaCategoria.map((a) =>
                        attivitaInModifica === a.id ? (
                          <li key={a.id}>
                            <DettaglioAttivita
                              casaId={casaId!}
                              attivita={attivitaRows.find((r) => r.id === a.id)!}
                              onChiudi={() => setAttivitaInModifica(null)}
                            />
                          </li>
                        ) : (
                          <li key={a.id} className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setAttivitaInModifica(a.id)}
                              className={`touch-target flex-1 text-left text-15 ${a.stato === 'molto_in_ritardo' ? 'text-secca' : a.stato === 'in_ritardo' ? 'text-cima' : 'text-fondale'}`}
                            >
                              {a.nome} · ogni {a.cadenzaGiorni}g
                              {a.giorniSettimana && ' · solo alcuni giorni'}
                            </button>
                            <BottoneSpunta
                              casaId={casaId!}
                              attivitaId={a.id}
                              membroId={membro!.id}
                              completamenti={completamentiRows}
                            />
                          </li>
                        ),
                      )}
                    </ul>

                    <div className="flex flex-wrap items-center gap-2 border-t border-fondale/10 pt-3">
                      <input
                        className="touch-target min-w-0 flex-1 rounded-xl border border-fondale/20 px-3 text-15"
                        placeholder="Nuova attività"
                        value={nuovaAttivita[cat.id] ?? ''}
                        onChange={(e) => setNuovaAttivita((s) => ({ ...s, [cat.id]: e.target.value }))}
                      />
                      <select
                        aria-label="Cadenza della nuova attività"
                        className="touch-target rounded-xl border border-fondale/20 px-2 text-13"
                        value={cadenzaNuovaAttivita[cat.id] ?? 7}
                        onChange={(e) =>
                          setCadenzaNuovaAttivita((s) => ({ ...s, [cat.id]: Number(e.target.value) }))
                        }
                      >
                        {PRESET_CADENZA.map((p) => (
                          <option key={p.giorni} value={p.giorni}>
                            {p.etichetta}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const nome = nuovaAttivita[cat.id];
                          if (!nome) return;
                          creaAttivita.mutate({
                            categoriaId: cat.id,
                            nome,
                            cadenza: cadenzaNuovaAttivita[cat.id] ?? 7,
                          });
                          setNuovaAttivita((s) => ({ ...s, [cat.id]: '' }));
                        }}
                        className="touch-target rounded-full bg-rotta px-4 py-2 text-13 font-medium text-white"
                      >
                        Aggiungi
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
