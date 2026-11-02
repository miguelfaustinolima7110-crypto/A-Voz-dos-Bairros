-- Execute no SQL Editor do seu projeto Supabase.
-- IMPORTANTE: endereços ficam privados no perfil e não são exibidos nos relatos.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  address text not null,
  cep text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  neighborhood text,
  description text not null,
  status text not null default 'Recebido',
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(report_id, user_id)
);

create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text not null,
  area text,
  contact text,
  active boolean not null default false,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.votes enable row level security;
alter table public.professionals enable row level security;

create policy "profiles read own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "reports visible to everyone" on public.reports for select to anon, authenticated using (true);
create policy "registered users create reports" on public.reports for insert to authenticated with check (auth.uid() = user_id);
create policy "owner can update own report" on public.reports for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "vote totals visible" on public.votes for select to anon, authenticated using (true);
create policy "registered users vote as themselves" on public.votes for insert to authenticated with check (auth.uid() = user_id);
create policy "users remove own vote" on public.votes for delete to authenticated using (auth.uid() = user_id);

create policy "active professionals visible" on public.professionals for select to anon, authenticated using (active = true);
