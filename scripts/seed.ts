/**
 * Popola una casa di prova (Clara + Michele, Cucina, Faccende domestiche,
 * dispensa) su un progetto Supabase reale, usando la service role key.
 *
 * Richiede SUPABASE_SERVICE_ROLE_KEY e VITE_SUPABASE_URL in .env.local:
 * mai eseguito lato client, mai committato.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Servono VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const CUCINA = [
  { nome: 'Preparare la colazione', cadenza: 1, giorni: null },
  { nome: 'Preparare il pranzo', cadenza: 1, giorni: null },
  { nome: 'Preparare la cena', cadenza: 1, giorni: null },
  { nome: 'Pianificare i pasti della settimana', cadenza: 7, giorni: [0] },
];

const FACCENDE: Array<{ nome: string; cadenza: number; giorni: number[] | null }> = [
  { nome: 'Riordinare', cadenza: 1, giorni: null },
  { nome: 'Buttare la spazzatura', cadenza: 2, giorni: null },
  { nome: 'Svuotare il secchio del climatizzatore', cadenza: 3, giorni: null },
  { nome: 'Svuotare e riporre lo stendino', cadenza: 3, giorni: null },
  { nome: 'Innaffiare le piante', cadenza: 4, giorni: null },
  { nome: 'Lavatrice', cadenza: 3, giorni: [2, 4] },
  { nome: 'Spolverare', cadenza: 7, giorni: null },
  { nome: 'Lavare il pavimento', cadenza: 7, giorni: null },
  { nome: 'Pulire il bagno', cadenza: 7, giorni: null },
  { nome: 'Pulire la doccia', cadenza: 7, giorni: null },
  { nome: 'Pulire la camera da letto', cadenza: 7, giorni: null },
  { nome: 'Pulire scrivania e angolo ingresso', cadenza: 7, giorni: null },
  { nome: 'Fare la spesa', cadenza: 7, giorni: null },
  { nome: 'Pulire il terrazzo', cadenza: 14, giorni: null },
  { nome: 'Pulire la friggitrice', cadenza: 14, giorni: null },
  { nome: 'Pulire la brocca', cadenza: 14, giorni: null },
  { nome: "Pulire l'aspirapolvere", cadenza: 14, giorni: null },
  { nome: "Riordinare l'armadio", cadenza: 30, giorni: null },
  { nome: 'Pulire il frigorifero', cadenza: 30, giorni: null },
  { nome: 'Pulire i vetri', cadenza: 30, giorni: null },
  { nome: 'Pulire i cassetti della cucina', cadenza: 30, giorni: null },
];

// Stessa identica lista di db/seed.sql: se cambia una delle due, aggiornare
// anche l'altra (vedi nota in PIANO.md).
const COUNTABLE = new Set([
  'Uova BIO',
  'Yogurt bianco senza lattosio BIO',
  'Yogurt di capra o pecora',
  'Hamburger di pollo',
  'Bistecchina di carni bianche',
  'Hamburger di vitello',
  'Orata',
  "Trancio di salmone d'Alaska",
  'Avocado',
  'Banana BIO',
  'Kiwi gialli',
  'Mele',
  'Finocchi',
  'Scarola',
  'Indivia',
  'Melanzane',
  'Piadine',
  'Filetti di tonno al naturale (vetro)',
  'Tisana malva',
]);

const PRODOTTI_FRIGO = [
  'Uova BIO',
  'Albume',
  'Yogurt bianco senza lattosio BIO',
  'Yogurt di capra o pecora',
  'Ricotta di capra',
  'Parmigiano Reggiano DOP 36 mesi',
  'Grana a scaglie',
  'Burro ghee',
  'Prosciutto crudo (San Daniele o Parma)',
  'Petto di pollo',
  'Straccetti di pollo',
  'Hamburger di pollo',
  'Bocconcini di tacchino',
  'Bistecchina di carni bianche',
  'Straccetti di manzo',
  'Carne di vitello macinata',
  'Hamburger di vitello',
  'Orata',
  'Filetto di merluzzo o nasello',
  "Trancio di salmone d'Alaska",
  "Salmone selvaggio d'Alaska affumicato",
  // Frutta e verdura (nello schema condividono la categoria "frigo")
  'Avocado',
  'Banana BIO',
  'Kiwi gialli',
  'Mele',
  'Mirtilli',
  'Carote',
  'Finocchi',
  'Scarola',
  'Indivia',
  'Lattughino',
  'Misticanza',
  'Rucola',
  'Pomodorini',
  'Zucca',
  'Zucchine',
  'Melanzane',
  'Bietole',
  'Patate',
  'Patate dolci',
  'Piselli',
];

const PRODOTTI_DISPENSA = [
  'Quinoa',
  'Couscous',
  'Riso italiano',
  'Pasta di grano saraceno',
  'Pasta di legumi Felicia',
  "Fiocchi d'avena",
  "Fiocchi d'avena tostati",
  'Farina tollerata',
  'Pane a lievito madre',
  'Piadine',
  'Chips di patate',
  'Filetti di tonno al naturale (vetro)',
  'Olio extra vergine di oliva',
  'Olive taggiasche',
  'Noci',
  'Crema di mandorle 100%',
  'Cocco rapè',
  'Cioccolato fondente 85%',
  'Cannella',
  'Alloro',
  'Basilico',
  'Salvia',
  'Tisana malva',
];

const PRODOTTI: Array<{ nome: string; categoria: string; tipo: string }> = [
  ...PRODOTTI_FRIGO.map((nome) => ({ nome, categoria: 'frigo', tipo: COUNTABLE.has(nome) ? 'countable' : 'uncountable' })),
  ...PRODOTTI_DISPENSA.map((nome) => ({ nome, categoria: 'dispensa', tipo: COUNTABLE.has(nome) ? 'countable' : 'uncountable' })),
];

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
    .insert({ casa_id: casa.id, nome: 'Cucina', icona: 'utensils', colore: '#E4A03C', ordine: 0 })
    .select()
    .single();
  const { data: catFaccende } = await admin
    .from('categoria_attivita')
    .insert({ casa_id: casa.id, nome: 'Faccende domestiche', icona: 'sparkles', colore: '#1F7A8C', ordine: 1 })
    .select()
    .single();

  await admin.from('attivita').insert(
    CUCINA.map((a, i) => ({
      casa_id: casa.id,
      categoria_id: catCucina!.id,
      nome: a.nome,
      cadenza_giorni: a.cadenza,
      giorni_settimana: a.giorni,
      ordine: i,
    })),
  );
  await admin.from('attivita').insert(
    FACCENDE.map((a, i) => ({
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
    PRODOTTI.map((p) => ({
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
