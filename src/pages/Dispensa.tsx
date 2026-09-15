import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { BannerErrore } from '../components/BannerErrore';
import { messaggioErroreGenerico } from '../lib/erroreGenerico';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import type { CategoriaDispensa, Prodotto, TipoConteggio } from '../types/db';

const ETICHETTE_CATEGORIA: Record<CategoriaDispensa, string> = {
  frigo: 'Frigo',
  freezer: 'Freezer',
  dispensa: 'Dispensa',
  casa: 'Casa',
  farmacia: 'Farmacia',
};

const LIVELLI = [
  { valore: 0, etichetta: 'Finito' },
  { valore: 0.15, etichetta: 'Agli sgoccioli' },
  { valore: 0.5, etichetta: 'A metà' },
  { valore: 1, etichetta: 'Pieno' },
] as const;

/**
 * Inferenza minimale del tipo di conteggio dal nome, usata in aggiunta
 * rapida. Lo stesso principio del seed: default "a livello" se il nome non
 * matcha nulla di riconoscibile come "a pezzi".
 */
function inferisciTipo(nome: string): TipoConteggio {
  const parole = ['uov', 'yogurt', 'mela', 'mele', 'banan', 'kiwi', 'avocado', 'hamburger', 'piadin'];
  const n = nome.toLowerCase();
  return parole.some((p) => n.includes(p)) ? 'countable' : 'uncountable';
}

