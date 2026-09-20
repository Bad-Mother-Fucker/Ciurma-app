import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase, urlDiCallbackAuth } from '../lib/supabase';

/** Schermata /invito/:token — login se serve, poi entra nella casa. */
export function InvitoAccetta() {
  const { token } = useParams<{ token: string }>();
  const { session, caricamentoSessione } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  if (caricamentoSessione) return null;

  if (!session) {
    const accedi = async () => {
      sessionStorage.setItem('ciurma:token-invito', token ?? '');
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: urlDiCallbackAuth },
      });
    };
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-15">Sei stato invitato a entrare in una casa su Ciurma.</p>
        <button
          type="button"
          onClick={accedi}
          className="touch-target rounded-full bg-fondale px-6 py-3 text-15 font-medium text-white"
        >
          Accedi con Google per continuare
        </button>
      </div>
    );
  }

  const accetta = async () => {
    setInCorso(true);
    setErrore(null);
    const { error } = await supabase.rpc('accetta_invito', {
      p_token: token,
      p_nome: nome || 'Tu',
    });
    setInCorso(false);
    if (error) {
      setErrore('Questo invito è scaduto o è già stato usato. Chiedi un nuovo link a chi ti ha invitato.');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['membro-corrente'] });
    navigate('/oggi', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col justify-center gap-4 px-6">
      <h1 className="text-24 font-semibold">Sei quasi dentro</h1>
      <input
        className="touch-target rounded-xl border border-fondale/20 px-4 text-15"
        placeholder="Il tuo nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />
      <button
        type="button"
        disabled={inCorso}
        onClick={accetta}
        className="touch-target rounded-full bg-fondale px-5 py-3 text-15 font-medium text-white disabled:opacity-50"
      >
        Entra nella casa
      </button>
      {errore && <p className="text-15 text-secca">{errore}</p>}
    </div>
  );
}
