create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique,
  full_name text,
  email text,
  avatar_url text,
  show_todays_schedule_sidebar boolean not null default false,
  schedule_country_code text not null default 'US',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_length check (char_length(username) >= 3),
  constraint schedule_country_code_len check (char_length(schedule_country_code) = 2)
);

alter table public.profiles
  add column if not exists show_todays_schedule_sidebar boolean not null default false;

alter table public.profiles
  add column if not exists schedule_country_code text not null default 'US';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_username text;
begin
  generated_username := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    split_part(coalesce(new.email, ''), '@', 1) || '_' || left(replace(new.id::text, '-', ''), 6)
  );

  insert into public.profiles (id, username, full_name, email, avatar_url)
  values (
    new.id,
    generated_username,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create table if not exists public.tracked_shows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tvmaze_show_id bigint not null,
  show_name text not null,
  show_status text,
  image_url text,
  network_name text,
  genres text[] not null default '{}',
  premiered date,
  ended date,
  rating numeric(3,1),
  raw_show jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tracked_shows_user_show_unique unique (user_id, tvmaze_show_id)
);

create index if not exists idx_tracked_shows_user_id on public.tracked_shows(user_id);
create index if not exists idx_tracked_shows_tvmaze_show_id on public.tracked_shows(tvmaze_show_id);

drop trigger if exists tracked_shows_set_updated_at on public.tracked_shows;
create trigger tracked_shows_set_updated_at
before update on public.tracked_shows
for each row
execute function public.set_updated_at();

create table if not exists public.watched_episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tvmaze_episode_id bigint not null,
  tvmaze_show_id bigint not null,
  season integer,
  episode_number integer,
  episode_name text,
  airdate date,
  watched_at timestamptz not null default now(),
  raw_episode jsonb,
  constraint watched_episodes_user_episode_unique unique (user_id, tvmaze_episode_id)
);

create index if not exists idx_watched_episodes_user_id on public.watched_episodes(user_id);
create index if not exists idx_watched_episodes_show_id on public.watched_episodes(tvmaze_show_id);

alter table public.profiles enable row level security;
alter table public.tracked_shows enable row level security;
alter table public.watched_episodes enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists tracked_shows_owner_all on public.tracked_shows;
create policy tracked_shows_owner_all
on public.tracked_shows
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists watched_episodes_owner_all on public.watched_episodes;
create policy watched_episodes_owner_all
on public.watched_episodes
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =========================================
-- V2 tracking model (TMDB primary + fallback providers)
-- =========================================

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'user_show_status'
      and n.nspname = 'public'
  ) then
    create type public.user_show_status as enum ('watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch');
  end if;
end
$$;

create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'tvmaze',
  external_id bigint not null,
  title text not null,
  poster_url text,
  backdrop_url text,
  overview text,
  genres text[] not null default '{}',
  season_count integer,
  show_status text,
  premiered date,
  ended date,
  network_name text,
  rating numeric(3,1),
  runtime integer,
  next_episode_air_date date,
  metadata jsonb,
  last_synced timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shows_provider_external_unique unique (provider, external_id)
);

create index if not exists idx_shows_provider_external_id on public.shows(provider, external_id);
create index if not exists idx_shows_last_synced on public.shows(last_synced);

drop trigger if exists shows_set_updated_at on public.shows;
create trigger shows_set_updated_at
before update on public.shows
for each row
execute function public.set_updated_at();

create table if not exists public.show_episodes (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  season_number integer not null,
  episode_number integer not null,
  external_episode_id bigint,
  episode_name text not null,
  air_date date,
  runtime integer,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint show_episodes_unique unique (show_id, season_number, episode_number)
);

create index if not exists idx_show_episodes_show_id on public.show_episodes(show_id);
create index if not exists idx_show_episodes_air_date on public.show_episodes(air_date);

drop trigger if exists show_episodes_set_updated_at on public.show_episodes;
create trigger show_episodes_set_updated_at
before update on public.show_episodes
for each row
execute function public.set_updated_at();

create table if not exists public.user_shows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  status public.user_show_status not null default 'watching',
  rating numeric(3,1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_shows_unique unique (user_id, show_id)
);

create index if not exists idx_user_shows_user_id on public.user_shows(user_id);
create index if not exists idx_user_shows_show_id on public.user_shows(show_id);
create index if not exists idx_user_shows_status on public.user_shows(status);

drop trigger if exists user_shows_set_updated_at on public.user_shows;
create trigger user_shows_set_updated_at
before update on public.user_shows
for each row
execute function public.set_updated_at();

create table if not exists public.episode_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  season_number integer not null,
  episode_number integer not null,
  external_episode_id bigint,
  watched boolean not null default true,
  watched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint episode_progress_unique unique (user_id, show_id, season_number, episode_number)
);

create index if not exists idx_episode_progress_user_id on public.episode_progress(user_id);
create index if not exists idx_episode_progress_show_id on public.episode_progress(show_id);
create index if not exists idx_episode_progress_external_episode_id on public.episode_progress(external_episode_id);
create index if not exists idx_episode_progress_watched on public.episode_progress(watched);

drop trigger if exists episode_progress_set_updated_at on public.episode_progress;
create trigger episode_progress_set_updated_at
before update on public.episode_progress
for each row
execute function public.set_updated_at();

alter table public.shows enable row level security;
alter table public.show_episodes enable row level security;
alter table public.user_shows enable row level security;
alter table public.episode_progress enable row level security;

drop policy if exists shows_select_authenticated on public.shows;
create policy shows_select_authenticated
on public.shows
for select
using (auth.uid() is not null);

drop policy if exists shows_insert_authenticated on public.shows;
create policy shows_insert_authenticated
on public.shows
for insert
with check (auth.uid() is not null);

drop policy if exists shows_update_authenticated on public.shows;
create policy shows_update_authenticated
on public.shows
for update
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists show_episodes_select_authenticated on public.show_episodes;
create policy show_episodes_select_authenticated
on public.show_episodes
for select
using (auth.uid() is not null);

drop policy if exists show_episodes_insert_authenticated on public.show_episodes;
create policy show_episodes_insert_authenticated
on public.show_episodes
for insert
with check (auth.uid() is not null);

drop policy if exists show_episodes_update_authenticated on public.show_episodes;
create policy show_episodes_update_authenticated
on public.show_episodes
for update
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists user_shows_owner_all on public.user_shows;
create policy user_shows_owner_all
on public.user_shows
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists episode_progress_owner_all on public.episode_progress;
create policy episode_progress_owner_all
on public.episode_progress
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
