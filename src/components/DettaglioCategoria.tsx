import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CategoriaAttivita } from '../types/db';

interface Props {
  casaId: string;
  categoria: CategoriaAttivita;
  onChiudi: () => void;
}

export function DettaglioCategoria({ casaId, categoria, onChiudi }: Props) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(categoria.nome);

  const invalida = () => void queryClient.invalidateQueries({ queryKey: ['categorie', casaId] });

  const salva = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('categoria_attivita').update({ nome }).eq('id', categoria.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalida();
      onChiudi();
    },
  });

  const archivia = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('categoria_attivita')
        .update({ archiviata: true })
        .eq('id', categoria.id);
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
        aria-label="Nome categoria"
      />
      <div className="flex flex-wrap items-center gap-2">
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
          Archivia categoria
        </button>
      </div>
    </div>
  );
}
