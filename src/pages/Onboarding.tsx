import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

export function Onboarding() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [scelta, setScelta] = useState<'menu' | 'crea' | 'invito'>('menu');
  const [nomeCasa, setNomeCasa] = useState('');
  const [nomeMembro, setNomeMembro] = useState('');
  const [tokenInvito, setTokenInvito] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const creaCasa = async () => {
    if (!session) return;
    setInCorso(true);
    setErrore(null);
    try {
      const { data: casa, error: erroreCasa } = await supabase
        .from('casa')
        .insert({ nome: nomeCasa || 'Casa mia' })
        .select()
        .single();
      if (erroreCasa) throw erroreCasa;

      const { error: erroreMembro } = await supabase.from('membro').insert({
        casa_id: (casa as { id: string }).id,
        utente_id: session.user.id,
        nome: nomeMembro || session.user.user_metadata.full_name || 'Tu',
        ruolo: 'admin',
      });
      if (erroreMembro) throw erroreMembro;

      navigate('/oggi', { replace: true });
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Qualcosa è andato storto.');
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
      navigate('/oggi', { replace: true });
    } catch {
      setErrore('Il link non è valido o è scaduto. Chiedi un nuovo invito a chi ti ha invitato.');
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
