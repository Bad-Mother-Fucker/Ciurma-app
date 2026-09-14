import { Capacitor } from '@capacitor/core';
import { createClient } from '@supabase/supabase-js';
import { capacitorStorageAdapter } from './storage';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    'Variabili VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY mancanti. Copia .env.example in .env.local.',
  );
}

/**
 * Su Android nativo il flusso OAuth torna all'app via custom URL scheme
 * (`ciurma://auth-callback`), non via redirect http come sul web.
 */
export const urlDiCallbackAuth = Capacitor.isNativePlatform()
  ? 'ciurma://auth-callback'
  : `${window.location.origin}/auth/callback`;

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    storage: capacitorStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: !Capacitor.isNativePlatform(),
  },
});
