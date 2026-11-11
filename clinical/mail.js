/* Envio pelo servidor. A chave da Resend não fica neste arquivo. */
(function (root) {
  async function enviar(tipo, dados, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch('/celbrea/api/email', {
      method: 'POST',
      headers,
      body: JSON.stringify(Object.assign({ tipo: tipo }, dados || {}))
    });
    let body = {};
    try { body = await res.json(); } catch (e) {}
    return { ok: res.ok, status: res.status, motivo: body.motivo || '' };
  }
  root.CelbreaMail = { enviar };
})(typeof globalThis !== 'undefined' ? globalThis : this);
