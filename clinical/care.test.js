const test = require('node:test');
const assert = require('node:assert/strict');
const care = require('./care.js');

test('alterado abre referência e conta como exame válido', () => {
  const p = care.pathwayForStatus('alt');
  assert.equal(p.abreReferencia, true);
  assert.equal(p.contaExameValido, true);
  assert.equal(p.painel, 'positivo');
});

test('não significativo fica no ciclo preventivo', () => {
  const p = care.pathwayForStatus('ok');
  assert.equal(p.abreReferencia, false);
  assert.equal(p.fase, 'preventivo');
  assert.equal(p.painel, 'negativo');
});

test('inconclusivo não abre referência nem conta exame válido', () => {
  const p = care.pathwayForStatus('inc');
  assert.equal(p.abreReferencia, false);
  assert.equal(p.contaExameValido, false);
  assert.equal(p.fase, 'repetir');
});

test('referência recusada fora do alterado', () => {
  assert.equal(care.openReferral({ status: 'ok' }).ok, false);
  assert.equal(care.openReferral({ status: 'inc' }).ok, false);
  const opened = care.openReferral({ status: 'alt' }, '2026-11-09T12:00:00.000Z');
  assert.equal(opened.ok, true);
  assert.equal(opened.cuidado.referencia.status, 'aguardando_imagem');
  assert.equal(opened.cuidado.referencia.birads, null);
});

test('contrarreferência BI-RADS 2 devolve à APS e encerra a guia', () => {
  const opened = care.openReferral({ status: 'alt' }, '2026-11-09T12:00:00.000Z');
  const back = care.applyCounter(opened.cuidado, 2, '', '2026-11-09T13:00:00.000Z');
  assert.equal(back.ok, true);
  assert.equal(back.cuidado.fase, 'preventivo');
  assert.equal(back.cuidado.referencia.status, 'encerrada');
  assert.equal(back.cuidado.contrarreferencia.acao, 'devolver_aps');
});

test('contrarreferência BI-RADS 4 pede biópsia e não finge laudo térmico', () => {
  const opened = care.openReferral({ status: 'alt' }, '2026-11-09T12:00:00.000Z');
  const bio = care.applyCounter(opened.cuidado, '4', 'núcleo', '2026-11-09T13:00:00.000Z');
  assert.equal(bio.cuidado.fase, 'biopsia');
  assert.equal(bio.cuidado.referencia.status, 'aguardando_biopsia');
  assert.equal(bio.cuidado.contrarreferencia.birads, 4);
});

test('contrarreferência sem guia é recusada', () => {
  assert.equal(care.applyCounter(null, 1).ok, false);
});

test('agrupa testes da mesma paciente pelo identificador', () => {
  const groups = care.groupPatients([
    { id: '1', idPaciente: 'A1', nome: 'Ana', status: 'ok', salvoEm: '2026-11-01T00:00:00.000Z' },
    { id: '2', idPaciente: 'A1', nome: 'Ana', status: 'alt', salvoEm: '2026-11-08T00:00:00.000Z' },
    { id: '3', idPaciente: 'B2', nome: 'Bia', status: 'inc', salvoEm: '2026-11-07T00:00:00.000Z' }
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].idPaciente, 'A1');
  assert.equal(groups[0].latest.status, 'alt');
  assert.equal(groups[0].tests.length, 2);
  assert.equal(groups[0].base.abreReferencia, true);
});
