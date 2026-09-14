-- Ciurma — seed di una casa di prova.
--
-- Richiede che due utenti Supabase Auth esistano già (Clara e Michele) e che i
-- loro UUID siano passati come variabili psql:
--
--   psql "$DATABASE_URL" \
--     -v clara_uid="'00000000-0000-0000-0000-000000000001'" \
--     -v michele_uid="'00000000-0000-0000-0000-000000000002'" \
--     -f db/seed.sql
--
-- In pratica è più comodo usare `npm run seed` (scripts/seed.ts), che crea
-- anche gli utenti auth via service role e chiama questa stessa logica in
-- JS. Questo file resta come riferimento SQL puro e per riapplicare il seed
-- dati direttamente in psql/SQL editor quando gli utenti esistono già.

begin;

with nuova_casa as (
  insert into casa (nome) values ('Casa di prova') returning id
),
membro_clara as (
  insert into membro (casa_id, utente_id, nome, colore, ruolo)
  select id, :clara_uid::uuid, 'Clara', '#E4A03C', 'admin' from nuova_casa
  returning id, casa_id
),
membro_michele as (
  insert into membro (casa_id, utente_id, nome, colore, ruolo)
  select casa_id, :michele_uid::uuid, 'Michele', '#1F7A8C', 'membro' from membro_clara
  returning id, casa_id
),
cat_cucina as (
  insert into categoria_attivita (casa_id, nome, icona, colore, ordine)
  select casa_id, 'Cucina', 'utensils', '#E4A03C', 0 from membro_clara
  returning id, casa_id
),
cat_faccende as (
  insert into categoria_attivita (casa_id, nome, icona, colore, ordine)
  select casa_id, 'Faccende domestiche', 'sparkles', '#1F7A8C', 1 from cat_cucina
  returning id, casa_id
),
attivita_cucina as (
  insert into attivita (casa_id, categoria_id, nome, cadenza_giorni, giorni_settimana, ordine)
  select cat_cucina.casa_id, cat_cucina.id, v.nome, v.cadenza, v.giorni, v.ordine
  from cat_cucina, (values
    ('Preparare la colazione', 1, null::smallint[], 0),
    ('Preparare il pranzo', 1, null::smallint[], 1),
    ('Preparare la cena', 1, null::smallint[], 2),
    ('Pianificare i pasti della settimana', 7, array[0]::smallint[], 3)
  ) as v(nome, cadenza, giorni, ordine)
  returning id
),
attivita_faccende as (
  insert into attivita (casa_id, categoria_id, nome, cadenza_giorni, giorni_settimana, ordine)
  select cat_faccende.casa_id, cat_faccende.id, v.nome, v.cadenza, v.giorni, v.ordine
  from cat_faccende, (values
    ('Riordinare', 1, null::smallint[], 0),
    ('Buttare la spazzatura', 2, null::smallint[], 1),
    ('Svuotare il secchio del climatizzatore', 3, null::smallint[], 2),
    ('Svuotare e riporre lo stendino', 3, null::smallint[], 3),
    ('Innaffiare le piante', 4, null::smallint[], 4),
    ('Lavatrice', 3, array[2,4]::smallint[], 5),
    ('Spolverare', 7, null::smallint[], 6),
    ('Lavare il pavimento', 7, null::smallint[], 7),
    ('Pulire il bagno', 7, null::smallint[], 8),
    ('Pulire la doccia', 7, null::smallint[], 9),
    ('Pulire la camera da letto', 7, null::smallint[], 10),
    ('Pulire scrivania e angolo ingresso', 7, null::smallint[], 11),
    ('Fare la spesa', 7, null::smallint[], 12),
    ('Pulire il terrazzo', 14, null::smallint[], 13),
    ('Pulire la friggitrice', 14, null::smallint[], 14),
    ('Pulire la brocca', 14, null::smallint[], 15),
    ('Pulire l''aspirapolvere', 14, null::smallint[], 16),
    ('Riordinare l''armadio', 30, null::smallint[], 17),
    ('Pulire il frigorifero', 30, null::smallint[], 18),
    ('Pulire i vetri', 30, null::smallint[], 19),
    ('Pulire i cassetti della cucina', 30, null::smallint[], 20)
  ) as v(nome, cadenza, giorni, ordine)
  returning id
),
assegna_cucina as (
  insert into assegnazione (casa_id, categoria_id, membro_id, giorni_settimana)
  select cat_cucina.casa_id, cat_cucina.id, membro_clara.id, array[0,1,2,3,4,5,6]::smallint[]
  from cat_cucina, membro_clara
  returning id
),
assegna_faccende as (
  insert into assegnazione (casa_id, categoria_id, membro_id, giorni_settimana)
  select cat_faccende.casa_id, cat_faccende.id, membro_michele.id, array[1,3,4]::smallint[]
  from cat_faccende, membro_michele
  returning id
),
prodotti as (
  insert into prodotto (casa_id, nome, categoria_dispensa, tipo_conteggio)
  select membro_clara.casa_id, v.nome, v.cat::categoria_dispensa_t, v.conteggio::tipo_conteggio_t
  from membro_clara, (values
    -- Frigo
    ('Uova BIO', 'frigo', 'countable'),
    ('Albume', 'frigo', 'uncountable'),
    ('Yogurt bianco senza lattosio BIO', 'frigo', 'countable'),
    ('Yogurt di capra o pecora', 'frigo', 'countable'),
    ('Ricotta di capra', 'frigo', 'uncountable'),
    ('Parmigiano Reggiano DOP 36 mesi', 'frigo', 'uncountable'),
    ('Grana a scaglie', 'frigo', 'uncountable'),
    ('Burro ghee', 'frigo', 'uncountable'),
    ('Prosciutto crudo (San Daniele o Parma)', 'frigo', 'uncountable'),
    ('Petto di pollo', 'frigo', 'uncountable'),
    ('Straccetti di pollo', 'frigo', 'uncountable'),
    ('Hamburger di pollo', 'frigo', 'countable'),
    ('Bocconcini di tacchino', 'frigo', 'uncountable'),
    ('Bistecchina di carni bianche', 'frigo', 'countable'),
    ('Straccetti di manzo', 'frigo', 'uncountable'),
    ('Carne di vitello macinata', 'frigo', 'uncountable'),
    ('Hamburger di vitello', 'frigo', 'countable'),
    ('Orata', 'frigo', 'countable'),
    ('Filetto di merluzzo o nasello', 'frigo', 'uncountable'),
    ('Trancio di salmone d''Alaska', 'frigo', 'countable'),
    ('Salmone selvaggio d''Alaska affumicato', 'frigo', 'uncountable'),
    -- Frutta e verdura
    ('Avocado', 'frigo', 'countable'),
    ('Banana BIO', 'frigo', 'countable'),
    ('Kiwi gialli', 'frigo', 'countable'),
    ('Mele', 'frigo', 'countable'),
    ('Mirtilli', 'frigo', 'uncountable'),
    ('Carote', 'frigo', 'uncountable'),
    ('Finocchi', 'frigo', 'countable'),
    ('Scarola', 'frigo', 'countable'),
    ('Indivia', 'frigo', 'countable'),
    ('Lattughino', 'frigo', 'uncountable'),
    ('Misticanza', 'frigo', 'uncountable'),
    ('Rucola', 'frigo', 'uncountable'),
    ('Pomodorini', 'frigo', 'uncountable'),
    ('Zucca', 'frigo', 'uncountable'),
    ('Zucchine', 'frigo', 'uncountable'),
    ('Melanzane', 'frigo', 'countable'),
    ('Bietole', 'frigo', 'uncountable'),
    ('Patate', 'frigo', 'uncountable'),
    ('Patate dolci', 'frigo', 'uncountable'),
    ('Piselli', 'frigo', 'uncountable'),
    -- Dispensa
    ('Quinoa', 'dispensa', 'uncountable'),
    ('Couscous', 'dispensa', 'uncountable'),
    ('Riso italiano', 'dispensa', 'uncountable'),
    ('Pasta di grano saraceno', 'dispensa', 'uncountable'),
    ('Pasta di legumi Felicia', 'dispensa', 'uncountable'),
    ('Fiocchi d''avena', 'dispensa', 'uncountable'),
    ('Fiocchi d''avena tostati', 'dispensa', 'uncountable'),
    ('Farina tollerata', 'dispensa', 'uncountable'),
    ('Pane a lievito madre', 'dispensa', 'uncountable'),
    ('Piadine', 'dispensa', 'countable'),
    ('Chips di patate', 'dispensa', 'uncountable'),
    ('Filetti di tonno al naturale (vetro)', 'dispensa', 'countable'),
    ('Olio extra vergine di oliva', 'dispensa', 'uncountable'),
    ('Olive taggiasche', 'dispensa', 'uncountable'),
    ('Noci', 'dispensa', 'uncountable'),
    ('Crema di mandorle 100%', 'dispensa', 'uncountable'),
    ('Cocco rapè', 'dispensa', 'uncountable'),
    ('Cioccolato fondente 85%', 'dispensa', 'uncountable'),
    ('Cannella', 'dispensa', 'uncountable'),
    ('Alloro', 'dispensa', 'uncountable'),
    ('Basilico', 'dispensa', 'uncountable'),
    ('Salvia', 'dispensa', 'uncountable'),
    ('Tisana malva', 'dispensa', 'countable')
  ) as v(nome, cat, conteggio)
  returning id
)
select 'seed completato' as risultato;

commit;
