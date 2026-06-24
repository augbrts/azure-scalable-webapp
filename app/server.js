'use strict';

const express = require('express');
const db = require('./db');
const storage = require('./storage');
const { getInstanceInfo } = require('./instance');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const PROJECT_NAME = process.env.PROJECT_NAME || 'Byte Academy';

app.use(express.urlencoded({ extended: false }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const STYLE = `
  :root{
    --ink:#101418; --muted:#5b6672; --line:#e3e7ec; --paper:#f4f6f8;
    --surface:#ffffff; --primary:#115e59; --primary-ink:#0c403c; --accent:#b45309;
    --radius:14px; --maxw:880px;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    line-height:1.5}
  a{color:var(--primary)}
  .wrap{max-width:var(--maxw);margin:0 auto;padding:0 20px}
  header.site{background:linear-gradient(180deg,#0f4f4a,#115e59);color:#eafaf7;
    padding:34px 0 30px;border-bottom:3px solid var(--accent)}
  header.site .eyebrow{letter-spacing:.16em;text-transform:uppercase;font-size:12px;
    font-weight:600;color:#9fe7df;margin:0 0 6px}
  header.site h1{margin:0;font-size:30px;font-weight:800;letter-spacing:-.02em}
  header.site p{margin:8px 0 0;color:#cdeee9;max-width:54ch}
  main{padding:28px 0 56px}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);
    padding:22px;margin:0 0 22px;box-shadow:0 1px 2px rgba(16,20,24,.04)}
  .card h2{margin:0 0 4px;font-size:19px;letter-spacing:-.01em}
  .card .hint{margin:0 0 16px;color:var(--muted);font-size:14px}
  ul.materiais{list-style:none;margin:0;padding:0}
  ul.materiais li{display:flex;align-items:center;gap:12px;padding:11px 0;
    border-top:1px solid var(--line)}
  ul.materiais li:first-child{border-top:0}
  ul.materiais .doc{flex:0 0 34px;height:34px;border-radius:8px;background:#e8f3f1;
    color:var(--primary);display:grid;place-items:center;font-weight:700;font-size:12px}
  ul.materiais .name{font-weight:600}
  ul.materiais .meta{color:var(--muted);font-size:13px}
  ul.materiais .grow{flex:1}
  .btn{display:inline-block;background:var(--primary);color:#fff;text-decoration:none;
    border:0;border-radius:9px;padding:9px 15px;font-size:14px;font-weight:600;cursor:pointer}
  .btn.small{padding:7px 12px;font-size:13px}
  .btn:hover{background:var(--primary-ink)}
  form.atividade{display:grid;gap:12px}
  .row{display:grid;gap:12px;grid-template-columns:1fr 1fr}
  @media(max-width:560px){.row{grid-template-columns:1fr}}
  label{display:block;font-size:13px;font-weight:600;margin:0 0 5px;color:#2a323b}
  input,textarea{width:100%;border:1px solid var(--line);border-radius:9px;padding:10px 12px;
    font:inherit;color:var(--ink);background:#fff}
  input:focus,textarea:focus{outline:2px solid #9fd5cf;border-color:var(--primary)}
  textarea{min-height:78px;resize:vertical}
  table.lista{width:100%;border-collapse:collapse;margin-top:4px}
  table.lista th,table.lista td{text-align:left;padding:10px 8px;border-top:1px solid var(--line);
    font-size:14px;vertical-align:top}
  table.lista th{color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;
    letter-spacing:.04em}
  .empty{color:var(--muted);font-size:14px;padding:8px 0}
  .alert{background:#fdf3e7;border:1px solid #f3d8b3;color:#7a4a12;border-radius:10px;
    padding:11px 13px;font-size:14px;margin:0 0 14px}
  footer.site{border-top:1px solid var(--line);padding:20px 0 40px;color:var(--muted);font-size:13px}
  .badge{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);
    border-radius:999px;padding:6px 12px;font-size:13px;color:#2a323b}
  .badge .dot{width:8px;height:8px;border-radius:50%;background:var(--accent)}
  .badge code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700;color:var(--primary-ink)}
`;

function instanceBadge(instance) {
  const label = escapeHtml(instance.name || instance.hostname);
  const loc = instance.location ? ` · ${escapeHtml(instance.location)}` : '';
  return `<span class="badge"><span class="dot"></span>Respondido por <code>${label}</code>${loc}</span>`;
}

function renderHome({ instance, materiais, materiaisErro, atividades, total, dbErro }) {
  const materiaisHtml = materiaisErro
    ? `<div class="alert">Não foi possível listar os materiais agora. Tente recarregar em instantes.</div>`
    : materiais.length === 0
      ? `<p class="empty">Nenhum material publicado ainda.</p>`
      : `<ul class="materiais">${materiais.map((m) => `
          <li>
            <span class="doc">${escapeHtml((m.name.split('.').pop() || 'doc').slice(0, 4).toUpperCase())}</span>
            <span>
              <span class="name">${escapeHtml(m.name)}</span><br>
              <span class="meta">${m.sizeKB ? m.sizeKB + ' KB' : ''}</span>
            </span>
            <span class="grow"></span>
            <a class="btn small" href="/material/${encodeURIComponent(m.name)}">Abrir</a>
          </li>`).join('')}</ul>`;

  const atividadesHtml = dbErro
    ? `<div class="alert">O banco está indisponível no momento, então as atividades não puderam ser carregadas.</div>`
    : atividades.length === 0
      ? `<p class="empty">Ainda não há atividades postadas. Seja o primeiro!</p>`
      : `<table class="lista">
           <thead><tr><th>Aluno</th><th>Atividade</th><th>Quando</th></tr></thead>
           <tbody>${atividades.map((a) => `
             <tr>
               <td>${escapeHtml(a.aluno)}</td>
               <td><strong>${escapeHtml(a.titulo)}</strong>${a.descricao ? `<br><span class="meta">${escapeHtml(a.descricao)}</span>` : ''}</td>
               <td class="meta">${escapeHtml(formatDate(a.criado_em))}</td>
             </tr>`).join('')}</tbody>
         </table>`;

  const totalLabel = dbErro ? '—' : total;

  return `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(PROJECT_NAME)}</title>
<style>${STYLE}</style>
</head>
<body>
  <header class="site">
    <div class="wrap">
      <p class="eyebrow">Projeto 1 · Infraestrutura em nuvem</p>
      <h1>${escapeHtml(PROJECT_NAME)}</h1>
      <p>Portal institucional da turma: acesse os materiais de aula e publique suas atividades.</p>
    </div>
  </header>

  <main class="wrap">
    <section class="card">
      <h2>Materiais de aula</h2>
      <p class="hint">Arquivos disponibilizados pelo professor, servidos a partir do armazenamento de objetos.</p>
      ${materiaisHtml}
    </section>

    <section class="card">
      <h2>Postar uma atividade</h2>
      <p class="hint">Sua submissão fica registrada no banco de dados da turma. Total já postado: <strong>${totalLabel}</strong>.</p>
      <form class="atividade" method="post" action="/atividade">
        <div class="row">
          <div>
            <label for="aluno">Seu nome</label>
            <input id="aluno" name="aluno" maxlength="120" required placeholder="Ex.: Ana Souza">
          </div>
          <div>
            <label for="titulo">Título da atividade</label>
            <input id="titulo" name="titulo" maxlength="200" required placeholder="Ex.: Atividade 3 — Redes">
          </div>
        </div>
        <div>
          <label for="descricao">Descrição ou link (opcional)</label>
          <textarea id="descricao" name="descricao" maxlength="1000" placeholder="Um resumo, observações ou um link para o trabalho."></textarea>
        </div>
        <div><button class="btn" type="submit">Publicar atividade</button></div>
      </form>
    </section>

    <section class="card">
      <h2>Atividades publicadas</h2>
      <p class="hint">Lidas em tempo real do banco de dados gerenciado.</p>
      ${atividadesHtml}
    </section>
  </main>

  <footer class="site">
    <div class="wrap">${instanceBadge(instance)}</div>
  </footer>
</body>
</html>`;
}

function renderMsg(message, backHref) {
  return `<!doctype html>
<html lang="pt-br"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(PROJECT_NAME)}</title><style>${STYLE}</style></head>
<body><main class="wrap" style="padding-top:40px">
  <section class="card">
    <h2>${escapeHtml(PROJECT_NAME)}</h2>
    <p>${escapeHtml(message)}</p>
    <a class="btn" href="${escapeHtml(backHref)}">Voltar</a>
  </section>
</main></body></html>`;
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch (_) {
    return String(value);
  }
}

app.get('/health', (_req, res) => res.status(200).send('OK'));

app.get('/', async (_req, res) => {
  const instance = await getInstanceInfo();

  let materiais = [];
  let materiaisErro = null;
  try {
    materiais = await storage.listMateriais();
  } catch (e) {
    materiaisErro = e.message;
    console.error('Blob erro:', e.message);
  }

  let atividades = [];
  let total = 0;
  let dbErro = null;
  try {
    atividades = await db.listAtividades();
    total = await db.countAtividades();
  } catch (e) {
    dbErro = e.message;
    console.error('DB erro:', e.message);
  }

  res.send(renderHome({ instance, materiais, materiaisErro, atividades, total, dbErro }));
});

app.post('/atividade', async (req, res) => {
  const aluno = (req.body.aluno || '').trim().slice(0, 120);
  const titulo = (req.body.titulo || '').trim().slice(0, 200);
  const descricao = (req.body.descricao || '').trim().slice(0, 1000);

  if (!aluno || !titulo) {
    return res.status(400).send(renderMsg('Preencha pelo menos o nome e o título da atividade.', '/'));
  }
  try {
    await db.addAtividade(aluno, titulo, descricao);
    res.redirect('/');
  } catch (e) {
    console.error('DB insert erro:', e.message);
    res.status(500).send(renderMsg('Não foi possível salvar a atividade agora. Tente novamente em instantes.', '/'));
  }
});

app.get('/material/:name', async (req, res) => {
  try {
    const { stream, contentType, contentLength } = await storage.downloadMaterial(req.params.name);
    if (contentType) res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(req.params.name)}"`);
    stream.pipe(res);
  } catch (e) {
    console.error('Download erro:', e.message);
    res.status(404).send(renderMsg('Material não encontrado.', '/'));
  }
});

app.get('/db-test', async (_req, res) => {
  try {
    await db.ping();
    const total = await db.countAtividades();
    res.json({ status: 'OK', mensagem: 'Conexão com o banco realizada com sucesso.', atividades: total });
  } catch (e) {
    res.status(500).json({ status: 'ERRO', mensagem: e.message });
  }
});

(async () => {
  try {
    await db.initDb();
    console.log('Banco: tabela "atividades" verificada/criada.');
  } catch (e) {
    console.error('Banco indisponível na inicialização (a app subirá mesmo assim):', e.message);
  }
  app.listen(PORT, () => console.log(`${PROJECT_NAME} ouvindo na porta ${PORT}`));
})();
