/* Cadastros da linha de cuidado.
   Liga usuário, unidade e matrícula ao teste já gravado em registros.
   Não classifica o adesivo. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CelbreaCadastro = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const TABELAS = ['estados', 'municipios', 'unidades', 'skus', 'usuarios', 'vinculos', 'regras', 'permissoes', 'matriculas'];
  const RECURSOS = TABELAS.slice();
  const COL = {
    estados: { sigla: 'sigla', nome: 'nome', ativo: 'ativo' },
    municipios: { estadoId: 'estado_id', nome: 'nome', ibge: 'ibge', ativo: 'ativo' },
    unidades: { municipioId: 'municipio_id', nome: 'nome', cnes: 'cnes', tipo: 'tipo', ativo: 'ativo' },
    skus: { codigo: 'codigo', nome: 'nome', tipo: 'tipo', ativo: 'ativo' },
    usuarios: { nome: 'nome', documento: 'documento', tipo: 'tipo', profissionalId: 'profissional_id', estadoId: 'estado_id', ativo: 'ativo' },
    vinculos: { usuarioId: 'usuario_id', unidadeId: 'unidade_id', papel: 'papel', inicio: 'inicio', fim: 'fim' },
    regras: { codigo: 'codigo', quandoStatus: 'quando_status', acao: 'acao', skuCodigo: 'sku_codigo', descricao: 'descricao', ativo: 'ativo' },
    permissoes: { papel: 'papel', recurso: 'recurso', acao: 'acao' },
    matriculas: { usuarioId: 'usuario_id', skuId: 'sku_id', unidadeId: 'unidade_id', registroId: 'registro_id', status: 'status', elementosPreditivos: 'elementos_preditivos' }
  };
  const ROTULO = {
    estados: 'Estado', municipios: 'Município', unidades: 'Unidade', skus: 'SKU',
    usuarios: 'Usuário', vinculos: 'Vínculo', regras: 'Regra', permissoes: 'Permissão', matriculas: 'Matrícula'
  };

  function nid() {
    if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Math.random().toString(16).slice(2) + Date.now().toString(16);
  }
  function emptyStore() {
    const store = {};
    TABELAS.forEach((t) => { store[t] = []; });
    return store;
  }
  function add(store, tabela, row) {
    const item = Object.assign({ id: row.id || nid() }, row);
    store[tabela].push(item);
    return item;
  }
  function seedBasics(store) {
    [
      ['PAD-A', 'Adesivo Celbrea A', 'adesivo'],
      ['PAD-B', 'Adesivo Celbrea B', 'adesivo'],
      ['CICLO-PREV', 'Ciclo preventivo', 'seguimento'],
      ['REF-IMAGEM', 'Exame de imagem', 'exame'],
      ['REP-TESTE', 'Repetir teste', 'seguimento'],
      ['SEG-CURTO', 'Seguimento curto', 'seguimento'],
      ['BIO-PROC', 'Biópsia', 'procedimento']
    ].forEach(([codigo, nome, tipo]) => add(store, 'skus', { codigo, nome, tipo, ativo: true }));
    [
      ['REG-ALT', 'alt', 'abrir_referencia', 'REF-IMAGEM', 'Resultado significativo abre referência para exame de imagem.'],
      ['REG-OK', 'ok', 'ciclo_preventivo', 'CICLO-PREV', 'Resultado não significativo permanece no ciclo preventivo.'],
      ['REG-INC', 'inc', 'repetir', 'REP-TESTE', 'Resultado inconclusivo pede repetição e não abre referência.'],
      ['REG-B12', 'birads', 'devolver_aps', 'CICLO-PREV', 'BI-RADS 1 ou 2 devolve ao ciclo preventivo.'],
      ['REG-B3', 'birads', 'followup_curto', 'SEG-CURTO', 'BI-RADS 3 pede seguimento curto.'],
      ['REG-B45', 'birads', 'biopsia', 'BIO-PROC', 'BI-RADS 4 ou 5 encaminha para biópsia.']
    ].forEach(([codigo, quandoStatus, acao, skuCodigo, descricao]) => add(store, 'regras', { codigo, quandoStatus, acao, skuCodigo, descricao, ativo: true }));
    const recursos = RECURSOS;
    const acoes = ['ler', 'criar', 'editar', 'apagar'];
    acoes.forEach((acao) => recursos.forEach((recurso) => add(store, 'permissoes', { papel: 'admin', recurso, acao })));
    recursos.forEach((recurso) => add(store, 'permissoes', { papel: 'profissional', recurso, acao: 'ler' }));
    ['usuarios', 'vinculos', 'matriculas'].forEach((recurso) => {
      ['criar', 'editar'].forEach((acao) => add(store, 'permissoes', { papel: 'profissional', recurso, acao }));
    });
    ['usuarios', 'unidades', 'skus', 'matriculas'].forEach((recurso) => add(store, 'permissoes', { papel: 'navegador', recurso, acao: 'ler' }));
    ['vinculos', 'matriculas'].forEach((recurso) => {
      ['criar', 'editar'].forEach((acao) => add(store, 'permissoes', { papel: 'navegador', recurso, acao }));
    });
    return store;
  }
  function pode(store, papel, recurso, acao) {
    if (!store.permissoes.length) return true;
    return store.permissoes.some((p) => p.papel === papel && p.recurso === recurso && p.acao === acao);
  }
  function existe(store, tabela, id) {
    return !!id && store[tabela].some((r) => r.id === id);
  }
  function limpar(tabela, row) {
    const r = Object.assign({}, row || {});
    ['nome', 'documento', 'ibge', 'cnes', 'descricao', 'acao', 'skuCodigo'].forEach((k) => {
      if (typeof r[k] === 'string') r[k] = r[k].trim();
    });
    if (typeof r.sigla === 'string') r.sigla = r.sigla.trim().toUpperCase();
    if (typeof r.codigo === 'string') r.codigo = r.codigo.trim().toUpperCase();
    if (r.ativo === undefined && COL[tabela].ativo) r.ativo = true;
    if (tabela === 'usuarios' && !r.tipo) r.tipo = 'paciente';
    if (tabela === 'unidades' && !r.tipo) r.tipo = 'aps';
    if (tabela === 'vinculos' && !r.papel) r.papel = 'paciente';
    if (tabela === 'vinculos' && !r.inicio) r.inicio = new Date().toISOString().slice(0, 10);
    if (tabela === 'matriculas' && !r.status) r.status = 'ativa';
    if (tabela === 'matriculas' && !r.elementosPreditivos) r.elementosPreditivos = {};
    if (tabela === 'municipios' && r.ibge === undefined) r.ibge = '';
    if (tabela === 'unidades' && r.cnes === undefined) r.cnes = '';
    if (tabela === 'usuarios' && r.documento === undefined) r.documento = '';
    if (tabela === 'usuarios' && (r.tipo === 'paciente' || r.profissionalId === '')) r.profissionalId = null;
    if (tabela === 'usuarios' && r.estadoId === '') r.estadoId = null;
    if (tabela === 'regras' && r.skuCodigo === '') r.skuCodigo = null;
    if (tabela === 'matriculas' && r.unidadeId === '') r.unidadeId = null;
    if (tabela === 'matriculas' && r.registroId === '') r.registroId = null;
    if (tabela === 'vinculos' && r.fim === '') r.fim = null;
    return r;
  }
  function duplicado(store, tabela, row, id) {
    const outro = (r) => r.id !== id;
    if (tabela === 'estados') return store.estados.some((r) => outro(r) && r.sigla === row.sigla);
    if (tabela === 'municipios') return store.municipios.some((r) => outro(r) && r.estadoId === row.estadoId && r.nome.toLowerCase() === row.nome.toLowerCase());
    if (tabela === 'skus' || tabela === 'regras') return store[tabela].some((r) => outro(r) && r.codigo === row.codigo);
    if (tabela === 'usuarios' && row.documento) return store.usuarios.some((r) => outro(r) && r.documento === row.documento);
    if (tabela === 'permissoes') return store.permissoes.some((r) => outro(r) && r.papel === row.papel && r.recurso === row.recurso && r.acao === row.acao);
    return false;
  }
  function validar(store, tabela, row, id) {
    if (!COL[tabela]) return { ok: false, motivo: 'tabela' };
    const r = limpar(tabela, row);
    if (tabela === 'estados' && (!r.sigla || r.sigla.length !== 2 || !r.nome)) return { ok: false, motivo: 'obrigatorio' };
    if (tabela === 'municipios' && (!r.nome || !existe(store, 'estados', r.estadoId))) return { ok: false, motivo: r.nome ? 'estado' : 'obrigatorio' };
    if (tabela === 'unidades' && (!r.nome || !existe(store, 'municipios', r.municipioId))) return { ok: false, motivo: r.nome ? 'municipio' : 'obrigatorio' };
    if (tabela === 'unidades' && !['aps', 'imagem', 'referencia', 'laboratorio'].includes(r.tipo)) return { ok: false, motivo: 'tipo' };
    if (tabela === 'skus' && (!r.codigo || !r.nome)) return { ok: false, motivo: 'obrigatorio' };
    if (tabela === 'skus' && !['adesivo', 'exame', 'procedimento', 'seguimento'].includes(r.tipo)) return { ok: false, motivo: 'tipo' };
    if (tabela === 'usuarios' && !r.nome) return { ok: false, motivo: 'obrigatorio' };
    if (tabela === 'usuarios' && !['paciente', 'profissional'].includes(r.tipo)) return { ok: false, motivo: 'tipo' };
    if (tabela === 'vinculos' && (!existe(store, 'usuarios', r.usuarioId) || !existe(store, 'unidades', r.unidadeId))) return { ok: false, motivo: 'usuario' };
    if (tabela === 'vinculos' && !['paciente', 'profissional', 'navegador', 'admin'].includes(r.papel)) return { ok: false, motivo: 'tipo' };
    if (tabela === 'regras' && (!r.codigo || !r.acao || !r.descricao)) return { ok: false, motivo: 'obrigatorio' };
    if (tabela === 'regras' && !['ok', 'alt', 'inc', 'pend', 'birads'].includes(r.quandoStatus)) return { ok: false, motivo: 'tipo' };
    if (tabela === 'regras' && r.acao === 'abrir_referencia' && r.quandoStatus !== 'alt') return { ok: false, motivo: 'referencia_so_alterado' };
    if (tabela === 'regras' && r.skuCodigo && !store.skus.some((s) => s.codigo === r.skuCodigo)) return { ok: false, motivo: 'sku' };
    if (tabela === 'permissoes' && (!r.papel || !RECURSOS.includes(r.recurso) || !['ler', 'criar', 'editar', 'apagar'].includes(r.acao))) return { ok: false, motivo: 'obrigatorio' };
    if (tabela === 'matriculas' && (!existe(store, 'usuarios', r.usuarioId) || !existe(store, 'skus', r.skuId))) return { ok: false, motivo: 'usuario' };
    if (tabela === 'matriculas' && r.unidadeId && !existe(store, 'unidades', r.unidadeId)) return { ok: false, motivo: 'unidade' };
    if (tabela === 'matriculas' && !['ativa', 'acompanhamento', 'encerrada'].includes(r.status)) return { ok: false, motivo: 'tipo' };
    if (duplicado(store, tabela, r, id)) return { ok: false, motivo: 'duplicado' };
    return { ok: true, row: r };
  }
  function criar(store, tabela, row, papel) {
    if (papel && !pode(store, papel, tabela, 'criar')) return { ok: false, motivo: 'sem_permissao' };
    const v = validar(store, tabela, row, null);
    if (!v.ok) return v;
    v.row.id = nid();
    store[tabela].push(v.row);
    return { ok: true, row: v.row };
  }
  function atualizar(store, tabela, id, patch, papel) {
    if (papel && !pode(store, papel, tabela, 'editar')) return { ok: false, motivo: 'sem_permissao' };
    const i = store[tabela].findIndex((r) => r.id === id);
    if (i < 0) return { ok: false, motivo: 'nao_encontrado' };
    const v = validar(store, tabela, Object.assign({}, store[tabela][i], patch, { id }), id);
    if (!v.ok) return v;
    v.row.id = id;
    store[tabela][i] = v.row;
    return { ok: true, row: v.row };
  }
  function emUso(store, tabela, id) {
    if (tabela === 'estados') return store.municipios.some((r) => r.estadoId === id);
    if (tabela === 'municipios') return store.unidades.some((r) => r.municipioId === id);
    if (tabela === 'unidades') return store.vinculos.some((r) => r.unidadeId === id) || store.matriculas.some((r) => r.unidadeId === id);
    if (tabela === 'usuarios') return store.vinculos.some((r) => r.usuarioId === id) || store.matriculas.some((r) => r.usuarioId === id);
    if (tabela === 'skus') return store.matriculas.some((r) => r.skuId === id);
    return false;
  }
  function apagar(store, tabela, id, papel) {
    if (papel && !pode(store, papel, tabela, 'apagar')) return { ok: false, motivo: 'sem_permissao' };
    if (!store[tabela].some((r) => r.id === id)) return { ok: false, motivo: 'nao_encontrado' };
    if (emUso(store, tabela, id)) return { ok: false, motivo: 'em_uso' };
    store[tabela] = store[tabela].filter((r) => r.id !== id);
    return { ok: true };
  }
  function careApi() {
    if (typeof CelbreaCare !== 'undefined' && CelbreaCare.pathwayForStatus) return CelbreaCare;
    if (typeof require === 'function') return require('./care.js');
    return null;
  }
  function skuCodigoPara(registro) {
    const cr = registro && registro.cuidado && registro.cuidado.contrarreferencia;
    const n = cr ? Number(cr.birads) : 0;
    if (n === 1 || n === 2) return 'CICLO-PREV';
    if (n === 3) return 'SEG-CURTO';
    if (n === 4 || n === 5) return 'BIO-PROC';
    return { alt: 'REF-IMAGEM', ok: 'CICLO-PREV', inc: 'REP-TESTE' }[registro && registro.status] || null;
  }
  function elementosPreditivos(registro) {
    const care = careApi();
    const base = care ? care.pathwayForStatus(registro && registro.status) : {};
    const cr = registro && registro.cuidado && registro.cuidado.contrarreferencia;
    return {
      statusTermico: registro && registro.status,
      fase: base.fase || null,
      painel: base.painel || null,
      abreReferencia: !!base.abreReferencia,
      contaExameValido: !!base.contaExameValido,
      titulo: base.titulo || '',
      birads: cr ? Number(cr.birads) : null,
      acaoContrarreferencia: cr ? cr.acao : null
    };
  }
  function vincularTratamento(store, input, papel) {
    const registro = input && input.registro;
    const usuarioId = input && input.usuarioId;
    if (!existe(store, 'usuarios', usuarioId)) return { ok: false, motivo: 'usuario' };
    if (!registro || !registro.id) return { ok: false, motivo: 'registro' };
    const codigo = skuCodigoPara(registro);
    const sku = store.skus.find((s) => s.codigo === codigo && s.ativo !== false);
    if (!sku) return { ok: false, motivo: 'sem_sku' };
    if (input.unidadeId && !existe(store, 'unidades', input.unidadeId)) return { ok: false, motivo: 'unidade' };
    if (input.unidadeId && !store.vinculos.some((v) => v.usuarioId === usuarioId && v.unidadeId === input.unidadeId && !v.fim)) {
      const vinculo = criar(store, 'vinculos', { usuarioId, unidadeId: input.unidadeId, papel: 'paciente' }, papel);
      if (!vinculo.ok) return vinculo;
    }
    const pred = elementosPreditivos(registro);
    return criar(store, 'matriculas', {
      usuarioId,
      skuId: sku.id,
      unidadeId: input.unidadeId || null,
      registroId: registro.id,
      status: 'acompanhamento',
      elementosPreditivos: pred
    }, papel);
  }
  function toDb(tabela, row) {
    const out = {};
    if (row.id) out.id = row.id;
    Object.keys(COL[tabela]).forEach((k) => {
      if (row[k] !== undefined) out[COL[tabela][k]] = row[k];
    });
    return out;
  }
  function fromDb(tabela, row) {
    const out = { id: row.id };
    Object.keys(COL[tabela]).forEach((k) => { out[k] = row[COL[tabela][k]]; });
    return out;
  }
  async function pull(db) {
    const store = emptyStore();
    for (let i = 0; i < TABELAS.length; i++) {
      const tabela = TABELAS[i];
      const res = await db.from(tabela).select('*');
      if (res.error) throw res.error;
      store[tabela] = (res.data || []).map((r) => fromDb(tabela, r));
    }
    return store;
  }
  async function ensureSeed(db) {
    let store = await pull(db);
    if (store.skus.length) return store;
    const seeded = seedBasics(emptyStore());
    for (let i = 0; i < ['skus', 'regras', 'permissoes'].length; i++) {
      const tabela = ['skus', 'regras', 'permissoes'][i];
      for (let j = 0; j < seeded[tabela].length; j++) {
        const payload = toDb(tabela, seeded[tabela][j]);
        delete payload.id;
        const conflict = tabela === 'permissoes' ? 'papel,recurso,acao' : 'codigo';
        const res = await db.from(tabela).upsert(payload, { onConflict: conflict });
        if (res.error) throw res.error;
      }
    }
    return pull(db);
  }
  async function gravarLinha(db, tabela, row) {
    const res = await db.from(tabela).upsert(toDb(tabela, row));
    if (res.error) throw res.error;
  }
  async function apagarLinha(db, tabela, id) {
    const res = await db.from(tabela).delete().eq('id', id);
    if (res.error) throw res.error;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  function nomeDe(store, tabela, id) {
    const row = (store[tabela] || []).find((r) => r.id === id);
    if (!row) return '';
    return row.nome || row.codigo || row.sigla || row.id;
  }
  function rotuloLinha(tabela, row) {
    if (tabela === 'permissoes') return row.papel + ' · ' + row.recurso + ' · ' + row.acao;
    if (tabela === 'vinculos') return (row.papel || '') + ' · ' + (row.inicio || '');
    if (tabela === 'matriculas') return row.status || '';
    return row.nome || row.codigo || row.sigla || row.descricao || row.id;
  }
  const CAMPOS = {
    estados: [['sigla', 'Sigla', 'text'], ['nome', 'Nome', 'text']],
    municipios: [['estadoId', 'Estado', 'ref:estados'], ['nome', 'Município', 'text'], ['ibge', 'IBGE', 'text']],
    unidades: [['municipioId', 'Município', 'ref:municipios'], ['nome', 'Unidade', 'text'], ['cnes', 'CNES', 'text'], ['tipo', 'Tipo', 'sel:aps,imagem,referencia,laboratorio']],
    skus: [['codigo', 'Código', 'text'], ['nome', 'Nome', 'text'], ['tipo', 'Tipo', 'sel:adesivo,exame,procedimento,seguimento']],
    usuarios: [['nome', 'Nome', 'text'], ['documento', 'Documento', 'text'], ['tipo', 'Tipo', 'sel:paciente,profissional'], ['profissionalId', 'Id do profissional no pacote', 'text']],
    vinculos: [['usuarioId', 'Usuário', 'ref:usuarios'], ['unidadeId', 'Unidade', 'ref:unidades'], ['papel', 'Papel', 'sel:paciente,profissional,navegador,admin'], ['inicio', 'Início', 'date'], ['fim', 'Fim', 'date']],
    regras: [['codigo', 'Código', 'text'], ['quandoStatus', 'Quando', 'sel:ok,alt,inc,pend,birads'], ['acao', 'Ação', 'text'], ['skuCodigo', 'SKU', 'text'], ['descricao', 'Descrição', 'text']],
    permissoes: [['papel', 'Papel', 'sel:admin,profissional,navegador'], ['recurso', 'Recurso', 'sel:estados,municipios,unidades,skus,usuarios,vinculos,regras,permissoes,matriculas'], ['acao', 'Ação', 'sel:ler,criar,editar,apagar']],
    matriculas: [['usuarioId', 'Usuário', 'ref:usuarios'], ['skuId', 'SKU', 'ref:skus'], ['unidadeId', 'Unidade', 'ref:unidades'], ['registroId', 'Teste do pacote', 'regs'], ['status', 'Situação', 'sel:ativa,acompanhamento,encerrada']]
  };

  function mount(host, ctx) {
    let store = seedBasics(emptyStore());
    let tabela = 'usuarios';
    let editId = null;
    let remoto = false;
    const msg = (t, bad) => { if (ctx.msg) ctx.msg(t, bad); };
    function draw() {
      const campos = CAMPOS[tabela].map(([key, label, kind]) => {
        const atual = editId ? store[tabela].find((r) => r.id === editId) : null;
        const val = atual && atual[key] != null ? atual[key] : '';
        if (kind.indexOf('ref:') === 0) {
          const ref = kind.slice(4);
          const opts = '<option value="">Selecione</option>' + store[ref].map((r) => '<option value="' + esc(r.id) + '"' + (r.id === val ? ' selected' : '') + '>' + esc(rotuloLinha(ref, r)) + '</option>').join('');
          return '<label class="f"><span>' + esc(label) + '</span><select class="in" data-field="' + key + '">' + opts + '</select></label>';
        }
        if (kind === 'regs') {
          const regs = ctx.regs ? ctx.regs() : [];
          const opts = '<option value="">Sem teste</option>' + regs.map((r) => '<option value="' + esc(r.id) + '"' + (r.id === val ? ' selected' : '') + '>' + esc((r.nome || 'Sem nome') + ' · ' + (r.status || 'pend')) + '</option>').join('');
          return '<label class="f"><span>' + esc(label) + '</span><select class="in" data-field="' + key + '">' + opts + '</select></label>';
        }
        if (kind.indexOf('sel:') === 0) {
          const opts = kind.slice(4).split(',').map((op) => '<option' + (op === val ? ' selected' : '') + '>' + esc(op) + '</option>').join('');
          return '<label class="f"><span>' + esc(label) + '</span><select class="in" data-field="' + key + '">' + opts + '</select></label>';
        }
        return '<label class="f"><span>' + esc(label) + '</span><input class="in" data-field="' + key + '" type="' + (kind === 'date' ? 'date' : 'text') + '" value="' + esc(val) + '" autocomplete="off"></label>';
      }).join('');
      const linhas = store[tabela].map((r) => {
        let extra = '';
        if (tabela === 'vinculos') extra = ' · ' + nomeDe(store, 'usuarios', r.usuarioId) + ' / ' + nomeDe(store, 'unidades', r.unidadeId);
        if (tabela === 'matriculas') extra = ' · ' + nomeDe(store, 'usuarios', r.usuarioId) + ' / ' + nomeDe(store, 'skus', r.skuId);
        if (tabela === 'municipios') extra = ' · ' + nomeDe(store, 'estados', r.estadoId);
        if (tabela === 'unidades') extra = ' · ' + nomeDe(store, 'municipios', r.municipioId);
        return '<p><button type="button" class="btn" data-edit="' + esc(r.id) + '">Editar</button> <button type="button" class="btn" data-del="' + esc(r.id) + '">Apagar</button> ' + esc(rotuloLinha(tabela, r) + extra) + '</p>';
      }).join('') || '<p class="note">Nenhum cadastro nesta lista.</p>';
      const regs = ctx.regs ? ctx.regs() : [];
      const acomp = store.matriculas.map((m) => {
        const pred = m.elementosPreditivos || {};
        return '<p>' + esc(nomeDe(store, 'usuarios', m.usuarioId)) + ' · ' + esc(nomeDe(store, 'skus', m.skuId)) + ' · ' + esc(m.status) + (pred.titulo ? ' · ' + esc(pred.titulo) : '') + (pred.statusTermico ? ' · teste ' + esc(pred.statusTermico) : '') + '</p>';
      }).join('') || '<p class="note">Nenhuma matrícula de acompanhamento.</p>';
      host.innerHTML = '<div class="card" style="margin-top:12px"><h2>Cadastros e acompanhamento</h2><p class="note">O usuário entra aqui e segue na matrícula. O vínculo com a unidade e o elemento preditivo usam o teste que o pacote já classificou. A regra das colunas não muda.</p><label class="f"><span>Cadastro</span><select class="in" data-tabela>' + TABELAS.map((t) => '<option value="' + t + '"' + (t === tabela ? ' selected' : '') + '>' + ROTULO[t] + '</option>').join('') + '</select></label><div class="grid" data-form>' + campos + '</div><p><button type="button" class="btn primary" data-save>' + (editId ? 'Atualizar' : 'Cadastrar') + '</button></p><div>' + linhas + '</div><h2>Vincular ao tratamento</h2><div class="grid"><label class="f"><span>Usuário</span><select class="in" data-link="usuario"><option value="">Selecione</option>' + store.usuarios.map((u) => '<option value="' + esc(u.id) + '">' + esc(u.nome) + '</option>').join('') + '</select></label><label class="f"><span>Teste salvo</span><select class="in" data-link="registro"><option value="">Selecione</option>' + regs.map((r) => '<option value="' + esc(r.id) + '">' + esc((r.nome || 'Sem nome') + ' · ' + (r.status || 'pend')) + '</option>').join('') + '</select></label><label class="f"><span>Unidade</span><select class="in" data-link="unidade"><option value="">Sem unidade</option>' + store.unidades.map((u) => '<option value="' + esc(u.id) + '">' + esc(u.nome) + '</option>').join('') + '</select></label></div><p><button type="button" class="btn primary" data-link-go>Acompanhar e vincular</button></p><div>' + acomp + '</div></div>';
    }
    async function persist(tabelaAlvo, row) {
      if (!ctx.db || !ctx.db()) return;
      await gravarLinha(ctx.db(), tabelaAlvo, row);
      remoto = true;
    }
    async function salvar() {
      const row = {};
      Array.from(host.querySelectorAll('[data-field]')).forEach((el) => { row[el.dataset.field] = el.value; });
      const papel = ctx.papel ? ctx.papel() : 'admin';
      const res = editId ? atualizar(store, tabela, editId, row, papel) : criar(store, tabela, row, papel);
      if (!res.ok) { msg(textoMotivo(res.motivo), true); return; }
      try {
        await persist(tabela, res.row);
        editId = null;
        msg(remoto ? 'Cadastro gravado no banco do pacote.' : 'Cadastro mantido nesta sessão.');
        draw();
      } catch (e) {
        msg('Não foi possível gravar no banco. Rode cadastro.sql no Supabase.', true);
      }
    }
    async function remover(id) {
      const papel = ctx.papel ? ctx.papel() : 'admin';
      const copia = store[tabela].slice();
      const res = apagar(store, tabela, id, papel);
      if (!res.ok) { msg(textoMotivo(res.motivo), true); return; }
      try {
        if (ctx.db && ctx.db()) await apagarLinha(ctx.db(), tabela, id);
        if (editId === id) editId = null;
        msg('Cadastro apagado.');
        draw();
      } catch (e) {
        store[tabela] = copia;
        msg('O banco não apagou este cadastro.', true);
        draw();
      }
    }
    async function vincular() {
      const usuarioId = host.querySelector('[data-link="usuario"]').value;
      const registroId = host.querySelector('[data-link="registro"]').value;
      const unidadeId = host.querySelector('[data-link="unidade"]').value;
      const registro = (ctx.regs ? ctx.regs() : []).find((r) => r.id === registroId);
      const papel = ctx.papel ? ctx.papel() : 'admin';
      const res = vincularTratamento(store, { usuarioId, registro, unidadeId }, papel);
      if (!res.ok) { msg(textoMotivo(res.motivo), true); return; }
      try {
        const vinculo = store.vinculos[store.vinculos.length - 1];
        if (vinculo && vinculo.usuarioId === usuarioId && ctx.db && ctx.db()) await persist('vinculos', vinculo);
        await persist('matriculas', res.row);
        msg('Usuário vinculado ao tratamento. Elemento preditivo: ' + (res.row.elementosPreditivos.titulo || res.row.elementosPreditivos.statusTermico || ''));
        draw();
      } catch (e) {
        msg('A matrícula ficou nesta sessão. O banco recusou a gravação.', true);
      }
    }
    host.addEventListener('change', (ev) => {
      if (!ev.target.matches('[data-tabela]')) return;
      tabela = ev.target.value;
      editId = null;
      draw();
    });
    host.addEventListener('click', (ev) => {
      const edit = ev.target.closest('[data-edit]');
      const del = ev.target.closest('[data-del]');
      if (edit) { editId = edit.dataset.edit; draw(); return; }
      if (del) { remover(del.dataset.del); return; }
      if (ev.target.closest('[data-save]')) salvar();
      if (ev.target.closest('[data-link-go]')) vincular();
    });
    async function sync() {
      if (!ctx.db || !ctx.db()) { draw(); return; }
      try {
        store = await ensureSeed(ctx.db());
        remoto = true;
        draw();
      } catch (e) {
        msg('As tabelas de cadastro ainda não existem. Execute clinical/cadastro.sql no Supabase.', true);
        draw();
      }
    }
    function redesenhar() {
      if (host.contains(document.activeElement)) return;
      draw();
    }
    sync();
    return { sync, atualizar: redesenhar };
  }
  function textoMotivo(motivo) {
    return {
      obrigatorio: 'Preencha os campos obrigatórios.',
      estado: 'Cadastre o estado antes do município.',
      municipio: 'Cadastre o município antes da unidade.',
      usuario: 'Escolha um usuário já cadastrado.',
      unidade: 'Escolha uma unidade já cadastrada.',
      sku: 'O SKU informado não existe.',
      sem_sku: 'Não há SKU de tratamento para este resultado.',
      registro: 'Escolha um teste já salvo.',
      tipo: 'Valor fora da lista permitida.',
      duplicado: 'Já existe um cadastro com este identificador.',
      sem_permissao: 'Seu papel não pode alterar este cadastro.',
      em_uso: 'Este cadastro está em uso e não pode ser apagado.',
      nao_encontrado: 'Cadastro não encontrado.',
      referencia_so_alterado: 'A regra de abrir referência só vale para resultado significativo.'
    }[motivo] || 'Não foi possível concluir o cadastro.';
  }

  const ESTADOS_BRASIL = [
    ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'],
    ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'],
    ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'],
    ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'],
    ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'], ['RS', 'Rio Grande do Sul'],
    ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'],
    ['SE', 'Sergipe'], ['TO', 'Tocantins']
  ];
  function seedEstados(store) {
    ESTADOS_BRASIL.forEach(([sigla, nome]) => {
      if (!store.estados.some((e) => e.sigla === sigla)) add(store, 'estados', { sigla, nome, ativo: true });
    });
    return store.estados;
  }
  return {
    TABELAS, ESTADOS_BRASIL, emptyStore, seedBasics, seedEstados, pode, criar, atualizar, apagar,
    vincularTratamento, elementosPreditivos, skuCodigoPara, toDb, fromDb, mount
  };
});
