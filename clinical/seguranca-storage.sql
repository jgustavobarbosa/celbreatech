-- CELBREA.IA: área privada para o código do aplicativo
-- Só profissionais LIBERADOS (ativos) conseguem baixar o aplicativo depois do login.

insert into storage.buckets (id, name, public)
values ('app-privado', 'app-privado', false)
on conflict (id) do update set public = false;

drop policy if exists app_privado_ler on storage.objects;
create policy app_privado_ler on storage.objects
  for select to authenticated
  using (bucket_id = 'app-privado' and public.is_ativo());

select id, name, public from storage.buckets where id = 'app-privado';
