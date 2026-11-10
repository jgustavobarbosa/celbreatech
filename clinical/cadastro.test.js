const test = require('node:test');
const assert = require('node:assert/strict');
const cad = require('./cadastro.js');

function base() {
  return cad.seedBasics(cad.emptyStore());
}
function territorio(store) {
  const uf = cad.criar(store, 'estados', { sigla: 'SP', nome: 'São Paulo' }, 'admin');
  const mun = cad.criar(store, 'municipios', { estadoId: uf.row.id, nome: 'São Paulo', ibge: '3550308' }, 'admin');
  const un = cad.criar(store, 'unidades', { municipioId: mun.row.id, nome: 'UBS Centro', cnes: '1234567', tipo: 'aps' }, 'admin');
  return un.row;
}

test('SKUs básicos e regras de referência entram no cadastro', () => {
  const store = base();
  assert.equal(store.skus.length, 7);
  assert.ok(store.skus.some((s) => s.codigo === 'PAD-A'));
  assert.ok(store.regras.some((r) => r.codigo === 'REG-ALT' && r.acao === 'abrir_referencia'));
  assert.equal(cad.pode(store, 'profissional', 'estados', 'apagar'), false);
  assert.equal(cad.pode(store, 'admin', 'usuarios', 'criar'), true);
});

test('município exige estado e unidade exige município', () => {
  const store = base();
  assert.equal(cad.criar(store, 'municipios', { nome: 'Campinas' }, 'admin').motivo, 'estado');
  const uf = cad.criar(store, 'estados', { sigla: 'sp', nome: 'São Paulo' }, 'admin');
  assert.equal(uf.row.sigla, 'SP');
  const mun = cad.criar(store, 'municipios', { estadoId: uf.row.id, nome: 'Campinas' }, 'admin');
  assert.equal(cad.criar(store, 'unidades', { nome: 'UBS' }, 'admin').motivo, 'municipio');
  assert.equal(cad.criar(store, 'unidades', { municipioId: mun.row.id, nome: 'UBS' }, 'admin').ok, true);
});

test('estado em uso não é apagado e sigla duplicada é recusada', () => {
  const store = base();
  const uf = cad.criar(store, 'estados', { sigla: 'RJ', nome: 'Rio de Janeiro' }, 'admin');
  cad.criar(store, 'municipios', { estadoId: uf.row.id, nome: 'Niterói' }, 'admin');
  assert.equal(cad.apagar(store, 'estados', uf.row.id, 'admin').motivo, 'em_uso');
  assert.equal(cad.criar(store, 'estados', { sigla: 'RJ', nome: 'Outro' }, 'admin').motivo, 'duplicado');
  assert.equal(cad.atualizar(store, 'estados', uf.row.id, { nome: 'Rio' }, 'admin').row.nome, 'Rio');
});

test('profissional não apaga estado e regra de referência fora do alterado é recusada', () => {
  const store = base();
  const uf = cad.criar(store, 'estados', { sigla: 'MG', nome: 'Minas Gerais' }, 'admin');
  assert.equal(cad.apagar(store, 'estados', uf.row.id, 'profissional').motivo, 'sem_permissao');
  assert.equal(cad.criar(store, 'regras', {
    codigo: 'REG-RUIM', quandoStatus: 'ok', acao: 'abrir_referencia', descricao: 'não pode'
  }, 'admin').motivo, 'referencia_so_alterado');
});

test('vincula usuário alterado ao exame de imagem e ao elemento preditivo', () => {
  const store = base();
  const unidade = territorio(store);
  const usuario = cad.criar(store, 'usuarios', { nome: 'Ana', documento: '1', tipo: 'paciente' }, 'admin');
  const res = cad.vincularTratamento(store, {
    usuarioId: usuario.row.id,
    unidadeId: unidade.id,
    registro: { id: 'teste-1', status: 'alt', nome: 'Ana' }
  }, 'admin');
  assert.equal(res.ok, true);
  assert.equal(res.row.status, 'acompanhamento');
  assert.equal(res.row.registroId, 'teste-1');
  assert.equal(res.row.elementosPreditivos.abreReferencia, true);
  assert.equal(res.row.elementosPreditivos.statusTermico, 'alt');
  assert.equal(store.skus.find((s) => s.id === res.row.skuId).codigo, 'REF-IMAGEM');
  assert.equal(store.vinculos.length, 1);
});

test('resultado não significativo não entra no SKU de referência', () => {
  const store = base();
  const usuario = cad.criar(store, 'usuarios', { nome: 'Bia', tipo: 'paciente' }, 'profissional');
  const res = cad.vincularTratamento(store, {
    usuarioId: usuario.row.id,
    registro: { id: 'teste-2', status: 'ok' }
  }, 'profissional');
  assert.equal(store.skus.find((s) => s.id === res.row.skuId).codigo, 'CICLO-PREV');
  assert.equal(res.row.elementosPreditivos.abreReferencia, false);
  assert.equal(res.row.elementosPreditivos.contaExameValido, true);
});

test('contrarreferência BI-RADS 4 vincula a biópsia', () => {
  const store = base();
  const usuario = cad.criar(store, 'usuarios', { nome: 'Cia', tipo: 'paciente' }, 'admin');
  const res = cad.vincularTratamento(store, {
    usuarioId: usuario.row.id,
    registro: {
      id: 'teste-3',
      status: 'alt',
      cuidado: { contrarreferencia: { birads: 4, acao: 'biopsia' } }
    }
  }, 'admin');
  assert.equal(store.skus.find((s) => s.id === res.row.skuId).codigo, 'BIO-PROC');
  assert.equal(res.row.elementosPreditivos.birads, 4);
  assert.equal(res.row.elementosPreditivos.abreReferencia, true);
});

test('linha do banco volta para o modelo', () => {
  const row = cad.toDb('usuarios', {
    id: 'u1', nome: 'Dina', documento: '', tipo: 'profissional', profissionalId: 'p1', ativo: true
  });
  assert.equal(row.profissional_id, 'p1');
  assert.equal(cad.fromDb('usuarios', row).profissionalId, 'p1');
  const pred = cad.toDb('matriculas', {
    id: 'm1', usuarioId: 'u1', skuId: 's1', status: 'ativa', elementosPreditivos: { fase: 'preventivo' }
  });
  assert.equal(pred.elementos_preditivos.fase, 'preventivo');
});
