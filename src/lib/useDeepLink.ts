import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';

/**
 * Su Android i deep link (invito) e il ritorno dell'OAuth arrivano come
 * evento `appUrlOpen`, non come navigazione http del browser: qui li
 * traduciamo in navigazione React Router o li passiamo a Supabase.
 */
export function useDeepLink() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener('appUrlOpen', ({ url }) => {
      const parsed = new URL(url);

      if (parsed.host === 'auth-callback') {
        // Supabase legge il token dai parametri dell'URL ricevuto.
        void supabase.auth.exchangeCodeForSession(url);
        return;
      }

      if (parsed.pathname.startsWith('/invito/')) {
        navigate(parsed.pathname, { replace: true });
      }
    });

    return () => {
      void listener.then((l) => l.remove());
    };
  }, [navigate]);
}
