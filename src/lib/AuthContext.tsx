import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Membro } from '../types/db';

interface AuthState {
  session: Session | null;
  caricamentoSessione: boolean;
  membro: Membro | null;
  caricamentoMembro: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [caricamentoSessione, setCaricamentoSessione] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCaricamentoSessione(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_evento, nuovaSessione) => {
      setSession(nuovaSessione);
      void queryClient.invalidateQueries({ queryKey: ['membro-corrente'] });
    });

    return () => subscription.subscription.unsubscribe();
  }, [queryClient]);

  const { data: membro, isLoading: caricamentoMembro } = useQuery({
    queryKey: ['membro-corrente', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('membro')
        .select('*')
        .eq('utente_id', session!.user.id)
        .eq('attivo', true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Membro | null;
    },
  });

  return (
    <AuthContext.Provider
      value={{ session, caricamentoSessione, membro: membro ?? null, caricamentoMembro }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook e provider condividono lo stesso contesto
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth va usato dentro <AuthProvider>');
  return ctx;
}
