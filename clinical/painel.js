/* Painel ancorado no exame. A mesma ficha vale para qualquer cadastro futuro.
   Não classifica o adesivo e não inventa população. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CelbreaPainel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CAPITULOS = [
    ['cadastro', '01 Cadastro'],
    ['vinculo', '02 Vínculo'],
    ['anamnese', '03 Anamnese'],
    ['clinicos', '04 Clínicos'],
    ['escaneamento', '05 Escaneamento'],
    ['triagem', '06 Triagem'],
    ['prioridade', '07 Score / lei'],
    ['referencia', '08 Referência'],
    ['contrarreferencia', '09 Contrarreferência'],
    ['acompanhamento', '10 Acompanhamento'],
    ['mensageria', '11 Mensageria'],
    ['recorrencia', '12 Recorrência'],
    ['grupos', '13 Grupos'],
    ['arquivo', '14 Arquivo'],
    ['predicao', '15 Predição'],
    ['torre', '16 Torre']
  ];
  const STATUS = {
    ok: 'Sem alteração',
    alt: 'Alteração significativa',
    inc: 'Inconclusivo',
    pend: 'Incompleto'
  };

  function careApi() {
    if (typeof CelbreaCare !== 'undefined' && CelbreaCare.groupPatients) return CelbreaCare;
    if (typeof require === 'function') return require('./care.js');
    return null;
  }
  function norm(v) { return String(v || '').trim().toLowerCase(); }
  function texto(v) {
    const s = String(v == null ? '' : v).trim();
    return s || 'Não informado';
  }
  function linha(rotulo, valor) { return { rotulo: rotulo, valor: texto(valor) }; }
  function exameDe(row) {
    if (!row) return null;
    if (row.dados && typeof row.dados === 'object') {
      return Object.assign({}, row.dados, { id: row.id, status: row.dados.status || row.status || 'pend' });
    }
    return Object.assign({ status: 'pend' }, row);
  }
  function somarMeses(iso, meses) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m || !meses) return null;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    d.setUTCMonth(d.getUTCMonth() + meses);
    return d.toISOString().slice(0, 10);
  }
  function recorrenciaDe(exame) {
    const base = (exame && (exame.dataTeste || exame.salvoEm)) || '';
    if (!exame || exame.status === 'alt') {
      return { cohort: 'fora_do_preventivo', titulo: 'Fora do cohort preventivo', proximo: null, meses: null };
    }
    if (exame.status === 'ok') {
      return { cohort: 'preventivo_12m', titulo: 'Retorno em 12 meses', proximo: somarMeses(base, 12), meses: 12 };
    }
    if (exame.status === 'inc') {
      return { cohort: 'repetir', titulo: 'Repetir o teste. Este exame não entra na recorrência.', proximo: null, meses: 0 };
    }
    return { cohort: 'sem_exame', titulo: 'Cadastro sem exame concluído', proximo: null, meses: null };
  }
  function naFila(exame, cuidado) {
    if (!exame || exame.status !== 'alt') return false;
    const ref = cuidado && cuidado.referencia;
    if (ref && ref.status === 'encerrada') return false;
    return true;
  }
  function elementosDe(exame) {
    const care = careApi();
    const base = care ? care.pathwayForStatus(exame && exame.status) : {};
    const cr = exame && exame.cuidado && exame.cuidado.contrarreferencia;
    return {
      statusTermico: exame && exame.status,
      fase: base.fase || null,
      titulo: base.titulo || '',
      birads: cr ? Number(cr.birads) : null,
      acaoContrarreferencia: cr ? cr.acao : null
    };
  }
  function acharUsuario(grupo, usuarios) {
    const nome = norm(grupo.nome);
    const id = norm(grupo.idPaciente);
    return (usuarios || []).find((u) => u.tipo === 'paciente' && (norm(u.nome) === nome || (id && norm(u.documento) === id))) || null;
  }
  function estadoDe(usuario, estados) {
    if (!usuario || !usuario.estado_id && !usuario.estadoId) return 'Sem estado';
    const id = usuario.estado_id || usuario.estadoId;
    const uf = (estados || []).find((e) => e.id === id);
    return uf ? uf.nome + ' (' + uf.sigla + ')' : 'Sem estado';
  }
  function unidadeDe(usuario, vinculos, unidades) {
    if (!usuario) return 'Sem unidade';
    const vinculo = (vinculos || []).find((v) => (v.usuario_id || v.usuarioId) === usuario.id && !(v.fim));
    if (!vinculo) return 'Sem unidade';
    const id = vinculo.unidade_id || vinculo.unidadeId;
    const unidade = (unidades || []).find((u) => u.id === id);
    return unidade && unidade.nome ? unidade.nome : 'Sem unidade';
  }
  function mensagensDe(chaveNome, testes, mensagens) {
    const ids = new Set((testes || []).map((t) => t.id).filter(Boolean));
    return (mensagens || []).filter((m) => {
      const reg = m.registro_id || m.registroId;
      return (reg && ids.has(reg)) || norm(m.destinatario) === chaveNome;
    });
  }
  function fichaDe(grupo, usuario, ctx) {
    const exame = grupo.latest || null;
    const form = (exame && exame.form) || {};
    const cuidado = (exame && exame.cuidado) || grupo.cuidado || null;
    const rec = exame ? recorrenciaDe(exame) : { cohort: 'sem_exame', titulo: 'Cadastro sem exame concluído', proximo: null, meses: null };
    const elem = elementosDe(exame);
    const estado = estadoDe(usuario, ctx.estados);
    const unidade = unidadeDe(usuario, ctx.vinculos, ctx.unidades);
    const msgs = mensagensDe(norm(grupo.nome), grupo.tests || [], ctx.mensagens);
    const fila = naFila(exame, cuidado);
    const ref = cuidado && cuidado.referencia;
    const cr = cuidado && cuidado.contrarreferencia;
    const paciente = {
      key: grupo.key,
      nome: grupo.nome || 'Sem nome',
      idPaciente: grupo.idPaciente || '',
      estado: estado,
      unidade: unidade,
      latest: exame,
      tests: grupo.tests || [],
      naFila: fila,
      recorrencia: rec,
      elementos: elem,
      mensagens: msgs,
      usuarioId: usuario ? usuario.id : null
    };
    paciente.capitulos = {
      cadastro: [
        linha('Nome', paciente.nome),
        linha('Identificação', paciente.idPaciente),
        linha('Celular', form.tel_pac),
        linha('E-mail', form.email_pac),
        linha('Nascimento', form.nasc),
        linha('Data do teste', exame && exame.dataTeste),
        linha('Médico', form.medico),
        linha('CRM', form.crm),
        linha('Instituição', form.inst),
        linha('Consentimento', form.consent_pac)
      ],
      vinculo: [linha('Estado', estado), linha('Unidade', unidade), linha('Identificação', paciente.idPaciente)],
      anamnese: [
        linha('Câncer de mama', form.p_cancer),
        linha('Cirurgia recente', form.p_cirurgia),
        linha('Amamentação', form.p_amam),
        linha('Sintomas', form.p_sintomas)
      ],
      clinicos: [
        linha('Altura', form.altura),
        linha('Peso', form.peso),
        linha('Menarca', form.menarca),
        linha('Filhos', form.filhos),
        linha('Menopausa', form.menopausa),
        linha('Reposição hormonal', form.trh),
        linha('BRCA', form.brca),
        linha('Biópsia', form.biopsia),
        linha('Família', form.familia),
        linha('Histórico', form.historico)
      ],
      escaneamento: [
        linha('Adesivo direito', form.qr_R),
        linha('Adesivo esquerdo', form.qr_L),
        linha('Fotos', 'As fotos ficam no aparelho e não entram neste painel')
      ],
      triagem: [
        linha('Resultado', exame ? (STATUS[exame.status] || exame.status) : ''),
        linha('Leitura', exame && exame.resultado),
        linha('Maior diferença', exame && exame.maiorDif)
      ],
      prioridade: [linha('Conduta', elem.titulo), linha('Fase', elem.fase)],
      referencia: ref
        ? [linha('Destino', ref.destino), linha('Prioridade', ref.prioridade), linha('Situação', ref.status)]
        : [linha('Referência', exame && exame.status === 'alt' ? 'Ainda não aberta' : 'Não se aplica a este resultado')],
      contrarreferencia: cr
        ? [linha('BI-RADS', cr.birads), linha('Conduta', cr.titulo), linha('Nota', cr.nota)]
        : [linha('Contrarreferência', 'Ainda não registrada')],
      acompanhamento: [linha('Fase', elem.fase), linha('Conduta', elem.titulo), linha('Exames desta paciente', String((grupo.tests || []).length))],
      mensageria: msgs.length
        ? msgs.map((m) => linha(m.assunto || 'Mensagem', (m.status || 'rascunho') + ' · ' + (m.corpo || '')))
        : [linha('Mensagens', 'Nenhuma mensagem desta paciente')],
      recorrencia: [linha('Cohort', rec.titulo), linha('Próximo retorno', rec.proximo)],
      grupos: [linha('Grupo', rec.titulo)],
      arquivo: (grupo.tests || []).length
        ? grupo.tests.map((t) => linha(t.dataTeste || 'Exame', (STATUS[t.status] || t.status || 'pend') + (t.id ? ' · ' + t.id : '')))
        : [linha('Arquivo', 'Nenhum exame salvo')],
      predicao: [linha('Elemento', elem.titulo), linha('Status térmico', elem.statusTermico), linha('BI-RADS', elem.birads)],
      torre: [linha('Estado na torre', estado), linha('Entra na fila', fila ? 'Sim' : 'Não')]
    };
    return paciente;
  }
  function resumoDe(exames) {
    const out = { total: 0, ok: 0, alt: 0, inc: 0, pend: 0, referenciasAbertas: 0, pacientes: 0 };
    exames.forEach((reg) => {
      out.total += 1;
      if (reg.status === 'ok' || reg.status === 'alt' || reg.status === 'inc') out[reg.status] += 1;
      else out.pend += 1;
      const ref = reg.cuidado && reg.cuidado.referencia;
      if (ref && ref.status && ref.status !== 'encerrada') out.referenciasAbertas += 1;
    });
    return out;
  }
  function montar(entrada) {
    const ctx = entrada || {};
    const care = careApi();
    const exames = (ctx.registros || []).map(exameDe).filter(Boolean);
    const grupos = care ? care.groupPatients(exames) : [];
    const usados = new Set();
    const pacientes = grupos.map((grupo) => {
      const usuario = acharUsuario(grupo, ctx.usuarios);
      if (usuario) usados.add(usuario.id);
      return fichaDe(grupo, usuario, ctx);
    });
    (ctx.usuarios || []).forEach((usuario) => {
      if (usuario.tipo !== 'paciente' || usados.has(usuario.id) || !norm(usuario.nome)) return;
      const nome = String(usuario.nome).trim();
      pacientes.push(fichaDe({
        key: usuario.documento ? 'id:' + norm(usuario.documento) : 'nome:' + norm(nome),
        nome: nome,
        idPaciente: usuario.documento || '',
        latest: null,
        tests: [],
        cuidado: null
      }, usuario, ctx));
    });
    pacientes.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
    const resumo = resumoDe(exames);
    resumo.pacientes = pacientes.length;
    const fila = pacientes.filter((p) => p.naFila);
    const cohortMap = new Map();
    pacientes.forEach((p) => {
      const id = p.recorrencia.cohort;
      if (!cohortMap.has(id)) cohortMap.set(id, { id: id, titulo: p.recorrencia.titulo, pacientes: [] });
      cohortMap.get(id).pacientes.push(p);
    });
    const torreMap = new Map();
    pacientes.forEach((p) => {
      if (!torreMap.has(p.estado)) torreMap.set(p.estado, { estado: p.estado, pacientes: 0, ok: 0, alt: 0, inc: 0, pend: 0, fila: 0 });
      const bloco = torreMap.get(p.estado);
      bloco.pacientes += 1;
      const st = p.latest ? p.latest.status : 'pend';
      if (bloco[st] === undefined) bloco.pend += 1;
      else bloco[st] += 1;
      if (p.naFila) bloco.fila += 1;
    });
    return {
      pacientes: pacientes,
      resumo: resumo,
      fila: fila,
      cohorts: [...cohortMap.values()],
      torre: [...torreMap.values()].sort((a, b) => a.estado.localeCompare(b.estado, 'pt')),
      mensagens: (ctx.mensagens || []).slice()
    };
  }

  return { CAPITULOS, STATUS, recorrenciaDe, montar };
});
