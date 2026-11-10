-- =====================================================================
-- Celbrea.IA – banco de dados (Supabase / PostgreSQL)
-- Execute uma única vez em: Supabase → SQL Editor → New query → Run
-- =====================================================================

-- ---------- Profissionais (um por login) ----------
create table if not exists public.profissionais (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  registro text default '',
  papel text not null default 'profissional' check (papel in ('profissional', 'admin')),
  ativo boolean not null default false,          -- liberado por um administrador
  termos_versao text,
  termos_aceito_em timestamptz,
  criado_em timestamptz not null default now()
);

-- ---------- Testes registrados ----------
create table if not exists public.registros (
  id uuid primary key,
  criado_em timestamptz not null default now(),
  salvo_em timestamptz not null default now(),
  criado_por uuid references auth.users (id),
  salvo_por uuid references auth.users (id),
  data_teste date,
  status text,                                   -- ok | alt | inc | pend
  resultado text,
  dados jsonb not null                           -- formulário completo + linha da planilha
);
create index if not exists registros_salvo_em_idx on public.registros (salvo_em desc);

-- ---------- Registro (log) dos aceites do termo LGPD ----------
create table if not exists public.aceites_lgpd (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text,
  email text,
  registro text,
  termos_versao text not null,
  aceito_em timestamptz not null default now(),
  origem text                                    -- cadastro | reaceite
);

-- ---------- Funções auxiliares ----------
create or replace function public.is_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profissionais where id = auth.uid() and ativo);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profissionais where id = auth.uid() and ativo and papel = 'admin');
$$;

-- Cria o perfil e registra o aceite LGPD no momento do cadastro
create or replace function public.novo_profissional() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profissionais (id, nome, email, registro, termos_versao, termos_aceito_em)
  values (new.id, coalesce(nullif(m->>'nome', ''), new.email), lower(new.email), coalesce(m->>'registro', ''),
          m->>'termos_versao', coalesce((m->>'termos_aceito_em')::timestamptz, now()))
  on conflict (id) do nothing;
  if m ? 'termos_versao' then
    insert into public.aceites_lgpd (user_id, nome, email, registro, termos_versao, aceito_em, origem)
    values (new.id, m->>'nome', lower(new.email), m->>'registro', m->>'termos_versao',
            coalesce((m->>'termos_aceito_em')::timestamptz, now()), 'cadastro');
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.novo_profissional();

-- Novo aceite (quando o termo muda de versão)
create or replace function public.aceitar_termos(versao text) returns void
language plpgsql security definer set search_path = public as $$
declare p public.profissionais;
begin
  select * into p from public.profissionais where id = auth.uid();
  if not found then raise exception 'perfil não encontrado'; end if;
  update public.profissionais set termos_versao = versao, termos_aceito_em = now() where id = auth.uid();
  insert into public.aceites_lgpd (user_id, nome, email, registro, termos_versao, origem)
  values (auth.uid(), p.nome, p.email, p.registro, versao, 'reaceite');
end;
$$;

-- Administrador libera/bloqueia profissionais e define papéis
create or replace function public.definir_profissional(alvo uuid, novo_ativo boolean, novo_papel text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'apenas administradores'; end if;
  if alvo = auth.uid() and (not novo_ativo or novo_papel <> 'admin') then
    raise exception 'você não pode remover o seu próprio acesso de administrador';
  end if;
  if novo_papel not in ('profissional', 'admin') then raise exception 'papel inválido'; end if;
  update public.profissionais set ativo = novo_ativo, papel = novo_papel where id = alvo;
end;
$$;

-- ---------- Segurança: Row Level Security ----------
alter table public.profissionais enable row level security;
alter table public.registros enable row level security;
alter table public.aceites_lgpd enable row level security;

revoke all on public.profissionais, public.registros, public.aceites_lgpd from anon;
revoke insert, update, delete on public.profissionais from authenticated;
revoke update, delete on public.aceites_lgpd from authenticated;
revoke insert on public.aceites_lgpd from authenticated;
grant select on public.profissionais to authenticated;
grant update (nome, registro) on public.profissionais to authenticated;
grant select on public.aceites_lgpd to authenticated;
grant select, insert, update, delete on public.registros to authenticated;
revoke execute on function public.aceitar_termos(text), public.definir_profissional(uuid, boolean, text) from anon, public;
grant execute on function public.aceitar_termos(text), public.definir_profissional(uuid, boolean, text) to authenticated;

drop policy if exists prof_select on public.profissionais;
create policy prof_select on public.profissionais for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists prof_update on public.profissionais;
create policy prof_update on public.profissionais for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists reg_select on public.registros;
create policy reg_select on public.registros for select to authenticated using (public.is_ativo());
drop policy if exists reg_insert on public.registros;
create policy reg_insert on public.registros for insert to authenticated
  with check (public.is_ativo() and salvo_por = auth.uid() and criado_por = auth.uid());
drop policy if exists reg_update on public.registros;
create policy reg_update on public.registros for update to authenticated
  using (public.is_ativo()) with check (public.is_ativo() and salvo_por = auth.uid());
drop policy if exists reg_delete on public.registros;
create policy reg_delete on public.registros for delete to authenticated using (public.is_admin());

drop policy if exists aceite_select on public.aceites_lgpd;
create policy aceite_select on public.aceites_lgpd for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------- Visão para análises diretas no banco (opcional) ----------
create or replace view public.registros_planilha with (security_invoker = true) as
  select r.id, r.data_teste, r.salvo_em, r.status, r.resultado,
         (r.dados->'linha'->>'idade')::numeric as idade,
         (r.dados->'linha'->>'maior_diferenca_colunas')::numeric as maior_diferenca_colunas,
         r.dados->'linha' as linha
  from public.registros r;
grant select on public.registros_planilha to authenticated;

-- =====================================================================
-- DEPOIS de criar o seu próprio cadastro no aplicativo, torne-se
-- administrador (troque o e-mail e rode só esta linha):
--   update public.profissionais set ativo = true, papel = 'admin' where email = 'seu-email@exemplo.com';
-- =====================================================================