export function Dispensa() {
  const { membro } = useAuth();
  const casaId = membro?.casa_id;
  const queryClient = useQueryClient();
  const [ricerca, setRicerca] = useState('');
  const [nuovoNome, setNuovoNome] = useState('');
  const [selezionati, setSelezionati] = useState<Set<string>>(new Set());
  const [errore, setErrore] = useState<string | null>(null);

  const { data: prodotti = [], isLoading } = useQuery({
    queryKey: ['prodotti', casaId],
    enabled: !!casaId,
    queryFn: async () => {
      const { data, error } = await supabase.from('prodotto').select('*').eq('casa_id', casaId).order('nome');
      if (error) throw error;
      return data as Prodotto[];
    },
  });

  const invalida = () => void queryClient.invalidateQueries({ queryKey: ['prodotti', casaId] });

  const aggiungiProdotto = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase
        .from('prodotto')
        .insert({ casa_id: casaId, nome, categoria_dispensa: 'dispensa', tipo_conteggio: inferisciTipo(nome) });
      if (error) throw error;
    },
    onSuccess: () => {
      setNuovoNome('');
      invalida();
    },
    onError: (e) => setErrore(messaggioErroreGenerico(e, 'aggiungere il prodotto')),
  });

  const aggiornaQuantita = useMutation({
    mutationFn: async ({ id, quantita }: { id: string; quantita: number }) => {
      const { error } = await supabase.from('prodotto').update({ quantita }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalida,
    onError: (e) => setErrore(messaggioErroreGenerico(e, 'aggiornare la quantità')),
  });

  const aggiungiASpesa = useMutation({
    mutationFn: async (prodottiSelezionati: Prodotto[]) => {
      const righe = prodottiSelezionati.map((p) => ({
        casa_id: casaId,
        prodotto_id: p.id,
        nome: p.nome,
        unita: p.unita,
        aggiunta_da: membro!.id,
      }));
      const { error } = await supabase.from('voce_spesa').insert(righe);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelezionati(new Set());
      void queryClient.invalidateQueries({ queryKey: ['voci-spesa-aperte', casaId] });
    },
    onError: (e) => setErrore(messaggioErroreGenerico(e, 'aggiungere alla spesa')),
  });

  const filtrati = useMemo(
    () => prodotti.filter((p) => p.nome.toLowerCase().includes(ricerca.toLowerCase())),
    [prodotti, ricerca],
  );

  const raggruppati = useMemo(() => {
    const gruppi = new Map<CategoriaDispensa, Prodotto[]>();
    for (const p of filtrati) {
      const lista = gruppi.get(p.categoria_dispensa) ?? [];
      lista.push(p);
      gruppi.set(p.categoria_dispensa, lista);
    }
    return gruppi;
  }, [filtrati]);

  if (isLoading) return <p className="p-6 text-15 text-fondale/60">Carico la dispensa…</p>;

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <h1 className="text-24 font-semibold">Dispensa</h1>

      <input
        className="touch-target mt-4 w-full rounded-xl border border-fondale/20 px-4 text-15"
        placeholder="Cerca…"
        value={ricerca}
        onChange={(e) => setRicerca(e.target.value)}
      />

      <div className="mt-2 flex items-center gap-2">
        <input
          className="touch-target min-w-0 flex-1 rounded-xl border border-fondale/20 px-3 text-15"
          placeholder="Aggiungi un prodotto e premi invio"
          value={nuovoNome}
          onChange={(e) => setNuovoNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && nuovoNome.trim()) aggiungiProdotto.mutate(nuovoNome.trim());
          }}
        />
      </div>

      <BannerErrore messaggio={errore} onChiudi={() => setErrore(null)} />

      {prodotti.length === 0 ? (
        <p className="mt-6 text-15 text-fondale/60">
          La dispensa è vuota. Aggiungi il primo prodotto qui sopra.
        </p>
      ) : (
        [...raggruppati.entries()].map(([categoria, lista]) => (
          <section key={categoria} className="mt-6">
            <h2 className="text-15 font-semibold text-fondale/70">{ETICHETTE_CATEGORIA[categoria]}</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {lista.map((p) => {
                const sottoScorta = p.quantita <= p.scorta_minima;
                const inScadenza =
                  p.scadenza && new Date(p.scadenza).getTime() - Date.now() < 3 * 86_400_000;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-sm">
                    <label className="flex flex-1 items-center gap-2 text-15">
                      <input
                        type="checkbox"
                        className="touch-target"
                        checked={selezionati.has(p.id)}
                        onChange={(e) => {
                          setSelezionati((s) => {
                            const nuovo = new Set(s);
                            if (e.target.checked) nuovo.add(p.id);
                            else nuovo.delete(p.id);
                            return nuovo;
                          });
                        }}
                      />
                      <span>
                        {p.nome}
                        {sottoScorta && (
                          <span className="ml-2 rounded-full bg-secca/10 px-2 py-0.5 text-13 text-secca">
                            scorta bassa
                          </span>
                        )}
                        {inScadenza && (
                          <span className="ml-2 rounded-full bg-cima/10 px-2 py-0.5 text-13 text-cima">
                            in scadenza
                          </span>
                        )}
                      </span>
                    </label>

                    {p.tipo_conteggio === 'countable' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="touch-target rounded-full bg-salso px-3 text-15"
                          onClick={() => aggiornaQuantita.mutate({ id: p.id, quantita: Math.max(0, p.quantita - 1) })}
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-15">{p.quantita}</span>
                        <button
                          type="button"
                          className="touch-target rounded-full bg-salso px-3 text-15"
                          onClick={() => aggiornaQuantita.mutate({ id: p.id, quantita: p.quantita + 1 })}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <select
                        className="touch-target rounded-xl border border-fondale/20 px-2 text-13"
                        value={p.quantita}
                        onChange={(e) => aggiornaQuantita.mutate({ id: p.id, quantita: Number(e.target.value) })}
                      >
                        {LIVELLI.map((l) => (
                          <option key={l.valore} value={l.valore}>
                            {l.etichetta}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {selezionati.size > 0 && (
        <button
          type="button"
          onClick={() => aggiungiASpesa.mutate(prodotti.filter((p) => selezionati.has(p.id)))}
          className="touch-target fixed inset-x-4 bottom-20 rounded-full bg-fondale px-5 py-3 text-15 font-medium text-white shadow-lg"
        >
          Aggiungi alla spesa ({selezionati.size})
        </button>
      )}
    </div>
  );
}
