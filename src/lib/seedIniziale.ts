/**
 * Dati di partenza proposti in onboarding ("Partiamo da queste, poi le
 * sistemi") e usati da scripts/seed.ts per popolare una casa di prova.
 * Le cadenze sono una proposta ragionevole ricavata dal tipo di attività,
 * non un dato fornito dall'utente: sono pensate per essere cambiate senza
 * attrito dall'interfaccia (vedi DettaglioAttivita).
 */

export interface AttivitaIniziale {
  nome: string;
  cadenza: number;
  giorni: number[] | null;
}

export const CATEGORIA_CUCINA_NOME = 'Cucina';
export const CATEGORIA_FACCENDE_NOME = 'Faccende domestiche';

export const ATTIVITA_CUCINA: AttivitaIniziale[] = [
  { nome: 'Preparare la colazione', cadenza: 1, giorni: null },
  { nome: 'Preparare il pranzo', cadenza: 1, giorni: null },
  { nome: 'Preparare la cena', cadenza: 1, giorni: null },
  { nome: 'Pianificare i pasti della settimana', cadenza: 7, giorni: [0] },
];

export const ATTIVITA_FACCENDE: AttivitaIniziale[] = [
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

// Se un nome non è in questo elenco, il tipo di conteggio proposto è "a
// livello" (uncountable) di default — stessa regola usata nell'aggiunta
// rapida in Dispensa (vedi inferisciTipo in src/pages/Dispensa.tsx).
const PRODOTTI_A_PEZZI = new Set([
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

const NOMI_PRODOTTI_FRIGO = [
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
  // Frutta e verdura: nello schema condividono la categoria "frigo".
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

const NOMI_PRODOTTI_DISPENSA = [
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

export interface ProdottoIniziale {
  nome: string;
  categoria: 'frigo' | 'dispensa';
  tipo: 'countable' | 'uncountable';
}

export const PRODOTTI_INIZIALI: ProdottoIniziale[] = [
  ...NOMI_PRODOTTI_FRIGO.map(
    (nome): ProdottoIniziale => ({
      nome,
      categoria: 'frigo',
      tipo: PRODOTTI_A_PEZZI.has(nome) ? 'countable' : 'uncountable',
    }),
  ),
  ...NOMI_PRODOTTI_DISPENSA.map(
    (nome): ProdottoIniziale => ({
      nome,
      categoria: 'dispensa',
      tipo: PRODOTTI_A_PEZZI.has(nome) ? 'countable' : 'uncountable',
    }),
  ),
];
