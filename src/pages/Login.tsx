import { useState } from 'react';
import { BannerErrore } from '../components/BannerErrore';
import { messaggioErroreGenerico } from '../lib/erroreGenerico';
import { supabase, urlDiCallbackAuth } from '../lib/supabase';

/**
 * Bypass di login SOLO per i test e2e, attivo esclusivamente quando la build
 * imposta VITE_E2E_TEST_AUTH=true (mai in produzione: il flag non è definito
 * nelle build normali, quindi questo blocco viene eliminato dal bundler).
 */
const bypassE2EAttivo = import.meta.env.VITE_E2E_TEST_AUTH === 'true';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTest, setEmailTest] = useState('');
  const [passwordTest, setPasswordTest] = useState('');
  const [modalita, setModalita] = useState<'accedi' | 'registrati'>('registrati');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const accedi = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: urlDiCallbackAuth },
    });
  };

  const accediTest = async () => {
    await supabase.auth.signInWithPassword({ email: emailTest, password: passwordTest });
  };

  const inviaEmail = async () => {
    if (!email || !password) return;
    setInCorso(true);
    setErrore(null);
    try {
      if (modalita === 'registrati') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setErrore(
        messaggioErroreGenerico(
          e,
          modalita === 'registrati' ? 'creare l\'account' : 'accedere',
        ),
      );
    } finally {
      setInCorso(false);
    }
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

      <div className="flex w-full max-w-xs flex-col gap-3">
        <div className="flex items-center gap-3 text-13 text-fondale/40">
          <span className="h-px flex-1 bg-fondale/15" />
          oppure con email
          <span className="h-px flex-1 bg-fondale/15" />
        </div>

        <div className="flex justify-center gap-4 text-13">
          <button
            type="button"
            onClick={() => setModalita('registrati')}
            className={`touch-target px-2 ${modalita === 'registrati' ? 'font-semibold text-rotta' : 'text-fondale/50'}`}
          >
            Registrati
          </button>
          <button
            type="button"
            onClick={() => setModalita('accedi')}
            className={`touch-target px-2 ${modalita === 'accedi' ? 'font-semibold text-rotta' : 'text-fondale/50'}`}
          >
            Ho già un account
          </button>
        </div>

        <input
          className="touch-target rounded-xl border border-fondale/20 px-4 text-15"
          placeholder="La tua email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="touch-target rounded-xl border border-fondale/20 px-4 text-15"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void inviaEmail();
          }}
        />
        <button
          type="button"
          disabled={inCorso || !email || !password}
          onClick={inviaEmail}
          className="touch-target rounded-full border border-fondale/40 px-4 py-3 text-15 font-medium text-fondale disabled:opacity-40"
        >
          {modalita === 'registrati' ? 'Crea account' : 'Accedi'}
        </button>
        <BannerErrore messaggio={errore} onChiudi={() => setErrore(null)} />
      </div>

      {bypassE2EAttivo && (
        <div className="flex flex-col gap-2" data-testid="login-e2e">
          <input
            data-testid="e2e-email"
            className="touch-target rounded-xl border border-fondale/20 px-3 text-15"
            placeholder="email di test"
            value={emailTest}
            onChange={(e) => setEmailTest(e.target.value)}
          />
          <input
            data-testid="e2e-password"
            type="password"
            className="touch-target rounded-xl border border-fondale/20 px-3 text-15"
            placeholder="password di test"
            value={passwordTest}
            onChange={(e) => setPasswordTest(e.target.value)}
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
