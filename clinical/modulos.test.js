const test = require('node:test');
const assert = require('node:assert/strict');
const mod = require('./modulos.js');

test('o plano lista autenticação, aprovação, versões, painel e mensageria', () => {
  const ids = mod.catalogo().map((m) => m.id);
  assert.deepEqual(ids, [
    'autenticacao', 'aprovacao', 'versao_medico', 'vinculacao',
    'dashboard_gestor', 'admin_automatica', 'mensageria', 'versao_paciente'
  ]);
});

test('dashboard conta só os testes recebidos', () => {
  const resumo = mod.resumoGestor([
    { status: 'ok' },
    { status: 'alt', cuidado: { referencia: { status: 'aguardando_imagem' } } },
    { status: 'alt', cuidado: { referencia: { status: 'encerrada' } } },
    { status: 'inc' },
    { status: 'pend' }
  ]);
  assert.equal(resumo.total, 5);
  assert.equal(resumo.ok, 1);
  assert.equal(resumo.alt, 2);
  assert.equal(resumo.inc, 1);
  assert.equal(resumo.pend, 1);
  assert.equal(resumo.referenciasAbertas, 1);
});

test('proposta de referência não muda o status térmico e exige confirmação', () => {
  const registro = { id: 't1', status: 'alt' };
  const proposta = mod.propostaAutomatica(registro);
  assert.equal(proposta.acao, 'abrir_referencia');
  assert.equal(proposta.confirma, true);
  const aplicado = mod.aplicarProposta(registro);
  assert.equal(aplicado.ok, true);
  assert.equal(aplicado.statusTermico, 'alt');
  assert.equal(registro.status, 'alt');
  assert.equal(aplicado.cuidado.referencia.status, 'aguardando_imagem');
});

test('resultado não significativo não abre referência automática', () => {
  const proposta = mod.propostaAutomatica({ status: 'ok' });
  assert.equal(proposta.acao, 'ciclo_preventivo');
  assert.equal(proposta.confirma, false);
  assert.equal(mod.aplicarProposta({ status: 'ok' }).ok, false);
});

test('mensagem interna nasce rascunho e só pode ficar pronta', () => {
  const store = mod.emptyStore();
  assert.equal(mod.criarMensagem(store, { destinatario: 'Ana' }).motivo, 'obrigatorio');
  const criada = mod.criarMensagem(store, { destinatario: 'Ana', assunto: 'Retorno', corpo: 'Seu exame foi registrado.' });
  assert.equal(criada.row.status, 'rascunho');
  assert.equal(mod.marcarPronta(store, criada.row.id).row.status, 'pronta');
  assert.equal(mod.marcarPronta(store, criada.row.id).ok, false);
  assert.equal(mod.toDb(criada.row).status, 'pronta');
});
