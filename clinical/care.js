/* Linha de cuidado sobre o resultado já classificado pelo CELBREA.IA.
   Não altera o critério térmico. Referência só existe para status "alt".
   Contrarreferência registra BI-RADS e a conduta da navegação. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CelbreaCare = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function pathwayForStatus(status) {
    if (status === 'alt') {
      return {
        fase: 'referencia',
        titulo: 'Referência para exame de imagem',
        abreReferencia: true,
        contaExameValido: true,
        painel: 'positivo'
      };
    }
    if (status === 'ok') {
      return {
        fase: 'preventivo',
        titulo: 'Ciclo preventivo',
        abreReferencia: false,
        contaExameValido: true,
        painel: 'negativo'
      };
    }
    if (status === 'inc') {
      return {
        fase: 'repetir',
        titulo: 'Repetir teste',
        abreReferencia: false,
        contaExameValido: false,
        painel: null
      };
    }
    return {
      fase: 'rascunho',
      titulo: 'Leituras incompletas',
      abreReferencia: false,
      contaExameValido: false,
      painel: null
    };
  }

  function counterReferral(birads) {
    const n = Number(birads);
    if (n === 1 || n === 2) {
      return { acao: 'devolver_aps', titulo: 'Devolver ao ciclo preventivo', fechaReferencia: true };
    }
    if (n === 3) {
      return { acao: 'followup_curto', titulo: 'Seguimento curto', fechaReferencia: false };
    }
    if (n === 4 || n === 5) {
      return { acao: 'biopsia', titulo: 'Encaminhar biópsia', fechaReferencia: false, prioridade: 'navegador' };
    }
    return null;
  }

  function patientKey(reg) {
    const id = String((reg && reg.idPaciente) || '').trim();
    if (id) return 'id:' + id.toLowerCase();
    const nome = String((reg && reg.nome) || '').trim();
    if (nome) return 'nome:' + nome.toLowerCase();
    return 'reg:' + String((reg && reg.id) || '');
  }

  function groupPatients(regs) {
    const map = new Map();
    (regs || []).forEach((reg) => {
      const key = patientKey(reg);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(reg);
    });
    const out = [];
    map.forEach((tests, key) => {
      tests.sort((a, b) => String(b.salvoEm || '').localeCompare(String(a.salvoEm || '')));
      const latest = tests[0];
      out.push({
        key,
        nome: latest.nome || 'Sem nome',
        idPaciente: latest.idPaciente || '',
        latest,
        tests,
        base: pathwayForStatus(latest.status),
        cuidado: latest.cuidado || null
      });
    });
    out.sort((a, b) => String(b.latest.salvoEm || '').localeCompare(String(a.latest.salvoEm || '')));
    return out;
  }

  function openReferral(latest, now) {
    const base = pathwayForStatus(latest && latest.status);
    if (!base.abreReferencia) return { ok: false, motivo: 'somente_alterado' };
    const quando = now || new Date().toISOString();
    return {
      ok: true,
      cuidado: {
        fase: 'referencia',
        referencia: {
          abertaEm: quando,
          destino: 'Exame de imagem (mamografia ou ultrassom)',
          prioridade: 'alta',
          status: 'aguardando_imagem',
          birads: null
        },
        contrarreferencia: null
      }
    };
  }

  function applyCounter(cuidado, birads, nota, now) {
    const cr = counterReferral(birads);
    if (!cr) return { ok: false, motivo: 'birads_invalido' };
    if (!cuidado || !cuidado.referencia) return { ok: false, motivo: 'sem_referencia' };
    const quando = now || new Date().toISOString();
    const next = {
      fase: cuidado.fase,
      referencia: { ...cuidado.referencia },
      contrarreferencia: {
        birads: Number(birads),
        nota: nota || '',
        registradaEm: quando,
        acao: cr.acao,
        titulo: cr.titulo
      }
    };
    if (cr.fechaReferencia) {
      next.fase = 'preventivo';
      next.referencia.status = 'encerrada';
    } else if (cr.acao === 'biopsia') {
      next.fase = 'biopsia';
      next.referencia.status = 'aguardando_biopsia';
    } else {
      next.fase = 'followup_curto';
      next.referencia.status = 'followup_curto';
    }
    return { ok: true, cuidado: next };
  }

  return {
    pathwayForStatus,
    counterReferral,
    patientKey,
    groupPatients,
    openReferral,
    applyCounter
  };
});
