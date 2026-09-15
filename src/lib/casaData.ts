import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import type {
  AssegnazioneRow,
  AttivitaRow,
  CategoriaAttivita,
  CompletamentoRow,
  Membro,
  Prodotto,
  VoceSpesa,
} from '../types/db';

export function useCategorie(casaId: string | undefined, opzioni?: { includiArchiviate?: boolean }) {
  const includiArchiviate = opzioni?.includiArchiviate ?? false;
  return useQuery({
    queryKey: ['categorie', casaId, includiArchiviate],
    enabled: !!casaId,
    queryFn: async () => {
      let query = supabase.from('categoria_attivita').select('*').eq('casa_id', casaId).order('ordine');
      if (!includiArchiviate) query = query.eq('archiviata', false);
      const { data, error } = await query;
      if (error) throw error;
      return data as CategoriaAttivita[];
    },
  });
}

export function useAttivita(casaId: string | undefined, opzioni?: { includiInattive?: boolean }) {
  const includiInattive = opzioni?.includiInattive ?? false;
  return useQuery({
    queryKey: ['attivita', casaId, includiInattive],
    enabled: !!casaId,
    queryFn: async () => {
      let query = supabase.from('attivita').select('*').eq('casa_id', casaId).order('ordine');
      if (!includiInattive) query = query.eq('attiva', true);
      const { data, error } = await query;
      if (error) throw error;
      return data as AttivitaRow[];
    },
  });
}

export function useMembri(casaId: string | undefined) {
  return useQuery({
    queryKey: ['membri', casaId],
    enabled: !!casaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('membro')
        .select('*')
        .eq('casa_id', casaId)
        .eq('attivo', true);
      if (error) throw error;
      return data as Membro[];
    },
  });
}

export function useAssegnazioni(casaId: string | undefined) {
  return useQuery({
    queryKey: ['assegnazioni', casaId],
    enabled: !!casaId,
    queryFn: async () => {
      const { data, error } = await supabase.from('assegnazione').select('*').eq('casa_id', casaId);
      if (error) throw error;
      return data as AssegnazioneRow[];
    },
  });
}

export function useCompletamenti(casaId: string | undefined) {
  return useQuery({
    queryKey: ['completamenti', casaId],
    enabled: !!casaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('completamento')
        .select('*')
        .eq('casa_id', casaId)
        .order('completata_il', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data as CompletamentoRow[];
    },
  });
}

export function useProdottiSottoScorta(casaId: string | undefined) {
  return useQuery({
    queryKey: ['prodotti-sotto-scorta', casaId],
    enabled: !!casaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prodotto')
        .select('*')
        .eq('casa_id', casaId);
      if (error) throw error;
      const prodotti = data as Prodotto[];
      return prodotti.filter((p) => p.quantita <= p.scorta_minima);
    },
  });
}

export function useVociSpesaAperte(casaId: string | undefined) {
  return useQuery({
    queryKey: ['voci-spesa-aperte', casaId],
    enabled: !!casaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voce_spesa')
        .select('*')
        .eq('casa_id', casaId)
        .is('presa_il', null);
      if (error) throw error;
      return data as VoceSpesa[];
    },
  });
}
