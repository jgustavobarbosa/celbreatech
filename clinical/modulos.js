/* Módulos de operação sobre o pacote.
   Não classifica o adesivo e não envia mensagem para fora do sistema. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CelbreaModulos = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function catalogo() {
    return [
      { id: 'autenticacao', titulo: 'Autenticação', estado: 'No pacote', texto: 'O profissional entra com e-mail, senha e termo. A paciente não usa essa senha.' },
      { id: 'aprovacao', titulo: 'Aprovação', estado: 'No pacote', texto: 'O administrador libera o profissional em Registros. Sem liberação, o teste não abre.' },
      { id: 'versao_medico', titulo: 'Versão do médico', estado: 'No pacote', texto: 'Esta tela é a versão do médico: ficha, leitura, laudo, registros e cuidado.' },
      { id: 'vinculacao', titulo: 'Vinculação', estado: 'Neste ciclo', texto: 'O usuário se vincula à unidade e à matrícula do teste já gravado.' },
      { id: 'dashboard_gestor', titulo: 'Dashboard do gestor', estado: 'Neste ciclo', texto: 'Conta os testes e as referências abertas desta sessão. Não usa número de demonstração.' },
      { id: 'admin_automatica', titulo: 'Administração automática', estado: 'Neste ciclo', texto: 'A regra propõe a conduta. O profissional confirma. A classificação do adesivo permanece.' },
      { id: 'mensageria', titulo: 'Mensageria', estado: 'Neste ciclo', texto: 'A mensagem fica em rascunho ou pronta. Este ciclo não envia WhatsApp, e-mail ou SMS.' },
      { id: 'versao_paciente', titulo: 'Versão da paciente', estado: 'Neste ciclo', texto: 'A página da paciente explica o resultado e não abre o prontuário das outras pessoas.' }
    ];
  }
  function resumoGestor(regs) {
    const out = { total: 0, ok: 0, alt: 0, inc: 0, pend: 0, referenciasAbertas: 0 };
    (regs || []).forEach((reg) => {
      out.total += 1;
      if (reg.status === 'ok' || reg.status === 'alt' || reg.status === 'inc') out[reg.status] += 1;
      else out.pend += 1;
      const ref = reg.cuidado && reg.cuidado.referencia;
      if (ref && ref.status && ref.status !== 'encerrada') out.referenciasAbertas += 1;
    });
    return out;
  }
  function careApi() {
    if (typeof CelbreaCare !== 'undefined' && CelbreaCare.pathwayForStatus) return CelbreaCare;
    if (typeof require === 'function') return require('./care.js');
    return null;
  }
  function propostaAutomatica(registro) {
    if (!registro) return { ok: false, motivo: 'registro' };
    const care = careApi();
    const base = care ? care.pathwayForStatus(registro.status) : { titulo: '', abreReferencia: false };
    const ref = registro.cuidado && registro.cuidado.referencia;
    const aberta = ref && ref.status && ref.status !== 'encerrada';
    if (base.abreReferencia && !aberta) {
      return { ok: true, acao: 'abrir_referencia', titulo: 'Propor referência para exame de imagem', confirma: true };
    }
    if (registro.status === 'ok') return { ok: true, acao: 'ciclo_preventivo', titulo: 'Manter o ciclo preventivo', confirma: false };
    if (registro.status === 'inc') return { ok: true, acao: 'repetir', titulo: 'Pedir repetição do teste', confirma: false };
    if (aberta) return { ok: true, acao: 'aguardar_imagem', titulo: 'Referência já aberta', confirma: false };
    return { ok: true, acao: 'aguardar', titulo: base.titulo || 'Aguardar leituras', confirma: false };
  }
  function aplicarProposta(registro) {
    const proposta = propostaAutomatica(registro);
    if (!proposta.ok || proposta.acao !== 'abrir_referencia') return { ok: false, motivo: 'sem_proposta', proposta };
    const care = careApi();
    const opened = care.openReferral(registro);
    return { ok: opened.ok, motivo: opened.motivo, cuidado: opened.cuidado, proposta, statusTermico: registro.status };
  }
  function emptyStore() { return { mensagens: [] }; }
  function nid() {
    if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'msg-' + Math.random().toString(16).slice(2);
  }
  function criarMensagem(store, row) {
    const destinatario = String((row && row.destinatario) || '').trim();
    const assunto = String((row && row.assunto) || '').trim();
    const corpo = String((row && row.corpo) || '').trim();
    if (!destinatario || !assunto || !corpo) return { ok: false, motivo: 'obrigatorio' };
    const mensagem = {
      id: nid(),
      destinatario,
      assunto,
      corpo,
      status: 'rascunho',
      registroId: (row && row.registroId) || null
    };
    store.mensagens.push(mensagem);
    return { ok: true, row: mensagem };
  }
  function marcarPronta(store, id) {
    const mensagem = store.mensagens.find((m) => m.id === id);
    if (!mensagem) return { ok: false, motivo: 'nao_encontrado' };
    if (mensagem.status !== 'rascunho') return { ok: false, motivo: 'status' };
    mensagem.status = 'pronta';
    return { ok: true, row: mensagem };
  }
  function toDb(row) {
    return {
      id: row.id,
      destinatario: row.destinatario,
      assunto: row.assunto,
      corpo: row.corpo,
      status: row.status,
      registro_id: row.registroId || null
    };
  }
  function fromDb(row) {
    return {
      id: row.id,
      destinatario: row.destinatario,
      assunto: row.assunto,
      corpo: row.corpo,
      status: row.status,
      registroId: row.registro_id || null
    };
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  function mount(host, ctx) {
    let store = emptyStore();
    const msg = (t, bad) => { if (ctx.msg) ctx.msg(t, bad); };
    function draw() {
      const regs = ctx.regs ? ctx.regs() : [];
      const resumo = resumoGestor(regs);
      const cards = catalogo().map((m) => '<p><b>' + esc(m.titulo) + '</b> · ' + esc(m.estado) + '<br><span class="note">' + esc(m.texto) + '</span></p>').join('');
      const opcoes = '<option value="">Selecione o teste</option>' + regs.map((r) => '<option value="' + esc(r.id) + '">' + esc((r.nome || 'Sem nome') + ' · ' + (r.status || 'pend')) + '</option>').join('');
      const lista = store.mensagens.map((m) => '<p>' + esc(m.status) + ' · ' + esc(m.destinatario) + ' · ' + esc(m.assunto) + (m.status === 'rascunho' ? ' <button type="button" class="btn" data-pronta="' + esc(m.id) + '">Marcar pronta</button>' : '') + '</p>').join('') || '<p class="note">Nenhuma mensagem interna.</p>';
      host.innerHTML = '<div class="card" style="margin-top:12px"><h2>Plano em funcionamento</h2><p class="note">Estes módulos entram na operação do pacote. A maquete não substitui esta tela. <a href="paciente.html">Abrir a versão da paciente</a></p>' + cards + '<h2>Dashboard do gestor</h2><p>Testes ' + resumo.total + ' · não significativos ' + resumo.ok + ' · significativos ' + resumo.alt + ' · inconclusivos ' + resumo.inc + ' · rascunhos ' + resumo.pend + ' · referências abertas ' + resumo.referenciasAbertas + '</p><h2>Administração automática</h2><label class="f"><span>Teste</span><select class="in" data-prop>' + opcoes + '</select></label><p class="note" data-prop-txt>Escolha um teste para ver a proposta.</p><p><button type="button" class="btn primary" data-prop-go>Confirmar proposta</button></p><h2>Mensageria interna</h2><div class="grid"><label class="f"><span>Destinatário</span><input class="in" data-msg="destinatario" autocomplete="off"></label><label class="f"><span>Assunto</span><input class="in" data-msg="assunto" autocomplete="off"></label><label class="f" style="grid-column:1/-1"><span>Texto</span><input class="in" data-msg="corpo" autocomplete="off"></label></div><p><button type="button" class="btn primary" data-msg-go>Guardar rascunho</button> <button type="button" class="btn" data-msg-send>Enviar por e-mail</button></p><label class="f"><span>Tipo do e-mail</span><select class="in" data-msg-tipo><option value="agendamento">Agendamento</option><option value="questionario">Questionário de avaliação</option></select></label>' + lista + '</div>';
    }
    async function persist(row) {
      if (!ctx.db || !ctx.db()) return;
      const res = await ctx.db().from('mensagens').upsert(toDb(row));
      if (res.error) throw res.error;
    }
    host.addEventListener('change', (ev) => {
      if (!ev.target.matches('[data-prop]')) return;
      const reg = (ctx.regs ? ctx.regs() : []).find((r) => r.id === ev.target.value);
      const proposta = reg ? propostaAutomatica(reg) : null;
      const alvo = host.querySelector('[data-prop-txt]');
      if (alvo) alvo.textContent = proposta ? proposta.titulo : 'Escolha um teste para ver a proposta.';
    });
    host.addEventListener('click', async (ev) => {
      if (ev.target.closest('[data-prop-go]')) {
        const id = host.querySelector('[data-prop]').value;
        const reg = (ctx.regs ? ctx.regs() : []).find((r) => r.id === id);
        const proposta = propostaAutomatica(reg);
        if (!proposta.ok) { msg('Escolha um teste salvo.', true); return; }
        if (!proposta.confirma) { msg(proposta.titulo); return; }
        if (!ctx.aplicar) { msg(proposta.titulo); return; }
        try {
          const res = await ctx.aplicar(reg);
          msg(res && res.ok ? 'Proposta confirmada. A classificação do teste não mudou.' : 'A proposta não foi gravada.', !(res && res.ok));
          draw();
        } catch (e) {
          msg('A proposta não foi gravada.', true);
        }
        return;
      }
      if (ev.target.closest('[data-msg-send]')) {
        const tipo = host.querySelector('[data-msg-tipo]').value;
        const para = host.querySelector('[data-msg="destinatario"]').value;
        const mensagem = host.querySelector('[data-msg="assunto"]').value + '\n\n' + host.querySelector('[data-msg="corpo"]').value;
        const quando = '';
        if (!window.CelbreaMail || !ctx.token) { msg('O envio por e-mail ainda não está disponível nesta tela.', true); return; }
        try {
          const token = await ctx.token();
          const res = await CelbreaMail.enviar(tipo, { para, mensagem, quando }, token);
          msg(res.ok ? 'E-mail enviado.' : (res.motivo === 'resend_pendente' ? 'O envio espera a chave da Resend no servidor.' : 'Não foi possível enviar o e-mail.'), !res.ok);
        } catch (e) {
          msg('Não foi possível enviar o e-mail.', true);
        }
        return;
      }
      if (ev.target.closest('[data-msg-go]')) {
        const row = {
          destinatario: host.querySelector('[data-msg="destinatario"]').value,
          assunto: host.querySelector('[data-msg="assunto"]').value,
          corpo: host.querySelector('[data-msg="corpo"]').value
        };
        const criado = criarMensagem(store, row);
        if (!criado.ok) { msg('Preencha destinatário, assunto e texto.', true); return; }
        try {
          await persist(criado.row);
          msg('Rascunho guardado neste sistema. Nada foi enviado para fora.');
          draw();
        } catch (e) {
          msg('Rascunho guardado nesta sessão. Rode mensagens.sql para gravar no banco.', true);
          draw();
        }
        return;
      }
      const pronta = ev.target.closest('[data-pronta]');
      if (!pronta) return;
      const marcada = marcarPronta(store, pronta.dataset.pronta);
      if (!marcada.ok) { msg('Esta mensagem não está em rascunho.', true); return; }
      try {
        await persist(marcada.row);
        msg('Mensagem marcada como pronta. O envio externo fica para outro ciclo.');
        draw();
      } catch (e) {
        msg('Mensagem pronta nesta sessão. O banco não foi atualizado.', true);
        draw();
      }
    });
    async function sync() {
      if (ctx.db && ctx.db()) {
        try {
          const res = await ctx.db().from('mensagens').select('*').order('criada_em', { ascending: false });
          if (!res.error && res.data) store.mensagens = res.data.map(fromDb);
        } catch (e) {}
      }
      if (!host.contains(document.activeElement)) draw();
    }
    sync();
    return { sync };
  }
  return { catalogo, resumoGestor, propostaAutomatica, aplicarProposta, emptyStore, criarMensagem, marcarPronta, toDb, fromDb, mount };
});
