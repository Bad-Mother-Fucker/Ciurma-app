import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AssegnazioneRow, Membro } from '../types/db';
import { etichettaGiorniCompatta } from '../lib/giorni';
import { SelettoreGiorni } from './SelettoreGiorni';

interface Props {
  casaId: string;
  categoriaId: string;
  assegnazioni: AssegnazioneRow[];
  membri: Membro[];
}

/** Editor delle assegnazioni di una categoria: chi la fa, e che giorni. */
export function AssegnazioniCategoria({ casaId, categoriaId, assegnazioni, membri }: Props) {
  const queryClient = useQueryClient();
  const [membroSelezionato, setMembroSelezionato] = useState('');
  const [giorniNuovi, setGiorniNuovi] = useState<number[]>([]);

  const invalida = () => void queryClient.invalidateQueries({ queryKey: ['assegnazioni', casaId] });

  const creaAssegnazione = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('assegnazione').insert({
        casa_id: casaId,
        categoria_id: categoriaId,
        membro_id: membroSelezionato,
        giorni_settimana: giorniNuovi,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMembroSelezionato('');
      setGiorniNuovi([]);
      invalida();
    },
  });

  const aggiornaGiorni = useMutation({
    mutationFn: async ({ id, giorni }: { id: string; giorni: number[] }) => {
      const { error } = await supabase.from('assegnazione').update({ giorni_settimana: giorni }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalida,
  });

  const rimuoviAssegnazione = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assegnazione').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalida,
  });

  const nomeMembro = (id: string) => membri.find((m) => m.id === id)?.nome ?? '—';
  const membriDisponibili = membri.filter((m) => !assegnazioni.some((a) => a.membro_id === m.id));

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-salso p-3">
      <h4 className="text-13 font-semibold text-fondale/70">Chi la fa e quando</h4>

      {assegnazioni.length === 0 ? (
        <p className="text-13 text-fondale/50">
          Nessuno è ancora assegnato a questa categoria. Aggiungi un membro qui sotto.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {assegnazioni.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-2">
              <span className="text-13 font-medium">{nomeMembro(a.membro_id)}</span>
              <div className="flex items-center gap-2">
                <SelettoreGiorni
                  selezionati={a.giorni_settimana}
                  onCambia={(giorni) => aggiornaGiorni.mutate({ id: a.id, giorni })}
                />
                <button
                  type="button"
                  onClick={() => rimuoviAssegnazione.mutate(a.id)}
                  className="touch-target text-13 text-secca"
                  aria-label={`Rimuovi assegnazione di ${nomeMembro(a.membro_id)}`}
                >
                  Rimuovi
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {membriDisponibili.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-fondale/10 pt-3">
          <select
            aria-label="Scegli un membro da assegnare"
            className="touch-target rounded-xl border border-fondale/20 px-2 text-13"
            value={membroSelezionato}
            onChange={(e) => setMembroSelezionato(e.target.value)}
          >
            <option value="">Scegli un membro…</option>
            {membriDisponibili.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
          <SelettoreGiorni selezionati={giorniNuovi} onCambia={setGiorniNuovi} />
          <button
            type="button"
            disabled={!membroSelezionato || giorniNuovi.length === 0}
            onClick={() => creaAssegnazione.mutate()}
            className="touch-target rounded-full bg-rotta px-4 py-2 text-13 font-medium text-white disabled:opacity-40"
          >
            Assegna
          </button>
        </div>
      )}

      {assegnazioni.length > 0 && (
        <p className="text-13 text-fondale/40">
          Riepilogo: {assegnazioni.map((a) => `${nomeMembro(a.membro_id)} (${etichettaGiorniCompatta(a.giorni_settimana)})`).join(' · ')}
        </p>
      )}
    </div>
  );
}
