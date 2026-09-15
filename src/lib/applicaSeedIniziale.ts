import { supabase } from './supabase';
import {
  ATTIVITA_CUCINA,
  ATTIVITA_FACCENDE,
  CATEGORIA_CUCINA_NOME,
  CATEGORIA_FACCENDE_NOME,
  PRODOTTI_INIZIALI,
} from './seedIniziale';

/**
 * Popola una casa appena creata con le categorie/attività/dispensa di
 * partenza, tutte assegnate a chi ha creato la casa (ordinabile e
 * riassegnabile dopo, dall'editor di assegnazione in Attività).
 */
export async function applicaSeedIniziale(casaId: string, membroId: string) {
  const { data: catCucina, error: erroreCucina } = await supabase
    .from('categoria_attivita')
    .insert({ casa_id: casaId, nome: CATEGORIA_CUCINA_NOME, icona: 'utensils', colore: '#E4A03C', ordine: 0 })
    .select()
    .single();
  if (erroreCucina) throw erroreCucina;

  const { data: catFaccende, error: erroreFaccende } = await supabase
    .from('categoria_attivita')
    .insert({ casa_id: casaId, nome: CATEGORIA_FACCENDE_NOME, icona: 'sparkles', colore: '#1F7A8C', ordine: 1 })
    .select()
    .single();
  if (erroreFaccende) throw erroreFaccende;

  const { error: erroreAttivitaCucina } = await supabase.from('attivita').insert(
    ATTIVITA_CUCINA.map((a, i) => ({
      casa_id: casaId,
      categoria_id: catCucina.id,
      nome: a.nome,
      cadenza_giorni: a.cadenza,
      giorni_settimana: a.giorni,
      ordine: i,
    })),
  );
  if (erroreAttivitaCucina) throw erroreAttivitaCucina;

  const { error: erroreAttivitaFaccende } = await supabase.from('attivita').insert(
    ATTIVITA_FACCENDE.map((a, i) => ({
      casa_id: casaId,
      categoria_id: catFaccende.id,
      nome: a.nome,
      cadenza_giorni: a.cadenza,
      giorni_settimana: a.giorni,
      ordine: i,
    })),
  );
  if (erroreAttivitaFaccende) throw erroreAttivitaFaccende;

  const { error: erroreAssegnazioni } = await supabase.from('assegnazione').insert([
    { casa_id: casaId, categoria_id: catCucina.id, membro_id: membroId, giorni_settimana: [0, 1, 2, 3, 4, 5, 6] },
    { casa_id: casaId, categoria_id: catFaccende.id, membro_id: membroId, giorni_settimana: [0, 1, 2, 3, 4, 5, 6] },
  ]);
  if (erroreAssegnazioni) throw erroreAssegnazioni;

  const { error: erroreProdotti } = await supabase.from('prodotto').insert(
    PRODOTTI_INIZIALI.map((p) => ({
      casa_id: casaId,
      nome: p.nome,
      categoria_dispensa: p.categoria,
      tipo_conteggio: p.tipo,
      quantita: 0,
    })),
  );
  if (erroreProdotti) throw erroreProdotti;
}
