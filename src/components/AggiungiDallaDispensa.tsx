import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Prodotto, VoceSpesa } from '../types/db';

interface Props {
  casaId: string;
  membroId: string;
  vociAperte: VoceSpesa[];
  onChiudi: () => void;
}

/**
 * Schermata di selezione multipla per aggiungere prodotti dalla dispensa
 * alla spesa: propone in cima ciò che è sotto scorta o finito.
 */
export function AggiungiDallaDispensa({ casaId, membroId, vociAperte, onChiudi }: Props) {
  const queryClient = useQueryClient();
  const [selezionati, setSelezionati] = useState<Set<string>>(new Set());

  const { data: prodotti = [], isLoading } = useQuery({
    queryKey: ['prodotti', casaId],
    enabled: !!casaId,
    queryFn: async () => {
      const { data, error } = await supabase.from('prodotto').select('*').eq('casa_id', casaId).order('nome');
      if (error) throw error;
      return data as Prodotto[];
    },
  });

  const prodottiConVoceAperta = useMemo(
    () => new Set(vociAperte.map((v) => v.prodotto_id).filter((id): id is string => !!id)),
    [vociAperte],
  );

  const disponibili = useMemo(() => {
    const candidati = prodotti.filter((p) => !prodottiConVoceAperta.has(p.id));
    return [...candidati].sort((a, b) => {
      const aSottoScorta = a.quantita <= a.scorta_minima ? 0 : 1;
      const bSottoScorta = b.quantita <= b.scorta_minima ? 0 : 1;
      if (aSottoScorta !== bSottoScorta) return aSottoScorta - bSottoScorta;
      return a.nome.localeCompare(b.nome);
    });
  }, [prodotti, prodottiConVoceAperta]);

  const aggiungiSelezionati = useMutation({
    mutationFn: async () => {
      const righe = disponibili
        .filter((p) => selezionati.has(p.id))
        .map((p) => ({
          casa_id: casaId,
          prodotto_id: p.id,
          nome: p.nome,
          unita: p.unita,
          aggiunta_da: membroId,
        }));
      if (righe.length === 0) return;
      const { error } = await supabase.from('voce_spesa').insert(righe);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['voci-spesa', casaId] });
      void queryClient.invalidateQueries({ queryKey: ['voci-spesa-aperte', casaId] });
      onChiudi();
    },
  });

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-salso">
      <div className="flex items-center justify-between border-b border-fondale/10 bg-white px-4 py-3">
        <h2 className="text-18 font-semibold">Aggiungi dalla dispensa</h2>
        <button type="button" onClick={onChiudi} className="touch-target text-15 text-fondale/60">
          Chiudi
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {isLoading ? (
          <p className="text-15 text-fondale/60">Carico la dispensa…</p>
        ) : disponibili.length === 0 ? (
          <p className="text-15 text-fondale/60">
            Non c'è niente da aggiungere: o la dispensa è vuota, o è già tutto in lista.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {disponibili.map((p) => {
              const sottoScorta = p.quantita <= p.scorta_minima;
              return (
                <li key={p.id} className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
                  <label className="flex flex-1 items-center gap-2 text-15">
                    <input
                      type="checkbox"
                      className="touch-target"
                      checked={selezionati.has(p.id)}
                      onChange={(e) => {
                        setSelezionati((s) => {
                          const nuovo = new Set(s);
                          if (e.target.checked) nuovo.add(p.id);
                          else nuovo.delete(p.id);
                          return nuovo;
                        });
                      }}
                    />
                    <span>{p.nome}</span>
                    {sottoScorta && (
                      <span className="rounded-full bg-secca/10 px-2 py-0.5 text-13 text-secca">sotto scorta</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selezionati.size > 0 && (
        <button
          type="button"
          onClick={() => aggiungiSelezionati.mutate()}
          className="touch-target fixed inset-x-4 bottom-4 rounded-full bg-fondale px-5 py-3 text-15 font-medium text-white shadow-lg"
        >
          Aggiungi alla spesa ({selezionati.size})
        </button>
      )}
    </div>
  );
}
