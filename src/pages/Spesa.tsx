import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import type { VoceSpesa } from '../types/db';

export function Spesa() {
  const { membro } = useAuth();
  const casaId = membro?.casa_id;
  const queryClient = useQueryClient();
  const [nuovaVoce, setNuovaVoce] = useState('');

  const { data: voci = [], isLoading } = useQuery({
    queryKey: ['voci-spesa', casaId],
    enabled: !!casaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voce_spesa')
        .select('*')
        .eq('casa_id', casaId)
        .is('presa_il', null)
        .order('creata_il');
      if (error) throw error;
      return data as VoceSpesa[];
    },
  });

  // Realtime: se due persone sono al supermercato, si vedono a vicenda.
  useEffect(() => {
    if (!casaId) return;
    const canale = supabase
      .channel(`voce_spesa:${casaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'voce_spesa', filter: `casa_id=eq.${casaId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['voci-spesa', casaId] });
          void queryClient.invalidateQueries({ queryKey: ['voci-spesa-aperte', casaId] });
        },
      )
      .subscribe();
    return () => void supabase.removeChannel(canale);
  }, [casaId, queryClient]);

  const invalida = () => {
    void queryClient.invalidateQueries({ queryKey: ['voci-spesa', casaId] });
    void queryClient.invalidateQueries({ queryKey: ['voci-spesa-aperte', casaId] });
  };

  const aggiungiVoceLibera = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from('voce_spesa').insert({ casa_id: casaId, nome, aggiunta_da: membro!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      setNuovaVoce('');
      invalida();
    },
  });

  const spunta = useMutation({
    mutationFn: async (voce: VoceSpesa) => {
      const { error } = await supabase
        .from('voce_spesa')
        .update({ presa_il: new Date().toISOString(), presa_da: membro!.id })
        .eq('id', voce.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalida();
      void queryClient.invalidateQueries({ queryKey: ['prodotti', casaId] });
    },
  });

  if (isLoading) return <p className="p-6 text-15 text-fondale/60">Carico la lista…</p>;

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <h1 className="text-24 font-semibold">Spesa</h1>

      {voci.length === 0 ? (
        <p className="mt-6 text-15 text-fondale/60">
          Lista vuota. Aggiungi una voce libera qui sotto, o vai in Dispensa per aggiungere ciò che manca.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {voci.map((v) => (
            <li key={v.id} className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
              <span className="text-15">{v.nome}</span>
              <button
                type="button"
                onClick={() => spunta.mutate(v)}
                className="touch-target rounded-full bg-alga/10 px-4 py-2 text-13 font-medium text-alga"
              >
                Preso
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-2">
        <input
          className="touch-target min-w-0 flex-1 rounded-xl border border-fondale/20 px-3 text-15"
          placeholder="Aggiungi una voce libera"
          value={nuovaVoce}
          onChange={(e) => setNuovaVoce(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && nuovaVoce.trim()) aggiungiVoceLibera.mutate(nuovaVoce.trim());
          }}
        />
      </div>
    </div>
  );
}
