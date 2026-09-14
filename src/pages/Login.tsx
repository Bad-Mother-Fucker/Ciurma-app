import { useState } from 'react';
import { supabase, urlDiCallbackAuth } from '../lib/supabase';

/**
 * Bypass di login SOLO per i test e2e, attivo esclusivamente quando la build
 * imposta VITE_E2E_TEST_AUTH=true (mai in produzione: il flag non è definito
 * nelle build normali, quindi questo blocco viene eliminato dal bundler).
 * Necessario perché il prodotto ha come unico metodo il login Google, non
 * automatizzabile in CI senza un vero IdP di test.
 */
const bypassE2EAttivo = import.meta.env.VITE_E2E_TEST_AUTH === 'true';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const accedi = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: urlDiCallbackAuth },
    });
  };

  const accediTest = async () => {
    await supabase.auth.signInWithPassword({ email, password });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-salso px-6 text-center">
      <div>
        <h1 className="text-[34px] font-semibold text-fondale">Ciurma</h1>
        <p className="mt-2 text-15 text-fondale/70">La casa, gestita insieme.</p>
      </div>
      <button
        type="button"
        onClick={accedi}
        className="touch-target flex items-center gap-3 rounded-full bg-fondale px-6 py-3 text-15 font-medium text-white"
      >
        Accedi con Google
      </button>

      {bypassE2EAttivo && (
        <div className="flex flex-col gap-2" data-testid="login-e2e">
          <input
            data-testid="e2e-email"
            className="touch-target rounded-xl border border-fondale/20 px-3 text-15"
            placeholder="email di test"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            data-testid="e2e-password"
            type="password"
            className="touch-target rounded-xl border border-fondale/20 px-3 text-15"
            placeholder="password di test"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            data-testid="e2e-login-submit"
            onClick={accediTest}
            className="touch-target rounded-full border border-fondale/40 px-4 py-2 text-13"
          >
            Login di test (solo e2e)
          </button>
        </div>
      )}
    </div>
  );
}
