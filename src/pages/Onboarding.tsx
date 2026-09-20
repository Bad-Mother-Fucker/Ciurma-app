import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { applicaSeedIniziale } from '../lib/applicaSeedIniziale';
import { supabase } from '../lib/supabase';

/** Messaggi di errore comprensibili invece del testo grezzo di Postgres/Supabase. */
function messaggioErrore(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
    if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
      return 'Sembra che manchi la connessione. Controlla la rete e riprova.';
    }
  }
  return fallback;
}

function messaggioErroreInvito(e: unknown): string {
  const messaggio = e && typeof e === 'object' && 'message' in e ? String(e.message) : '';
  if (messaggio.includes('invito_scaduto')) return 'Questo invito è scaduto. Chiedi un nuovo link a chi ti ha invitato.';
  if (messaggio.includes('invito_gia_usato')) return 'Questo invito è già stato usato. Chiedi un nuovo link a chi ti ha invitato.';
  if (messaggio.includes('invito_non_trovato')) return 'Non trovo questo invito. Controlla di aver incollato il link giusto.';
  return messaggioErrore(e, 'Il link non è valido o è scaduto. Chiedi un nuovo invito a chi ti ha invitato.');
}

export function Onboarding() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [scelta, setScelta] = useState<'menu' | 'crea' | 'invito'>('menu');
  const [nomeCasa, setNomeCasa] = useState('');
  const [nomeMembro, setNomeMembro] = useState('');
  const [usaDatiIniziali, setUsaDatiIniziali] = useState(true);
  const [tokenInvito, setTokenInvito] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const creaCasa = async () => {
    if (!session) return;
    setInCorso(true);
    setErrore(null);
    try {
      // Casa + primo membro in un'unica RPC atomica: con la sola RLS non si
      // può rileggere la casa appena creata finché non se ne è membri.
      const { data, error } = await supabase.rpc('crea_casa', {
        p_nome_casa: nomeCasa,
        p_nome_membro: nomeMembro || session.user.user_metadata.full_name || '',
      });
      if (error) throw error;
      const { casa_id: casaId, membro_id: membroId } = data as { casa_id: string; membro_id: string };

      if (usaDatiIniziali) {
        await applicaSeedIniziale(casaId, membroId);
      }

      await queryClient.invalidateQueries({ queryKey: ['membro-corrente'] });
      navigate('/oggi', { replace: true });
    } catch (e) {
      console.error('creaCasa', e);
      setErrore(messaggioErrore(e, 'Non sono riuscito a creare la casa. Riprova tra poco.'));
    } finally {
      setInCorso(false);
    }
  };

  const accettaInvito = async () => {
    setInCorso(true);
    setErrore(null);
    try {
      const { error } = await supabase.rpc('accetta_invito', {
        p_token: tokenInvito.trim(),
        p_nome: nomeMembro || 'Tu',
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['membro-corrente'] });
      navigate('/oggi', { replace: true });
    } catch (e) {
      setErrore(messaggioErroreInvito(e));
    } finally {
      setInCorso(false);
    }
  };

  if (scelta === 'menu') {
    return (
      <div className="flex min-h-screen flex-col justify-center gap-4 px-6">
        <h1 className="text-24 font-semibold">Benvenuto in Ciurma</h1>
        <p className="text-15 text-fondale/70">Prima di iniziare, entra in una casa.</p>
        <button
          type="button"
          onClick={() => setScelta('crea')}
          className="touch-target rounded-2xl bg-rotta px-5 py-4 text-left text-15 font-medium text-white"
        >
          Crea la tua casa
        </button>
        <button
          type="button"
          onClick={() => setScelta('invito')}
          className="touch-target rounded-2xl border border-fondale/20 px-5 py-4 text-left text-15 font-medium"
        >
          Ho un invito
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-center gap-4 px-6">
      <button type="button" onClick={() => setScelta('menu')} className="self-start text-15 text-rotta">
        ← Indietro
      </button>
      {scelta === 'crea' ? (
        <>
          <h1 className="text-24 font-semibold">La tua casa</h1>
          <input
            className="touch-target rounded-xl border border-fondale/20 px-4 text-15"
            placeholder="Nome della casa"
            value={nomeCasa}
            onChange={(e) => setNomeCasa(e.target.value)}
          />
          <input
            className="touch-target rounded-xl border border-fondale/20 px-4 text-15"
            placeholder="Il tuo nome"
            value={nomeMembro}
            onChange={(e) => setNomeMembro(e.target.value)}
          />
          <label className="flex items-start gap-2 text-15 text-fondale/70">
            <input
              type="checkbox"
              className="touch-target mt-0.5"
              checked={usaDatiIniziali}
              onChange={(e) => setUsaDatiIniziali(e.target.checked)}
            />
            <span>
              Partiamo da queste: Cucina e Faccende domestiche già pronte, con una dispensa di base. Poi le
              sistemi come vuoi.
            </span>
          </label>
          <button
            type="button"
            disabled={inCorso}
            onClick={creaCasa}
            className="touch-target rounded-full bg-fondale px-5 py-3 text-15 font-medium text-white disabled:opacity-50"
          >
            Crea la casa
          </button>
        </>
      ) : (
        <>
          <h1 className="text-24 font-semibold">Hai un invito?</h1>
          <input
            className="touch-target rounded-xl border border-fondale/20 px-4 text-15"
            placeholder="Incolla il codice o il link"
            value={tokenInvito}
            onChange={(e) => setTokenInvito(e.target.value)}
          />
          <input
            className="touch-target rounded-xl border border-fondale/20 px-4 text-15"
            placeholder="Il tuo nome"
            value={nomeMembro}
            onChange={(e) => setNomeMembro(e.target.value)}
          />
          <button
            type="button"
            disabled={inCorso}
            onClick={accettaInvito}
            className="touch-target rounded-full bg-fondale px-5 py-3 text-15 font-medium text-white disabled:opacity-50"
          >
            Entra nella casa
          </button>
        </>
      )}
      {errore && <p className="text-15 text-secca">{errore}</p>}
    </div>
  );
}
