-- Calculadora ICOMM: estrutura completa (consolidado das migrações do projeto antigo)
create table public.membros (
  email text primary key check (email = lower(email)),
  admin boolean not null default false,
  criado_em timestamptz not null default now(),
  todas_contas boolean not null default false,
  contas text[] not null default '{}'
);

create or replace function public.email_atual() returns text
language sql stable set search_path = '' as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.is_membro() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membros m where m.email = public.email_atual())
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membros m where m.email = public.email_atual() and m.admin)
$$;

alter table public.membros enable row level security;
create policy "membros leem a lista" on public.membros for select to authenticated using (public.is_membro());
create policy "admins incluem" on public.membros for insert to authenticated with check (public.is_admin());
create policy "admins alteram" on public.membros for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins removem" on public.membros for delete to authenticated using (public.is_admin() and email <> public.email_atual());

do $$
declare t text;
begin
  foreach t in array array['produtos','simulacoes','contas','parametros'] loop
    execute format('create table public.%I (
      id text primary key,
      data jsonb not null,
      atualizado_em timestamptz not null default now(),
      atualizado_por text not null default public.email_atual()
    )', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "membros leem" on public.%I for select to authenticated using (public.is_membro())', t);
    execute format('create policy "membros incluem" on public.%I for insert to authenticated with check (public.is_membro())', t);
    execute format('create policy "membros alteram" on public.%I for update to authenticated using (public.is_membro()) with check (public.is_membro())', t);
    execute format('create policy "membros apagam" on public.%I for delete to authenticated using (public.is_membro())', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;

create or replace function public.marca_atualizacao() returns trigger
language plpgsql set search_path = '' as $$
begin new.atualizado_em := now(); new.atualizado_por := public.email_atual(); return new; end $$;

create trigger t_prod before update on public.produtos for each row execute function public.marca_atualizacao();
create trigger t_sim before update on public.simulacoes for each row execute function public.marca_atualizacao();
create trigger t_contas before update on public.contas for each row execute function public.marca_atualizacao();
create trigger t_param before update on public.parametros for each row execute function public.marca_atualizacao();

create or replace function public.confirma_membro_no_cadastro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.membros m where m.email = lower(new.email)) then
    new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  end if;
  return new;
end $$;
create trigger confirma_membro before insert on auth.users for each row execute function public.confirma_membro_no_cadastro();

create or replace function public.confirma_usuario_ao_liberar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where lower(email) = new.email;
  return new;
end $$;
create trigger confirma_ao_liberar after insert on public.membros for each row execute function public.confirma_usuario_ao_liberar();

create or replace function public.pode_ver_conta(conta text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(conta,'') = '_default' or exists (
    select 1 from public.membros m
    where m.email = public.email_atual()
      and (m.admin or m.todas_contas or coalesce(conta,'') = any(m.contas))
  )
$$;

create policy "so contas permitidas" on public.produtos as restrictive for all to authenticated
  using (public.pode_ver_conta(coalesce(data->>'cliente','Sem conta')))
  with check (public.pode_ver_conta(coalesce(data->>'cliente','Sem conta')));
create policy "so contas permitidas" on public.simulacoes as restrictive for all to authenticated
  using (public.pode_ver_conta(coalesce(data->>'cliente','Sem conta')))
  with check (public.pode_ver_conta(coalesce(data->>'cliente','Sem conta')));
create policy "so contas permitidas" on public.contas as restrictive for all to authenticated
  using (public.pode_ver_conta(data->>'nome'))
  with check (public.pode_ver_conta(data->>'nome'));
create policy "so contas permitidas" on public.parametros as restrictive for all to authenticated
  using (public.pode_ver_conta(data->>'conta'))
  with check (public.pode_ver_conta(data->>'conta') and (data->>'conta' <> '_default' or public.is_admin()));

-- permissões das funções
revoke execute on function public.is_membro() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.email_atual() from public, anon;
revoke execute on function public.marca_atualizacao() from public, anon, authenticated;
revoke all on function public.confirma_membro_no_cadastro() from public, anon, authenticated;
revoke all on function public.confirma_usuario_ao_liberar() from public, anon, authenticated;
revoke all on function public.pode_ver_conta(text) from public, anon;
grant execute on function public.is_membro() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.email_atual() to authenticated;
grant execute on function public.pode_ver_conta(text) to authenticated;
