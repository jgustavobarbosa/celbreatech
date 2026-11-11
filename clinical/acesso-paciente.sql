-- Entrada automática como paciente e estados para vínculo.
-- Rode depois de schema.sql e cadastro.sql.

alter table public.usuarios add column if not exists estado_id uuid references public.estados (id);

insert into public.estados (sigla, nome) values
  ('AC', 'Acre'), ('AL', 'Alagoas'), ('AP', 'Amapá'), ('AM', 'Amazonas'), ('BA', 'Bahia'),
  ('CE', 'Ceará'), ('DF', 'Distrito Federal'), ('ES', 'Espírito Santo'), ('GO', 'Goiás'),
  ('MA', 'Maranhão'), ('MT', 'Mato Grosso'), ('MS', 'Mato Grosso do Sul'), ('MG', 'Minas Gerais'),
  ('PA', 'Pará'), ('PB', 'Paraíba'), ('PR', 'Paraná'), ('PE', 'Pernambuco'), ('PI', 'Piauí'),
  ('RJ', 'Rio de Janeiro'), ('RN', 'Rio Grande do Norte'), ('RS', 'Rio Grande do Sul'),
  ('RO', 'Rondônia'), ('RR', 'Roraima'), ('SC', 'Santa Catarina'), ('SP', 'São Paulo'),
  ('SE', 'Sergipe'), ('TO', 'Tocantins')
on conflict (sigla) do nothing;

drop policy if exists est_leitura on public.estados;
create policy est_leitura on public.estados for select to authenticated using (true);

drop policy if exists usu_paciente_sel on public.usuarios;
create policy usu_paciente_sel on public.usuarios for select to authenticated
  using (profissional_id = auth.uid() or public.is_ativo());

drop policy if exists usu_paciente_ins on public.usuarios;
create policy usu_paciente_ins on public.usuarios for insert to authenticated
  with check (profissional_id = auth.uid() and tipo = 'paciente');

drop policy if exists usu_paciente_upd on public.usuarios;
create policy usu_paciente_upd on public.usuarios for update to authenticated
  using (profissional_id = auth.uid())
  with check (profissional_id = auth.uid() and tipo = 'paciente');
