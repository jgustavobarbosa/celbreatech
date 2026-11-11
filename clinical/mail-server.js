/* Serviço local de e-mail. Lê a chave só de /etc/celbrea/resend.env. */
const http = require('http');
const fs = require('fs');
const { Client } = require('pg');

const ENV_PATH = process.env.CELBREA_ENV || '/etc/celbrea/resend.env';
const ADMIN_EMAIL = 'plataformaray.ia@gmail.com';
const PORT = Number(process.env.PORT || 8791);
const TIPOS = new Set(['cadastro', 'resultado', 'agendamento', 'questionario']);
const hits = new Map();

function envFile() {
  const out = {};
  if (!fs.existsSync(ENV_PATH)) return out;
  fs.readFileSync(ENV_PATH, 'utf8').split('\n').forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const i = t.indexOf('=');
    if (i > 0) out[t.slice(0, i)] = t.slice(i + 1);
  });
  return out;
}

function limited(ip, tipo) {
  const key = ip + ':' + tipo;
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < 3600000);
  const max = tipo === 'cadastro' ? 20 : 60;
  if (list.length >= max) return true;
  list.push(now);
  hits.set(key, list);
  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 20000) reject(new Error('grande'));
      else chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (e) { reject(new Error('json')); }
    });
    req.on('error', reject);
  });
}

function emailOk(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
}

async function usuarioAtivo(env, token) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY;
  if (!url || !key || !token) return null;
  const headers = { apikey: key, Authorization: 'Bearer ' + token };
  const userRes = await fetch(url + '/auth/v1/user', { headers });
  if (!userRes.ok) return null;
  const user = await userRes.json();
  if (!user || !user.id) return null;
  const profRes = await fetch(url + '/rest/v1/profissionais?id=eq.' + user.id + '&select=ativo,email,nome', { headers });
  if (!profRes.ok) return null;
  const rows = await profRes.json();
  const prof = rows && rows[0];
  if (!prof || !prof.ativo) return null;
  return prof;
}

function texto(env, tipo, body) {
  const nome = String(body.nome || '').trim();
  const email = String(body.email || '').trim();
  const registro = String(body.registro || '').trim();
  const quando = String(body.quando || '').trim();
  const unidade = String(body.unidade || '').trim();
  const mensagem = String(body.mensagem || '').trim().slice(0, 4000);
  if (tipo === 'cadastro') {
    return {
      to: env.NOTIFY_EMAIL || ADMIN_EMAIL,
      subject: 'Novo cadastro profissional no CELBREA.IA',
      text: ['Chegou um cadastro profissional.', '', 'Nome: ' + nome, 'E-mail: ' + email, 'Registro: ' + (registro || 'não informado'), '', 'A liberação continua no aplicativo, em Registros.'].join('\n')
    };
  }
  const dest = String(body.para || '').trim();
  if (tipo === 'resultado') {
    return { to: dest, subject: 'Resultado do teste CELBREA', text: mensagem };
  }
  if (tipo === 'agendamento') {
    return { to: dest, subject: 'Agendamento CELBREA', text: ['Há um agendamento registrado.', quando ? 'Quando: ' + quando : '', unidade ? 'Unidade: ' + unidade : '', '', mensagem].filter(Boolean).join('\n') };
  }
  return { to: dest, subject: 'Questionário de avaliação CELBREA', text: mensagem };
}

async function send(env, mail) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.RESEND_FROM, to: [mail.to], subject: mail.subject, text: mail.text })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err.slice(0, 300));
  }
}

function senhaOk(p) {
  return String(p || '').length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
}

async function withDb(env, fn) {
  if (!env.DB_PASSWORD) {
    const err = new Error('db');
    err.motivo = 'db_pendente';
    throw err;
  }
  const db = new Client({
    host: env.DB_HOST || 'db.ghewsbwnetevyqtdkhgj.supabase.co',
    port: Number(env.DB_PORT || 5432),
    user: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD,
    database: env.DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false }
  });
  await db.connect();
  try { return await fn(db); }
  finally { await db.end(); }
}

async function garantirIdentidade(db, id, email) {
  await db.query(
    `insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
     select gen_random_uuid(), $1::uuid, jsonb_build_object('sub', $2::text, 'email', $3::text, 'email_verified', true), 'email', $2::text, now(), now(), now()
      where not exists (
        select 1 from auth.identities where user_id = $1::uuid and provider = 'email'
      )`,
    [id, String(id), email]
  );
}

