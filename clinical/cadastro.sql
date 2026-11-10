-- Cadastros da linha de cuidado.
-- Rode no SQL Editor depois de schema.sql. Pode rodar de novo.
-- Liga em profissionais e registros, que já existem. Não altera a regra térmica.

create table if not exists public.estados (
  id uuid primary key default gen_random_uuid(),
  sigla text not null unique,
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.municipios (
  id uuid primary key default gen_random_uuid(),
  estado_id uuid not null references public.estados (id),
  nome text not null,
  ibge text not null default '',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (estado_id, nome)
);

create table if not exists public.unidades (
  id uuid primary key default gen_random_uuid(),
  municipio_id uuid not null references public.municipios (id),
  nome text not null,
  cnes text not null default '',
  tipo text not null default 'aps' check (tipo in ('aps', 'imagem', 'referencia', 'laboratorio')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.skus (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  tipo text not null check (tipo in ('adesivo', 'exame', 'procedimento', 'seguimento')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text not null default '',
  tipo text not null default 'paciente' check (tipo in ('paciente', 'profissional')),
  profissional_id uuid references public.profissionais (id) on delete set null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.vinculos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id),
  unidade_id uuid not null references public.unidades (id),
  papel text not null check (papel in ('paciente', 'profissional', 'navegador', 'admin')),
  inicio date not null default current_date,
  fim date,
  criado_em timestamptz not null default now()
);

create table if not exists public.regras (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  quando_status text not null check (quando_status in ('ok', 'alt', 'inc', 'pend', 'birads')),
  acao text not null,
  sku_codigo text references public.skus (codigo),
  descricao text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.permissoes (
  id uuid primary key default gen_random_uuid(),
  papel text not null,
  recurso text not null,
  acao text not null check (acao in ('ler', 'criar', 'editar', 'apagar')),
  criado_em timestamptz not null default now(),
  unique (papel, recurso, acao)
);

create table if not exists public.matriculas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id),
  sku_id uuid not null references public.skus (id),
  unidade_id uuid references public.unidades (id),
  registro_id uuid references public.registros (id) on delete set null,
  status text not null default 'ativa' check (status in ('ativa', 'acompanhamento', 'encerrada')),
  elementos_preditivos jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

insert into public.skus (codigo, nome, tipo) values
  ('PAD-A', 'Adesivo Celbrea A', 'adesivo'),
  ('PAD-B', 'Adesivo Celbrea B', 'adesivo'),
  ('CICLO-PREV', 'Ciclo preventivo', 'seguimento'),
  ('REF-IMAGEM', 'Exame de imagem', 'exame'),
  ('REP-TESTE', 'Repetir teste', 'seguimento'),
  ('SEG-CURTO', 'Seguimento curto', 'seguimento'),
  ('BIO-PROC', 'Biópsia', 'procedimento')
on conflict (codigo) do nothing;

insert into public.regras (codigo, quando_status, acao, sku_codigo, descricao) values
  ('REG-ALT', 'alt', 'abrir_referencia', 'REF-IMAGEM', 'Resultado significativo abre referência para exame de imagem.'),
  ('REG-OK', 'ok', 'ciclo_preventivo', 'CICLO-PREV', 'Resultado não significativo permanece no ciclo preventivo.'),
  ('REG-INC', 'inc', 'repetir', 'REP-TESTE', 'Resultado inconclusivo pede repetição e não abre referência.'),
  ('REG-B12', 'birads', 'devolver_aps', 'CICLO-PREV', 'BI-RADS 1 ou 2 devolve ao ciclo preventivo.'),
  ('REG-B3', 'birads', 'followup_curto', 'SEG-CURTO', 'BI-RADS 3 pede seguimento curto.'),
  ('REG-B45', 'birads', 'biopsia', 'BIO-PROC', 'BI-RADS 4 ou 5 encaminha para biópsia.')
on conflict (codigo) do nothing;

insert into public.permissoes (papel, recurso, acao)
select papel, recurso, acao
from (values
  ('admin'), ('profissional'), ('navegador')
) as papeis(papel)
cross join (values
  ('estados'), ('municipios'), ('unidades'), ('skus'), ('usuarios'),
  ('vinculos'), ('regras'), ('permissoes'), ('matriculas')
) as recursos(recurso)
cross join (values ('ler'), ('criar'), ('editar'), ('apagar')) as acoes(acao)
where papel = 'admin'
   or (papel = 'profissional' and acao = 'ler')
   or (papel = 'profissional' and recurso in ('usuarios', 'vinculos', 'matriculas') and acao in ('criar', 'editar'))
   or (papel = 'navegador' and recurso in ('usuarios', 'unidades', 'skus', 'matriculas') and acao = 'ler')
   or (papel = 'navegador' and recurso in ('vinculos', 'matriculas') and acao in ('criar', 'editar'))
on conflict (papel, recurso, acao) do nothing;

alter table public.estados enable row level security;
alter table public.municipios enable row level security;
alter table public.unidades enable row level security;
alter table public.skus enable row level security;
alter table public.usuarios enable row level security;
alter table public.vinculos enable row level security;
alter table public.regras enable row level security;
alter table public.permissoes enable row level security;
alter table public.matriculas enable row level security;

grant select, insert, update, delete on
  public.estados, public.municipios, public.unidades, public.skus, public.usuarios,
  public.vinculos, public.regras, public.permissoes, public.matriculas
to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'estados', 'municipios', 'unidades', 'skus', 'usuarios',
    'vinculos', 'regras', 'permissoes', 'matriculas'
  ]
  loop
    execute format('drop policy if exists cad_sel on public.%I', t);
    execute format('create policy cad_sel on public.%I for select to authenticated using (public.is_ativo())', t);
    execute format('drop policy if exists cad_ins on public.%I', t);
    execute format('create policy cad_ins on public.%I for insert to authenticated with check (public.is_ativo())', t);
    execute format('drop policy if exists cad_upd on public.%I', t);
    execute format('create policy cad_upd on public.%I for update to authenticated using (public.is_ativo()) with check (public.is_ativo())', t);
    execute format('drop policy if exists cad_del on public.%I', t);
    execute format('create policy cad_del on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;
