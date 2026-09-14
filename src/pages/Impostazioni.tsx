import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import type { Invito, Membro } from '../types/db';

export function Impostazioni() {
  const { membro, session } = useAuth();
  const casaId = membro?.casa_id;
  const queryClient = useQueryClient();
  const [linkGenerato, setLinkGenerato] = useState<string | null>(null);
  const [copiato, setCopiato] = useState(false);

  const { data: membri = [] } = useQuery({
    queryKey: ['membri', casaId],
    enabled: !!casaId,
    queryFn: async () => {
      const { data, error } = await supabase.from('membro').select('*').eq('casa_id', casaId).eq('attivo', true);
      if (error) throw error;
      return data as Membro[];
    },
  });

  const generaInvito = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('invito')
        .insert({ casa_id: casaId, creato_da: membro!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Invito;
    },
    onSuccess: (invito) => {
      setLinkGenerato(`${window.location.origin}/invito/${invito.token}`);
      setCopiato(false);
    },
  });

  const copiaLink = async () => {
    if (!linkGenerato) return;
    try {
      await navigator.clipboard.writeText(linkGenerato);
      setCopiato(true);
    } catch {
      // clipboard non disponibile: l'utente può comunque selezionare il testo.
    }
  };

  const condividi = async () => {
    if (!linkGenerato) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Invito Ciurma', url: linkGenerato });
      } catch {
        // condivisione annullata dall'utente
      }
    } else {
      await copiaLink();
    }
  };

  const esci = async () => {
    await supabase.auth.signOut();
    void queryClient.clear();
  };

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <h1 className="text-24 font-semibold">Impostazioni</h1>

      <section className="mt-6">
        <h2 className="text-15 font-semibold text-fondale/70">Membri della casa</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {membri.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-2xl bg-white p-3 text-15 shadow-sm">
              <span>{m.nome}</span>
              <span className="text-13 text-fondale/50">{m.ruolo}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-15 font-semibold text-fondale/70">Invita qualcuno</h2>
        <button
          type="button"
          onClick={() => generaInvito.mutate()}
          className="touch-target mt-2 rounded-full bg-fondale px-5 py-3 text-15 font-medium text-white"
        >
          Genera link di invito
        </button>
        {linkGenerato && (
          <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm">
            <p className="break-all text-13 text-fondale/70">{linkGenerato}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copiaLink}
                className="touch-target rounded-full border border-fondale/20 px-4 py-2 text-13"
              >
                {copiato ? 'Copiato!' : 'Copia'}
              </button>
              <button
                type="button"
                onClick={condividi}
                className="touch-target rounded-full border border-fondale/20 px-4 py-2 text-13"
              >
                Condividi
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8">
        <p className="text-13 text-fondale/50">{session?.user.email}</p>
        <button type="button" onClick={esci} className="touch-target mt-2 text-15 text-secca">
          Esci dalla casa
        </button>
      </section>
    </div>
  );
}
