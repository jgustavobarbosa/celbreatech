const test = require('node:test');
const assert = require('node:assert/strict');
const care = require('./care.js');
globalThis.CelbreaCare = care;
const painel = require('./painel.js');

function exame(parcial) {
  return Object.assign({
    id: 'e1', status: 'ok', nome: 'Ana Lima', idPaciente: 'P1', dataTeste: '2026-01-15', salvoEm: '2026-01-15T12:00:00.000Z', form: { tel_pac: '11999990000' }
  }, parcial);
}

test('dois cadastros diferentes recebem a mesma ficha', () => {
  const painelPronto = painel.montar({
    registros: [
      exame({ id: 'a', nome: 'Ana Lima', idPaciente: 'P1', status: 'ok' }),
      exame({ id: 'b', nome: 'Bia Souza', idPaciente: 'P2', status: 'alt', dataTeste: '2026-02-02' })
    ]
  });
  assert.equal(painelPronto.pacientes.length, 2);
  assert.equal(painelPronto.pacientes[0].capitulos.cadastro.length, painelPronto.pacientes[1].capitulos.cadastro.length);
  assert.equal(painel.CAPITULOS.length, 16);
});

test('retorno de doze meses vale para qualquer resultado sem alteração', () => {
  const uma = painel.recorrenciaDe(exame({ status: 'ok', dataTeste: '2026-01-31' }));
  const outra = painel.recorrenciaDe(exame({ id: 'z', nome: 'Outra', status: 'ok', dataTeste: '2025-03-31' }));
  assert.equal(uma.proximo, '2027-01-31');
  assert.equal(outra.proximo, '2026-03-31');
  assert.equal(uma.cohort, outra.cohort);
});

test('alteração entra na fila e fica fora do cohort preventivo', () => {
  const pronto = painel.montar({ registros: [exame({ status: 'alt' })] });
  assert.equal(pronto.fila.length, 1);
  assert.equal(pronto.pacientes[0].recorrencia.cohort, 'fora_do_preventivo');
  assert.equal(pronto.pacientes[0].recorrencia.proximo, null);
});

test('referência encerrada sai da fila', () => {
  const pronto = painel.montar({
    registros: [exame({
      status: 'alt',
      cuidado: { referencia: { status: 'encerrada' }, contrarreferencia: { birads: 1, titulo: 'Devolver ao ciclo preventivo' } }
    })]
  });
  assert.equal(pronto.fila.length, 0);
});

test('inconclusivo não entra na fila nem ganha data de retorno', () => {
  const pronto = painel.montar({ registros: [exame({ status: 'inc' })] });
  assert.equal(pronto.fila.length, 0);
  assert.equal(pronto.pacientes[0].recorrencia.cohort, 'repetir');
  assert.equal(pronto.pacientes[0].recorrencia.proximo, null);
});

test('o exame mais recente manda na ficha', () => {
  const pronto = painel.montar({
    registros: [
      exame({ id: 'antigo', salvoEm: '2026-01-01T00:00:00.000Z', status: 'ok' }),
      exame({ id: 'novo', salvoEm: '2026-06-01T00:00:00.000Z', status: 'alt' })
    ]
  });
  assert.equal(pronto.pacientes.length, 1);
  assert.equal(pronto.pacientes[0].latest.id, 'novo');
  assert.equal(pronto.fila.length, 1);
});

test('mensagem acompanha a paciente pelo exame', () => {
  const pronto = painel.montar({
    registros: [exame({ id: 'ex-1', nome: 'Lia Costa' })],
    mensagens: [{ id: 'm1', destinatario: 'Outra', assunto: 'Retorno', corpo: 'Texto', status: 'pronta', registro_id: 'ex-1' }]
  });
  assert.equal(pronto.pacientes[0].mensagens.length, 1);
  assert.equal(pronto.pacientes[0].capitulos.mensageria[0].rotulo, 'Retorno');
});

test('cadastro sem exame entra no painel e na torre do estado', () => {
  const pronto = painel.montar({
    registros: [],
    usuarios: [{ id: 'u1', nome: 'Nova Paciente', documento: '', tipo: 'paciente', estado_id: 'sp' }],
    estados: [{ id: 'sp', sigla: 'SP', nome: 'São Paulo' }]
  });
  assert.equal(pronto.pacientes.length, 1);
  assert.equal(pronto.resumo.total, 0);
  assert.equal(pronto.torre[0].estado, 'São Paulo (SP)');
  assert.equal(pronto.torre[0].pacientes, 1);
});

test('a torre não cria estado para quem não existe', () => {
  const pronto = painel.montar({
    registros: [exame({ nome: 'Ana Lima' })],
    estados: [{ id: 'rj', sigla: 'RJ', nome: 'Rio de Janeiro' }]
  });
  assert.equal(pronto.torre.length, 1);
  assert.equal(pronto.torre[0].estado, 'Sem estado');
  assert.equal(pronto.resumo.ok, 1);
});
