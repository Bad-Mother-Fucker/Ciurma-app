import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AttivitaRow } from '../types/db';
import { SelettoreGiorni } from './SelettoreGiorni';

const PRESET_CADENZA = [
  { etichetta: 'Ogni giorno', giorni: 1 },
  { etichetta: 'Ogni 2 giorni', giorni: 2 },
  { etichetta: 'Settimanale', giorni: 7 },
  { etichetta: 'Quindicinale', giorni: 14 },
  { etichetta: 'Mensile', giorni: 30 },
];

interface Props {
  casaId: string;
  attivita: AttivitaRow;
  onChiudi: () => void;
}

/**
 * Dettaglio/modifica di un'attività: nome, cadenza (preset o valore libero),
 * l'opzione secondaria "Solo in certi giorni" (giorni propri, che scavalcano
 * i giorni della categoria — caso "Lavatrice"), e l'archiviazione.
 */
export function DettaglioAttivita({ casaId, attivita, onChiudi }: Props) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(attivita.nome);
  const [cadenza, setCadenza] = useState(attivita.cadenza_giorni);
  const [soloCertiGiorni, setSoloCertiGiorni] = useState(attivita.giorni_settimana !== null);
  const [giorniPropri, setGiorniPropri] = useState<number[]>(attivita.giorni_settimana ?? []);

  const invalida = () => void queryClient.invalidateQueries({ queryKey: ['attivita', casaId] });

  const salva = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('attivita')
        .update({
          nome,
          cadenza_giorni: cadenza,
          giorni_settimana: soloCertiGiorni ? giorniPropri : null,
        })
        .eq('id', attivita.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalida();
      onChiudi();
    },
  });

  const archivia = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('attivita').update({ attiva: false }).eq('id', attivita.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalida();
      onChiudi();
    },
  });

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-salso p-3">
      <input
        className="touch-target rounded-xl border border-fondale/20 px-3 text-15"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        aria-label="Nome attività"
      />

      <div>
        <p className="mb-1 text-13 text-fondale/60">Cadenza</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_CADENZA.map((p) => (
            <button
              key={p.giorni}
              type="button"
              onClick={() => setCadenza(p.giorni)}
              className={`touch-target rounded-full px-3 py-1 text-13 ${
                cadenza === p.giorni ? 'bg-rotta text-white' : 'bg-white text-fondale/70'
              }`}
            >
              {p.etichetta}
            </button>
          ))}
          <input
            type="number"
            min={1}
            className="touch-target w-20 rounded-full border border-fondale/20 px-3 text-center text-13"
            value={cadenza}
            onChange={(e) => setCadenza(Math.max(1, Number(e.target.value) || 1))}
            aria-label="Cadenza in giorni personalizzata"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-13 text-fondale/70">
        <input
          type="checkbox"
          className="touch-target"
          checked={soloCertiGiorni}
          onChange={(e) => setSoloCertiGiorni(e.target.checked)}
        />
        Solo in certi giorni (scavalca i giorni della categoria)
      </label>
      {soloCertiGiorni && <SelettoreGiorni selezionati={giorniPropri} onCambia={setGiorniPropri} />}

      <div className="flex flex-wrap items-center gap-2 border-t border-fondale/10 pt-3">
        <button
          type="button"
          onClick={() => salva.mutate()}
          className="touch-target rounded-full bg-fondale px-4 py-2 text-13 font-medium text-white"
        >
          Salva
        </button>
        <button type="button" onClick={onChiudi} className="touch-target px-2 text-13 text-fondale/60">
          Annulla
        </button>
        <button
          type="button"
          onClick={() => archivia.mutate()}
          className="touch-target ml-auto px-2 text-13 text-secca"
        >
          Archivia attività
        </button>
      </div>
    </div>
  );
}
