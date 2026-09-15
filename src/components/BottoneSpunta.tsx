import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CompletamentoRow } from '../types/db';

const FINESTRA_ANNULLAMENTO_MS = 5 * 60 * 1000;

interface Props {
  casaId: string;
  attivitaId: string;
  membroId: string;
  /** Tutti i completamenti di questa attività (bastano gli ultimi). */
  completamenti: CompletamentoRow[];
}

/**
 * "Fatto" inserisce un completamento. Se l'ultimo completamento di questa
 * attività fatto da questo membro è entro 5 minuti, il pulsante diventa
 * "Annulla" e cancella quella riga (mai una modifica di stato: si toglie il
 * fatto appena aggiunto, lo storico resta per tutto il resto).
 */
export function BottoneSpunta({ casaId, attivitaId, membroId, completamenti }: Props) {
  const queryClient = useQueryClient();
  const [ora, setOra] = useState(() => Date.now());

  const ultimoMio = completamenti
    .filter((c) => c.attivita_id === attivitaId && c.membro_id === membroId)
    .sort((a, b) => new Date(b.completata_il).getTime() - new Date(a.completata_il).getTime())[0];

  const eta = ultimoMio ? ora - new Date(ultimoMio.completata_il).getTime() : Infinity;
  const puoAnnullare = Boolean(ultimoMio) && eta < FINESTRA_ANNULLAMENTO_MS;

  // Ri-renderizza quando la finestra dei 5 minuti scade, per tornare a "Fatto".
  useEffect(() => {
    if (!puoAnnullare) return;
    const restante = FINESTRA_ANNULLAMENTO_MS - eta;
    const timer = setTimeout(() => setOra(Date.now()), restante + 500);
    return () => clearTimeout(timer);
  }, [puoAnnullare, eta]);

  const invalida = () => void queryClient.invalidateQueries({ queryKey: ['completamenti', casaId] });

  const spunta = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('completamento')
        .insert({ casa_id: casaId, attivita_id: attivitaId, membro_id: membroId });
      if (error) throw error;
    },
    onSuccess: invalida,
  });

  const annulla = useMutation({
    mutationFn: async () => {
      if (!ultimoMio) return;
      const { error } = await supabase.from('completamento').delete().eq('id', ultimoMio.id);
      if (error) throw error;
    },
    onSuccess: invalida,
  });

  if (puoAnnullare) {
    return (
      <button
        type="button"
        onClick={() => annulla.mutate()}
        className="touch-target rounded-full bg-secca/10 px-4 py-2 text-13 font-medium text-secca"
      >
        Annulla
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => spunta.mutate()}
      className="touch-target rounded-full bg-alga/10 px-4 py-2 text-13 font-medium text-alga"
    >
      Fatto
    </button>
  );
}
