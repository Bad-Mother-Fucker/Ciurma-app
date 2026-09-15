/**
 * Popola una casa di prova (Clara + Michele, Cucina, Faccende domestiche,
 * dispensa) su un progetto Supabase reale, usando la service role key.
 *
 * Richiede SUPABASE_SERVICE_ROLE_KEY e VITE_SUPABASE_URL in .env.local:
 * mai eseguito lato client, mai committato.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  ATTIVITA_CUCINA,
  ATTIVITA_FACCENDE,
  CATEGORIA_CUCINA_NOME,
  CATEGORIA_FACCENDE_NOME,
  PRODOTTI_INIZIALI,
} from '../src/lib/seedIniziale';

const url = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Servono VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function trovaOCreaUtente(email: string, nome: string) {
  const { data: elenco, error: erroreElenco } = await admin.auth.admin.listUsers();
  if (erroreElenco) throw erroreElenco;
  const esistente = elenco.users.find((u) => u.email === email);
  if (esistente) return esistente.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: nome },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  console.log('Creo utenti di prova (Clara, Michele)…');
  const claraId = await trovaOCreaUtente('clara@ciurma.test', 'Clara');
  const micheleId = await trovaOCreaUtente('michele@ciurma.test', 'Michele');

  console.log('Creo la casa…');
  const { data: casa, error: erroreCasa } = await admin.from('casa').insert({ nome: 'Casa di prova' }).select().single();
  if (erroreCasa) throw erroreCasa;

  const { data: clara, error: erroreClara } = await admin
    .from('membro')
    .insert({ casa_id: casa.id, utente_id: claraId, nome: 'Clara', colore: '#E4A03C', ruolo: 'admin' })
    .select()
    .single();
  if (erroreClara) throw erroreClara;

  const { data: michele, error: erroreMichele } = await admin
    .from('membro')
    .insert({ casa_id: casa.id, utente_id: micheleId, nome: 'Michele', colore: '#1F7A8C', ruolo: 'membro' })
    .select()
    .single();
  if (erroreMichele) throw erroreMichele;

  console.log('Creo categorie e attività…');
  const { data: catCucina } = await admin
    .from('categoria_attivita')
    .insert({ casa_id: casa.id, nome: CATEGORIA_CUCINA_NOME, icona: 'utensils', colore: '#E4A03C', ordine: 0 })
    .select()
    .single();
  const { data: catFaccende } = await admin
    .from('categoria_attivita')
    .insert({ casa_id: casa.id, nome: CATEGORIA_FACCENDE_NOME, icona: 'sparkles', colore: '#1F7A8C', ordine: 1 })
    .select()
    .single();

  await admin.from('attivita').insert(
    ATTIVITA_CUCINA.map((a, i) => ({
      casa_id: casa.id,
      categoria_id: catCucina!.id,
      nome: a.nome,
      cadenza_giorni: a.cadenza,
      giorni_settimana: a.giorni,
      ordine: i,
    })),
  );
  await admin.from('attivita').insert(
    ATTIVITA_FACCENDE.map((a, i) => ({
      casa_id: casa.id,
      categoria_id: catFaccende!.id,
      nome: a.nome,
      cadenza_giorni: a.cadenza,
      giorni_settimana: a.giorni,
      ordine: i,
    })),
  );

  console.log('Creo le assegnazioni…');
  await admin.from('assegnazione').insert({
    casa_id: casa.id,
    categoria_id: catCucina!.id,
    membro_id: clara.id,
    giorni_settimana: [0, 1, 2, 3, 4, 5, 6],
  });
  await admin.from('assegnazione').insert({
    casa_id: casa.id,
    categoria_id: catFaccende!.id,
    membro_id: michele.id,
    giorni_settimana: [1, 3, 4],
  });

  console.log('Popolo la dispensa (senza quantità)…');
  await admin.from('prodotto').insert(
    PRODOTTI_INIZIALI.map((p) => ({
      casa_id: casa.id,
      nome: p.nome,
      categoria_dispensa: p.categoria,
      tipo_conteggio: p.tipo,
      quantita: 0,
    })),
  );

  console.log(`Fatto. Casa di prova: ${casa.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
