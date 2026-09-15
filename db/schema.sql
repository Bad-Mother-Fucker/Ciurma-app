-- Ciurma — schema del database.
-- Tutto pende da `casa`; ogni tabella porta `casa_id` e le policy RLS filtrano su quello.
-- Idempotente: pensato per essere applicato su un database Supabase vuoto.

create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUM
-- ============================================================================

do $$ begin
  create type ruolo_membro as enum ('admin', 'membro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type categoria_dispensa_t as enum ('frigo', 'freezer', 'dispensa', 'casa', 'farmacia');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_conteggio_t as enum ('countable', 'uncountable');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- TABELLE
-- ============================================================================

create table if not exists casa (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  creata_il timestamptz not null default now()
);

create table if not exists membro (
  id uuid primary key default gen_random_uuid(),
  casa_id uuid not null references casa(id) on delete cascade,
  utente_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  colore text not null default '#1F7A8C',
  ruolo ruolo_membro not null default 'membro',
  attivo boolean not null default true,
  creato_il timestamptz not null default now(),
  unique (casa_id, utente_id)
);

create index if not exists membro_casa_idx on membro(casa_id);
create index if not exists membro_utente_idx on membro(utente_id);

create table if not exists invito (
  id uuid primary key default gen_random_uuid(),
  casa_id uuid not null references casa(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'base64url'),
  creato_da uuid not null references membro(id) on delete cascade,
  creato_il timestamptz not null default now(),
  scade_il timestamptz not null default (now() + interval '7 days'),
  usato_il timestamptz,
  usato_da uuid references membro(id) on delete set null
);

create index if not exists invito_casa_idx on invito(casa_id);
create index if not exists invito_token_idx on invito(token);

create table if not exists categoria_attivita (
  id uuid primary key default gen_random_uuid(),
  casa_id uuid not null references casa(id) on delete cascade,
  nome text not null,
  icona text not null default 'sparkles',
  colore text not null default '#1F7A8C',
  archiviata boolean not null default false,
  ordine int not null default 0,
  creata_il timestamptz not null default now()
);

create index if not exists categoria_attivita_casa_idx on categoria_attivita(casa_id);

create table if not exists attivita (
  id uuid primary key default gen_random_uuid(),
  casa_id uuid not null references casa(id) on delete cascade,
  categoria_id uuid not null references categoria_attivita(id) on delete cascade,
  nome text not null,
  cadenza_giorni int not null check (cadenza_giorni > 0),
  giorni_settimana smallint[] default null,
  attiva boolean not null default true,
  ordine int not null default 0,
  creata_il timestamptz not null default now(),
  constraint attivita_giorni_validi check (
    giorni_settimana is null or (
      giorni_settimana <@ array[0,1,2,3,4,5,6]::smallint[]
    )
  )
);

create index if not exists attivita_casa_idx on attivita(casa_id);
create index if not exists attivita_categoria_idx on attivita(categoria_id);

create table if not exists assegnazione (
  id uuid primary key default gen_random_uuid(),
  casa_id uuid not null references casa(id) on delete cascade,
  categoria_id uuid not null references categoria_attivita(id) on delete cascade,
  membro_id uuid not null references membro(id) on delete cascade,
  giorni_settimana smallint[] not null,
  creata_il timestamptz not null default now(),
  constraint assegnazione_giorni_validi check (
    giorni_settimana <@ array[0,1,2,3,4,5,6]::smallint[]
  )
);

create index if not exists assegnazione_casa_idx on assegnazione(casa_id);
create index if not exists assegnazione_categoria_idx on assegnazione(categoria_id);
create index if not exists assegnazione_membro_idx on assegnazione(membro_id);

create table if not exists completamento (
  id uuid primary key default gen_random_uuid(),
  casa_id uuid not null references casa(id) on delete cascade,
  attivita_id uuid not null references attivita(id) on delete cascade,
  membro_id uuid not null references membro(id) on delete cascade,
  completata_il timestamptz not null default now(),
  nota text
);

create index if not exists completamento_attivita_idx on completamento(attivita_id, completata_il desc);
create index if not exists completamento_casa_idx on completamento(casa_id);

create table if not exists prodotto (
  id uuid primary key default gen_random_uuid(),
  casa_id uuid not null references casa(id) on delete cascade,
  nome text not null,
  categoria_dispensa categoria_dispensa_t not null default 'dispensa',
  tipo_conteggio tipo_conteggio_t not null default 'uncountable',
  unita text,
  quantita numeric not null default 0,
  scorta_minima numeric not null default 0,
  scadenza date,
  aggiornato_il timestamptz not null default now(),
  creato_il timestamptz not null default now()
);

create index if not exists prodotto_casa_idx on prodotto(casa_id);
create index if not exists prodotto_categoria_idx on prodotto(casa_id, categoria_dispensa);

create table if not exists voce_spesa (
  id uuid primary key default gen_random_uuid(),
  casa_id uuid not null references casa(id) on delete cascade,
  prodotto_id uuid references prodotto(id) on delete set null,
  nome text not null,
  quantita_desiderata numeric,
  unita text,
  aggiunta_da uuid not null references membro(id) on delete cascade,
  presa_il timestamptz,
  presa_da uuid references membro(id) on delete set null,
  creata_il timestamptz not null default now()
);

create index if not exists voce_spesa_casa_idx on voce_spesa(casa_id);

-- Un prodotto non può avere due voci aperte contemporaneamente.
create unique index if not exists voce_spesa_prodotto_aperta_uidx
  on voce_spesa(prodotto_id)
  where prodotto_id is not null and presa_il is null;

-- ============================================================================
-- FUNZIONI DI SUPPORTO / SICUREZZA
-- ============================================================================

create or replace function case_dell_utente()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.casa_id
  from membro m
  where m.utente_id = auth.uid()
    and m.attivo = true;
$$;

-- `aggiornato_il` su prodotto sempre via trigger, mai dal client.
create or replace function tocca_aggiornato_il()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.aggiornato_il := now();
  return new;
end;
$$;

drop trigger if exists prodotto_tocca_aggiornato_il on prodotto;
create trigger prodotto_tocca_aggiornato_il
  before update on prodotto
  for each row execute function tocca_aggiornato_il();

-- Spuntare una voce di spesa (presa_il valorizzato) -> la quantità torna in dispensa.
create or replace function voce_spesa_ripristina_dispensa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.presa_il is not null and old.presa_il is null and new.prodotto_id is not null then
    update prodotto
    set quantita = quantita + coalesce(new.quantita_desiderata, 0)
    where id = new.prodotto_id;
  end if;
  return new;
end;
$$;

drop trigger if exists voce_spesa_dopo_presa on voce_spesa;
create trigger voce_spesa_dopo_presa
  before update on voce_spesa
  for each row execute function voce_spesa_ripristina_dispensa();

-- Lettura di un invito valido per token, per un utente non ancora membro.
create or replace function invito_da_token(p_token text)
returns table (
  id uuid,
  casa_id uuid,
  casa_nome text,
  scade_il timestamptz,
  usato_il timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.casa_id, c.nome, i.scade_il, i.usato_il
  from invito i
  join casa c on c.id = i.casa_id
  where i.token = p_token;
$$;

-- Accetta un invito: crea il membro per l'utente corrente e marca l'invito usato.
-- Atomico e verificato lato server: non fidarsi del client per lo stato dell'invito.
create or replace function accetta_invito(p_token text, p_nome text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invito invito%rowtype;
  v_membro_id uuid;
begin
  select * into v_invito from invito where token = p_token for update;

  if v_invito.id is null then
    raise exception 'invito_non_trovato';
  end if;
  if v_invito.usato_il is not null then
    raise exception 'invito_gia_usato';
  end if;
  if v_invito.scade_il < now() then
    raise exception 'invito_scaduto';
  end if;

  insert into membro (casa_id, utente_id, nome, ruolo)
  values (v_invito.casa_id, auth.uid(), p_nome, 'membro')
  on conflict (casa_id, utente_id) do update set attivo = true
  returning id into v_membro_id;

  update invito set usato_il = now(), usato_da = v_membro_id where id = v_invito.id;

  return v_membro_id;
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table casa enable row level security;
alter table membro enable row level security;
alter table invito enable row level security;
alter table categoria_attivita enable row level security;
alter table attivita enable row level security;
alter table assegnazione enable row level security;
alter table completamento enable row level security;
alter table prodotto enable row level security;
alter table voce_spesa enable row level security;

-- casa: visibile ai membri della casa.
create policy casa_seleziona on casa for select
  using (id in (select case_dell_utente()));
create policy casa_crea on casa for insert
  with check (true);
create policy casa_aggiorna on casa for update
  using (id in (select case_dell_utente()));

-- membro: visibile e gestibile solo dentro la propria casa.
create policy membro_seleziona on membro for select
  using (casa_id in (select case_dell_utente()));
create policy membro_inserisce on membro for insert
  with check (casa_id in (select case_dell_utente()) or utente_id = auth.uid());
create policy membro_aggiorna on membro for update
  using (casa_id in (select case_dell_utente()));

-- invito: gestibile solo da membri della casa. La lettura per token pubblico
-- passa dalla funzione invito_da_token/accetta_invito (security definer), non da qui.
create policy invito_seleziona on invito for select
  using (casa_id in (select case_dell_utente()));
create policy invito_crea on invito for insert
  with check (casa_id in (select case_dell_utente()));
create policy invito_aggiorna on invito for update
  using (casa_id in (select case_dell_utente()));

create policy categoria_attivita_tutto on categoria_attivita for all
  using (casa_id in (select case_dell_utente()))
  with check (casa_id in (select case_dell_utente()));

create policy attivita_tutto on attivita for all
  using (casa_id in (select case_dell_utente()))
  with check (casa_id in (select case_dell_utente()));

create policy assegnazione_tutto on assegnazione for all
  using (casa_id in (select case_dell_utente()))
  with check (casa_id in (select case_dell_utente()));

create policy completamento_tutto on completamento for all
  using (casa_id in (select case_dell_utente()))
  with check (casa_id in (select case_dell_utente()));

create policy prodotto_tutto on prodotto for all
  using (casa_id in (select case_dell_utente()))
  with check (casa_id in (select case_dell_utente()));

create policy voce_spesa_tutto on voce_spesa for all
  using (casa_id in (select case_dell_utente()))
  with check (casa_id in (select case_dell_utente()));

-- ============================================================================
-- REALTIME
-- ============================================================================

do $$ begin
  alter publication supabase_realtime add table completamento;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table prodotto;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table voce_spesa;
exception when duplicate_object then null; end $$;

-- Non richiesto esplicitamente dalla specifica (che elenca solo
-- completamento/prodotto/voce_spesa), ma serve perché "due account entrano
-- nella stessa casa e si vedono a vicenda" (criterio di uscita fase 1) sia
-- vero anche senza un refresh manuale della pagina.
do $$ begin
  alter publication supabase_realtime add table membro;
exception when duplicate_object then null; end $$;
