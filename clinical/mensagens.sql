-- Mensagens internas da linha de cuidado.
-- Rode depois de schema.sql. Não envia WhatsApp, e-mail ou SMS.

create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  destinatario text not null,
  assunto text not null,
  corpo text not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'pronta')),
  registro_id uuid references public.registros (id) on delete set null,
  criada_em timestamptz not null default now()
);

alter table public.mensagens enable row level security;
grant select, insert, update, delete on public.mensagens to authenticated;

drop policy if exists msg_sel on public.mensagens;
create policy msg_sel on public.mensagens for select to authenticated using (public.is_ativo());
drop policy if exists msg_ins on public.mensagens;
create policy msg_ins on public.mensagens for insert to authenticated with check (public.is_ativo());
drop policy if exists msg_upd on public.mensagens;
create policy msg_upd on public.mensagens for update to authenticated using (public.is_ativo()) with check (public.is_ativo());
drop policy if exists msg_del on public.mensagens;
create policy msg_del on public.mensagens for delete to authenticated using (public.is_admin());