async function conta(env, body) {
  const acao = String(body.acao || '');
  const email = String(body.email || '').trim().toLowerCase();
  const senha = String(body.senha || '');
  const nome = String(body.nome || '').trim();
  const registro = String(body.registro || '').trim();
  if (!emailOk(email) || !senhaOk(senha)) return { code: 400, payload: { motivo: 'dados' } };
  if (acao === 'criar' && nome.length < 3) return { code: 400, payload: { motivo: 'nome' } };
  if (acao !== 'criar' && acao !== 'senha') return { code: 400, payload: { motivo: 'acao' } };
  return withDb(env, async (db) => {
    const atual = await db.query(
      `select u.id, u.email_confirmed_at, coalesce(p.ativo, false) as ativo, coalesce(p.papel, '') as papel
         from auth.users u
         left join public.profissionais p on p.id = u.id
        where lower(u.email) = $1`,
      [email]
    );
    const row = atual.rows[0];
    if (row && row.papel === 'admin' && row.ativo) return { code: 403, payload: { motivo: 'admin' } };
    if (!row && acao === 'senha') return { code: 404, payload: { motivo: 'ausente' } };
    await db.query('begin');
    try {
      if (row) {
        await db.query(
          `update auth.users
              set encrypted_password = crypt($2, gen_salt('bf')),
                  email_confirmed_at = coalesce(email_confirmed_at, now()),
                  email_change = '',
                  confirmation_token = '',
                  updated_at = now()
            where id = $1`,
          [row.id, senha]
        );
        await garantirIdentidade(db, row.id, email);
        await db.query('commit');
        return { code: 200, payload: { ok: true, entrou: 'senha' } };
      }
      const meta = {
        nome: nome,
        registro: registro,
        termos_versao: '1.0',
        termos_aceito_em: new Date().toISOString()
      };
      const criado = await db.query(
        `insert into auth.users (
           instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
           raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
           confirmation_token, recovery_token, email_change_token_new, email_change,
           email_change_token_current, reauthentication_token
         )
         values (
           (select instance_id from auth.users limit 1), gen_random_uuid(), 'authenticated', 'authenticated',
           $1, crypt($2, gen_salt('bf')), now(),
           '{"provider":"email","providers":["email"]}'::jsonb, $3::jsonb, now(), now(),
           '', '', '', '', '', ''
         )
         returning id`,
        [email, senha, JSON.stringify(meta)]
      );
      const id = criado.rows[0].id;
      await garantirIdentidade(db, id, email);
      await db.query('commit');
      return { code: 200, payload: { ok: true, entrou: 'criada' } };
    } catch (e) {
      try { await db.query('rollback'); } catch (err) {}
      throw e;
    }
  });
}

function json(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const rota = req.url.split('?')[0];
  if (req.method !== 'POST' || (rota !== '/email' && rota !== '/conta')) return json(res, 404, { motivo: 'rota' });
  let body;
  try { body = await readBody(req); } catch (e) { return json(res, 400, { motivo: 'pedido' }); }
  const ip = String(req.headers['x-real-ip'] || req.socket.remoteAddress || '');
  const env = envFile();
  if (rota === '/conta') {
    if (limited(ip, 'conta')) return json(res, 429, { motivo: 'limite' });
    try {
      const out = await conta(env, body);
      return json(res, out.code, out.payload);
    } catch (e) {
      console.error('conta', e && e.message);
      return json(res, 503, { motivo: e.motivo || 'conta' });
    }
  }
  const tipo = String(body.tipo || '');
  if (!TIPOS.has(tipo)) return json(res, 400, { motivo: 'tipo' });
  if (limited(ip, tipo)) return json(res, 429, { motivo: 'limite' });
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) return json(res, 503, { motivo: 'resend_pendente' });
  if (tipo !== 'cadastro') {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const prof = await usuarioAtivo(env, token);
    if (!prof) return json(res, 401, { motivo: 'acesso' });
    if (!emailOk(body.para)) return json(res, 400, { motivo: 'destino' });
    if (!String(body.mensagem || '').trim()) return json(res, 400, { motivo: 'mensagem' });
  } else if (!emailOk(body.email) || String(body.nome || '').trim().length < 3) {
    return json(res, 400, { motivo: 'cadastro' });
  }
  try {
    await send(env, texto(env, tipo, body));
    json(res, 200, { ok: true });
  } catch (e) {
    json(res, 502, { motivo: 'envio' });
  }
});

server.listen(PORT, '127.0.0.1');
