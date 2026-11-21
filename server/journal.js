import { adminPage } from './admin-page.js';
import { atlasDocument } from './atlas-shell.js';
import { ATLAS_PROJECT_LABELS } from './atlas-projects.js';

const encoder = new TextEncoder();
const ORIGIN = 'https://novaia.org';
const YEAR = 365 * 24 * 60 * 60;
const VISITOR_COOKIE = 'novaia_visitor';
const ADMIN_COOKIE = 'novaia_admin';
const PUBLIC_COLUMNS = 'p.slug,p.title,p.excerpt,p.kind,p.project,p.published_at,p.cover_url,p.cover_alt';
const PUBLIC_WHERE = "p.status='published' AND p.published_at<=?";
const PROJECT_LABELS = ATLAS_PROJECT_LABELS;
const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function json(data, status = 200, extra = {}) {
  return Response.json(data, {status, headers:{...BASE_HEADERS, 'Cache-Control':'no-store', ...extra}});
}

function html(body, status = 200, extra = {}) {
  return new Response(body, {status, headers:{...BASE_HEADERS,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store', ...extra}});
}

function allowedMethod(request, methods) {
  if (!methods.includes(request.method)) throw new HttpError(405, 'Méthode non autorisée.');
}

function sameOrigin(request) {
  const own = new URL(request.url).origin;
  if (request.headers.get('Origin') !== own || ['cross-site','same-site'].includes(request.headers.get('Sec-Fetch-Site'))) {
    throw new HttpError(403, 'Cette action doit être effectuée depuis ce site.');
  }
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
}

function unbase64url(value) {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error('Invalid token');
  return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')), char => char.charCodeAt(0));
}

async function signingKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign','verify']);
}

export async function signToken(secret, purpose, id, ttl, now = Date.now()) {
  const data = base64url(encoder.encode(JSON.stringify({p:purpose,id,exp:Math.floor(now/1000)+ttl})));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(data));
  return `${data}.${base64url(signature)}`;
}

export async function verifyToken(secret, token, purpose, now = Date.now()) {
  if (!token || token.length > 1024) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const valid = await crypto.subtle.verify('HMAC', await signingKey(secret), unbase64url(parts[1]), encoder.encode(parts[0]));
    if (!valid) return null;
    const data = JSON.parse(new TextDecoder().decode(unbase64url(parts[0])));
    if (data.p !== purpose || typeof data.id !== 'string' || !/^[0-9a-f-]{36}$/.test(data.id) || !Number.isInteger(data.exp) || data.exp <= Math.floor(now/1000)) return null;
    return data.id;
  } catch { return null; }
}

function readCookie(request, name) {
  const match = (request.headers.get('Cookie') || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(`${name}=`));
  return match ? match.slice(name.length+1) : '';
}

function cookie(request, name, value, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

async function visitor(request, env) {
  const previous = await verifyToken(env.JOURNAL_SECRET, readCookie(request,VISITOR_COOKIE), 'visitor');
  if (previous) return {id:previous, headers:{}};
  const id = crypto.randomUUID();
  const token = await signToken(env.JOURNAL_SECRET,'visitor',id,YEAR);
  return {id, headers:{'Set-Cookie':cookie(request,VISITOR_COOKIE,token,YEAR)}};
}

async function requireAdmin(request, env) {
  if (!(await verifyToken(env.JOURNAL_SECRET,readCookie(request,ADMIN_COOKIE),'admin'))) {
    throw new HttpError(401,'Connecte-toi pour gérer le journal.');
  }
}

async function boundedBytes(request, max) {
  if (Number(request.headers.get('Content-Length')) > max) throw new HttpError(413,'Le fichier ou le texte est trop volumineux.');
  if (!request.body) return new Uint8Array();
  const reader=request.body.getReader();
  const chunks=[]; let total=0;
  try {
    while (true) {
      const {done,value}=await reader.read();
      if (done) break;
      total+=value.byteLength;
      if (total>max) { await reader.cancel(); throw new HttpError(413,'Le fichier ou le texte est trop volumineux.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result=new Uint8Array(total); let offset=0;
  for (const chunk of chunks) { result.set(chunk,offset); offset+=chunk.length; }
  return result;
}

async function readJson(request, max = 250000) {
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) throw new HttpError(415,'Un contenu JSON est attendu.');
  try { return JSON.parse(new TextDecoder().decode(await boundedBytes(request,max))); }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400,'Le contenu envoyé est invalide.'); }
}

async function rateLimit(db,key,limit,seconds) {
  const now=Math.floor(Date.now()/1000), window=Math.floor(now/seconds);
  const result=await db.prepare('INSERT INTO journal_rate_limits(key,window,hits,expires_at) VALUES(?,?,1,?) ON CONFLICT(key,window) DO UPDATE SET hits=hits+1 RETURNING hits').bind(key,window,now+seconds*2).first();
  // Bound storage without recording reader IP addresses or device information.
  await db.prepare('DELETE FROM journal_rate_limits WHERE expires_at<?').bind(now).run();
  if (result.hits>limit) throw new HttpError(429,'Trop de tentatives. Réessaie dans quelques minutes.');
}

function requireConfiguration(env) {
  if (!env.JOURNAL_DB || typeof env.JOURNAL_SECRET!=='string' || env.JOURNAL_SECRET.length<32) {
    throw new HttpError(503,'Le journal est momentanément indisponible. Réessaie un peu plus tard.');
  }
}

function publicPost(row) {
  return {...row,likes:Number(row.likes || 0)};
}

async function findPost(db,slug,withBody=true) {
  const columns=withBody ? `${PUBLIC_COLUMNS},p.id,p.body,p.updated_at` : PUBLIC_COLUMNS;
  return db.prepare(`SELECT ${columns},(SELECT count(*) FROM journal_likes l WHERE l.post_id=p.id) AS likes FROM journal_posts p WHERE p.slug=? AND ${PUBLIC_WHERE}`).bind(slug,new Date().toISOString()).first();
}

function cleanString(value, label, max, required=false) {
  if (value === undefined || value === null) value='';
  if (typeof value!=='string') throw new HttpError(400,`${label} est invalide.`);
  value=value.trim();
  if ((required&&!value) || value.length>max) throw new HttpError(400,`${label} : ${required?'renseigne ce champ et respecte':'respecte'} la limite de ${max} caractères.`);
  return value;
}

export function safeUrl(value, images=false) {
  if (typeof value!=='string') return '';
  if (/^\/(?!\/)/.test(value) && !/[\x00-\x20\\]/.test(value)) return value;
  try {
    const url=new URL(value);
    if (url.protocol==='https:' || (!images && url.protocol==='mailto:')) return url.href;
  } catch { /* Unsupported relative or dangerous protocol. */ }
  return '';
}

export function validatePost(input, existing) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw new HttpError(400,'Publication invalide.');
  const slug=cleanString(input.slug,'Adresse',120,true);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new HttpError(400,'L’adresse accepte uniquement les lettres minuscules sans accent, les chiffres et les tirets.');
  const kind=input.kind || 'note', status=input.status || 'draft';
  if (!['note','article','photo'].includes(kind) || !['draft','published','archived'].includes(status)) throw new HttpError(400,'Le format ou l’état de la publication est invalide.');
  const date=new Date(input.published_at || existing?.published_at || Date.now());
  if (!Number.isFinite(date.getTime())) throw new HttpError(400,'La date de publication est invalide.');
  const cover=cleanString(input.cover_url,'Image',2000);
  if (cover && !safeUrl(cover,true)) throw new HttpError(400,'Utilise une image du site ou une adresse HTTPS.');
  const project=cleanString(input.project,'Projet associé',80);
  if (project && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project)) throw new HttpError(400,'Le projet associé doit utiliser son identifiant sans espace ni accent.');
  return {
    id:existing?.id || crypto.randomUUID(), slug,
    title:cleanString(input.title,'Titre',160,true),excerpt:cleanString(input.excerpt,'Résumé',500),body:cleanString(input.body,'Texte',100000,true),
    kind,status,project,cover_url:cover,cover_alt:cleanString(input.cover_alt,'Description de l’image',300),
    published_at:date.toISOString(),created_at:existing?.created_at || new Date().toISOString(),updated_at:new Date(Math.max(Date.now(),existing?new Date(existing.updated_at).getTime()+1:0)).toISOString(),
  };
}

// Deliberately small Markdown dialect. Raw HTML is always escaped; embedded
// scripts, iframes and arbitrary styles never become executable markup.
function inline(text) {
  const tokens=[];
  let value=String(text).replace(/!?\[([^\]\n]{1,500})\]\(([^\s)]+)\)/g,(whole,label,url)=>{
    const image=whole.startsWith('!'); const safe=safeUrl(url,image);
    if (!safe) return whole;
    const token=image ? `<img src="${escapeHtml(safe)}" alt="${escapeHtml(label)}" loading="lazy" decoding="async">` : `<a href="${escapeHtml(safe)}"${safe.startsWith('https:')?' rel="noopener noreferrer"':''}>${escapeHtml(label)}</a>`;
    tokens.push(token); return `\u0000${tokens.length-1}\u0000`;
  });
  value=escapeHtml(value).replace(/`([^`\n]+)`/g,'<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*\n]+)\*/g,'<em>$1</em>');
  return value.replace(/\u0000(\d+)\u0000/g,(_,index)=>tokens[Number(index)] || '');
}

export function renderMarkdown(body) {
  const blocks=String(body).replace(/\r\n?/g,'\n').replace(/\u0000/g,'').split(/\n\s*\n/);
  return blocks.map(block=>{
    if (/^```/.test(block)) return `<pre><code>${escapeHtml(block.replace(/^```[^\n]*\n?/,'').replace(/\n?```$/,''))}</code></pre>`;
    if (/^#{1,3} /.test(block)) { const match=block.match(/^(#{1,3}) ([\s\S]*)$/);const level=Math.min(match[1].length+1,4);return `<h${level}>${inline(match[2])}</h${level}>`; }
    const lines=block.split('\n');
    if (lines.every(line=>/^[-*] /.test(line))) return `<ul>${lines.map(line=>`<li>${inline(line.slice(2))}</li>`).join('')}</ul>`;
    if (lines.every(line=>/^\d+\. /.test(line))) return `<ol>${lines.map(line=>`<li>${inline(line.replace(/^\d+\. /,''))}</li>`).join('')}</ol>`;
    if (lines.every(line=>/^> ?/.test(line))) return `<blockquote>${inline(lines.map(line=>line.replace(/^> ?/,'')).join(' '))}</blockquote>`;
    return `<p>${inline(block).replace(/\n/g,'<br>')}</p>`;
  }).join('\n');
}

const PUBLIC_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";

async function journalPlan(request,env) {
  allowedMethod(request,['GET','HEAD']);
  const params=new URL(request.url).searchParams;
  const page=Math.max(1,Math.min(20000,Math.floor(Number(params.get('page')))||1));
  const limit=50,now=new Date().toISOString();
  const count=await env.JOURNAL_DB.prepare(`SELECT count(*) AS total FROM journal_posts p WHERE ${PUBLIC_WHERE}`).bind(now).first();
  const total=Number(count.total),pages=Math.max(1,Math.ceil(total/limit));
  if (page>pages) throw new HttpError(404,'Cette page du journal est introuvable.');
  const result=await env.JOURNAL_DB.prepare(`SELECT ${PUBLIC_COLUMNS} FROM journal_posts p WHERE ${PUBLIC_WHERE} ORDER BY p.published_at DESC,p.id DESC LIMIT ? OFFSET ?`).bind(now,limit,(page-1)*limit).all();
  const dateFormat=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Paris'});
  const entries=result.results.map(post=>`<article class="journal-entry"><p class="eyebrow"><time datetime="${escapeHtml(post.published_at)}">${dateFormat.format(new Date(post.published_at))}</time> · ${escapeHtml(post.kind==='article'?'Article':post.kind==='photo'?'Photo':'Note')}${post.project?` · ${escapeHtml(PROJECT_LABELS[post.project] || post.project)}`:''}</p><h2><a href="/journal/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h2>${post.excerpt?`<p>${escapeHtml(post.excerpt)}</p>`:''}<a class="text-link" href="/journal/${escapeHtml(post.slug)}">Lire ${post.kind==='article'?'l’article':post.kind==='photo'?'la publication':'la note'}</a></article>`).join('');
  const pagination=pages>1?`<nav class="journal-pagination" aria-label="Pages du sommaire">${page>1?`<a class="button" href="/journal-plan${page===2?'':`?page=${page-1}`}">Page précédente</a>`:''}<p>Page ${page} sur ${pages}</p>${page<pages?`<a class="button" href="/journal-plan?page=${page+1}">Page suivante</a>`:''}</nav>`:'';
  const body=`<main id="main-content" class="page-wrap journal-plan"><header class="page-heading"><p class="eyebrow">Au fil des jours</p><h1>Le sommaire du journal.</h1><p class="page-deck">Les notes, les photos et les histoires. Un fil à reprendre là où tu veux.</p></header><section class="journal-list" aria-label="Publications">${entries||'<div class="empty-state"><h2>Les premières pages sont à venir.</h2><p>En attendant, il y a déjà des créations à découvrir.</p><a class="button" href="/projets">Explorer les créations</a></div>'}</section>${pagination}<aside class="related-paths"><a class="text-link" href="/journal">Retrouver la vue du journal</a><a class="text-link" href="/journal.xml">Suivre le journal par RSS</a></aside></main>`;
  return html(request.method==='HEAD'?null:atlasDocument({title:'Le sommaire du journal — Yann Wirtz',description:'Toutes les notes, les photos et les histoires du journal public de Yann Wirtz.',canonical:`/journal-plan${page>1?`?page=${page}`:''}`,body}),200,{'Cache-Control':'public,max-age=60','Content-Security-Policy':PUBLIC_CSP});
}

async function journalSitemap(request,env) {
  allowedMethod(request,['GET','HEAD']);
  const result=await env.JOURNAL_DB.prepare(`SELECT p.slug,p.updated_at FROM journal_posts p WHERE ${PUBLIC_WHERE} ORDER BY p.published_at DESC,p.id DESC LIMIT 1000`).bind(new Date().toISOString()).all();
  const entries=result.results.map(post=>`<url><loc>${ORIGIN}/journal/${escapeHtml(post.slug)}</loc><lastmod>${escapeHtml(post.updated_at.slice(0,10))}</lastmod></url>`).join('');
  return new Response(request.method==='HEAD'?null:`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`,{headers:{...BASE_HEADERS,'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public,max-age=300'}});
}

function articlePage(post,liked,nonce) {
  const title=escapeHtml(post.title), url=`${ORIGIN}/journal/${post.slug}`;
  const cover=post.cover_url ? `<figure class="journal-cover"><img src="${escapeHtml(post.cover_url)}" alt="${escapeHtml(post.cover_alt)}" width="1200" height="800" fetchpriority="high"></figure>` : '';
  const date=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Paris'}).format(new Date(post.published_at));
  const structured=JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting',headline:post.title,description:post.excerpt,datePublished:post.published_at,dateModified:post.updated_at,author:{'@type':'Person',name:'Yann Wirtz',url:ORIGIN},mainEntityOfPage:url,...(post.cover_url?{image:new URL(post.cover_url,ORIGIN).href}:{})}).replaceAll('<', String.fromCharCode(92)+'u003c');
  const head=`<meta property="og:type" content="article"><meta property="og:title" content="${title}"><meta property="og:description" content="${escapeHtml(post.excerpt)}"><meta property="og:url" content="${url}">${post.cover_url?`<meta property="og:image" content="${escapeHtml(new URL(post.cover_url,ORIGIN).href)}">`:''}<script nonce="${nonce}" type="application/ld+json">${structured}</script>`;
  const projectLink=Object.hasOwn(PROJECT_LABELS,post.project) ? `<a class="text-link" href="/projets/${escapeHtml(post.project)}">L’histoire de ${escapeHtml(PROJECT_LABELS[post.project])}</a>` : '';
  const body=`<main id="main-content" class="page-wrap journal-article"><header class="page-heading"><a class="eyebrow" href="/journal">Le journal</a><p class="post-meta"><time datetime="${escapeHtml(post.published_at)}">${date}</time> · ${escapeHtml(post.kind==='article'?'Article':post.kind==='photo'?'Photo':'Note')}${post.project?` · ${escapeHtml(PROJECT_LABELS[post.project] || post.project)}`:''}</p><h1>${title}</h1>${post.excerpt?`<p class="page-deck">${escapeHtml(post.excerpt)}</p>`:''}</header><article class="story-content">${cover}<div class="prose">${renderMarkdown(post.body)}</div><div class="post-actions"><button id="like-post" class="button like-button" type="button" aria-pressed="${liked}" data-slug="${escapeHtml(post.slug)}"><span aria-hidden="true">♡</span> <span id="like-label">${liked?'Aimé':'J’aime'}</span> <span id="like-count">${post.likes}</span></button><p id="like-message" role="status" aria-live="polite"></p><noscript><p>La lecture est libre. Active JavaScript pour utiliser les likes.</p></noscript></div></article><aside class="related-paths" aria-labelledby="related-title"><p class="eyebrow">Continuer la découverte</p><h2 id="related-title">Un chemin en croise un autre.</h2>${projectLink}<a class="text-link" href="/projets">Explorer les créations</a><a class="text-link" href="/journal">Retrouver le journal</a></aside></main>`;
  const tail=`<script nonce="${nonce}">const button=document.getElementById('like-post');button.addEventListener('click',async()=>{button.disabled=true;const liked=button.getAttribute('aria-pressed')!=='true';try{const response=await fetch('/api/journal/'+button.dataset.slug+'/like',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({liked})});const data=await response.json();if(!response.ok)throw Error(data.error||'Impossible d’enregistrer le like.');button.setAttribute('aria-pressed',String(data.liked));document.getElementById('like-label').textContent=data.liked?'Aimé':'J’aime';document.getElementById('like-count').textContent=data.likes;document.getElementById('like-message').textContent='';}catch(error){document.getElementById('like-message').textContent=error.message;}finally{button.disabled=false;}});</script>`;
  return atlasDocument({title:`${post.title} — Le journal de Yann`,description:post.excerpt,canonical:url,body,head,tail});
}

function escapeXml(value) {
  return escapeHtml(String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,''));
}

async function journalRss(request,env) {
  allowedMethod(request,['GET','HEAD']);
  const result=await env.JOURNAL_DB.prepare(`SELECT p.slug,p.title,p.excerpt,p.body,p.kind,p.project,p.published_at,p.updated_at FROM journal_posts p WHERE ${PUBLIC_WHERE} ORDER BY p.published_at DESC,p.id DESC LIMIT 50`).bind(new Date().toISOString()).all();
  const dates=result.results.map(post=>Date.parse(post.updated_at)).filter(Number.isFinite);
  const lastBuild=dates.length?`<lastBuildDate>${new Date(Math.max(...dates)).toUTCString()}</lastBuildDate>`:'';
  const items=result.results.map(post=>{
    const url=`${ORIGIN}/journal/${post.slug}`;
    const excerpt=post.excerpt || post.body.slice(0,600);
    const category=post.project ? `<category>${escapeXml(PROJECT_LABELS[post.project] || post.project)}</category>` : '';
    return `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(url)}</link><guid isPermaLink="true">${escapeXml(url)}</guid><pubDate>${new Date(post.published_at).toUTCString()}</pubDate><description>${escapeXml(excerpt)}</description>${category}</item>`;
  }).join('');
  const xml=`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Le journal de Yann Wirtz</title><link>${ORIGIN}/journal</link><description>Notes, créations et expériences. Le journal personnel de Yann Wirtz.</description><language>fr-FR</language><atom:link href="${ORIGIN}/journal.xml" rel="self" type="application/rss+xml"/>${lastBuild}${items}</channel></rss>`;
  return new Response(request.method==='HEAD'?null:xml,{headers:{...BASE_HEADERS,'Content-Type':'application/rss+xml; charset=utf-8','Cache-Control':'public,max-age=300'}});
}

export async function handleJournal(request, env) {
  const url=new URL(request.url), path=url.pathname.replace(/\/$/,'');
  if (!(path==='/admin' || path==='/journal-plan' || path==='/journal-sitemap.xml' || path==='/journal.xml' || path.startsWith('/api/admin/') || path==='/api/journal' || path.startsWith('/api/journal/') || /^\/journal\/[^/]+$/.test(path) || path.startsWith('/media/journal/'))) return null;
  try {
    if (path==='/admin') {
      allowedMethod(request,['GET','HEAD']);
      return html(request.method==='HEAD'?null:adminPage(),200,{'X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' https: blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});
    }
    requireConfiguration(env);
    const db=env.JOURNAL_DB;
    if (path==='/journal-plan') return await journalPlan(request,env);
    if (path==='/journal-sitemap.xml') return await journalSitemap(request,env);
    if (path==='/journal.xml') return await journalRss(request,env);
    if (path.startsWith('/media/journal/')) return await serveMedia(request,env,path);
    if (path.startsWith('/api/admin/')) return await handleAdmin(request,env,path);
    if (path==='/api/journal') {
      allowedMethod(request,['GET']);
      const limit=Math.max(1,Math.min(100,Math.floor(Number(url.searchParams.get('limit')))||50));
      const offset=Math.max(0,Math.min(1000000,Math.floor(Number(url.searchParams.get('offset')))||0));
      const q=cleanString(url.searchParams.get('q'),'Recherche',120);
      const project=cleanString(url.searchParams.get('project'),'Projet associé',80);
      const kind=cleanString(url.searchParams.get('kind'),'Format',20);
      if (project && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project)) throw new HttpError(400,'Le filtre de projet est invalide.');
      if (kind && !['note','article','photo'].includes(kind)) throw new HttpError(400,'Le filtre de format est invalide.');
      const clauses=[PUBLIC_WHERE],bindings=[new Date().toISOString()];
      if (q) {
        const pattern=`%${q.replace(/[\\%_]/g,'\\$&')}%`;
        clauses.push("(p.title LIKE ? ESCAPE '\\' OR p.excerpt LIKE ? ESCAPE '\\')");bindings.push(pattern,pattern);
      }
      if (project) {clauses.push('p.project=?');bindings.push(project);}
      if (kind) {clauses.push('p.kind=?');bindings.push(kind);}
      const rows=await db.prepare(`SELECT ${PUBLIC_COLUMNS},(SELECT count(*) FROM journal_likes l WHERE l.post_id=p.id) AS likes FROM journal_posts p WHERE ${clauses.join(' AND ')} ORDER BY p.published_at DESC,p.id DESC LIMIT ? OFFSET ?`).bind(...bindings,limit+1,offset).all();
      return json({posts:rows.results.slice(0,limit).map(publicPost),has_more:rows.results.length>limit,next_offset:rows.results.length>limit?offset+limit:null});
    }
    const match=path.match(/^\/api\/journal\/([a-z0-9-]+)(\/like)?$/);
    const pageMatch=path.match(/^\/journal\/([a-z0-9-]+)$/);
    if (!match&&!pageMatch) throw new HttpError(404,'Cette publication est introuvable.');
    const slug=(match||pageMatch)[1];
    allowedMethod(request,match?.[2]?['PUT']:['GET','HEAD']);
    const post=await findPost(db,slug);
    if (!post) {
      const alias=await db.prepare(`SELECT p.slug FROM journal_slug_aliases a JOIN journal_posts p ON p.id=a.post_id WHERE a.slug=? AND ${PUBLIC_WHERE}`).bind(slug,new Date().toISOString()).first();
      if (alias && pageMatch) return new Response(null,{status:301,headers:{Location:`/journal/${alias.slug}`}});
      throw new HttpError(404,'Cette publication est introuvable.');
    }
    const identity=await visitor(request,env);
    if (match?.[2]) {
      sameOrigin(request);
      const data=await readJson(request,1024);
      if (typeof data?.liked!=='boolean') throw new HttpError(400,'Choisis un état de like valide.');
      await rateLimit(db,'like:global',300,60);
      await rateLimit(db,`like:${identity.id}`,60,60);
      if (data.liked) await db.prepare('INSERT OR IGNORE INTO journal_likes(post_id,visitor_id,created_at) VALUES(?,?,?)').bind(post.id,identity.id,new Date().toISOString()).run();
      else await db.prepare('DELETE FROM journal_likes WHERE post_id=? AND visitor_id=?').bind(post.id,identity.id).run();
      const count=await db.prepare('SELECT count(*) AS likes FROM journal_likes WHERE post_id=?').bind(post.id).first();
      return json({liked:data.liked,likes:count.likes},200,identity.headers);
    }
    const liked=Boolean(await db.prepare('SELECT 1 AS liked FROM journal_likes WHERE post_id=? AND visitor_id=?').bind(post.id,identity.id).first());
    if (match) { const {id,...data}=post;return json({post:publicPost(data),liked,likes:Number(post.likes)},200,identity.headers); }
    const nonce=base64url(crypto.getRandomValues(new Uint8Array(18)));
    return html(request.method==='HEAD'?null:articlePage(publicPost(post),liked,nonce),200,{...identity.headers,'Content-Security-Policy':`default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self'; img-src 'self' https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`});
  } catch(error) {
    const status=error instanceof HttpError ? error.status : 500;
    const message=error instanceof HttpError ? error.message : 'Le journal rencontre un problème. Réessaie dans un instant.';
    if (path.startsWith('/api/')) return json({error:message},status,status===429?{'Retry-After':'900'}:{});
    const body=`<main id="main-content" class="page-wrap journal-error"><header class="page-heading"><p class="eyebrow">Le journal</p><h1>${status===404?'Cette page a pris un autre chemin.':'Une petite interruption.'}</h1><p class="page-deck">${escapeHtml(message)}</p></header><div class="related-paths"><a class="button" href="/journal">Retrouver le journal</a><a class="text-link" href="/">Revenir à l’accueil</a></div></main>`;
    return html(request.method==='HEAD'?null:atlasDocument({title:`${status===404?'Page introuvable':'Le journal'} — Yann`,body,noindex:true}),status,{'X-Robots-Tag':'noindex','Content-Security-Policy':PUBLIC_CSP});
  }
}

async function handleAdmin(request,env,path) {
  const db=env.JOURNAL_DB;
  if (!['GET','HEAD'].includes(request.method)) sameOrigin(request);
  if (path==='/api/admin/login') {
    allowedMethod(request,['POST']);
    if (typeof env.ADMIN_PASSWORD!=='string'||env.ADMIN_PASSWORD.length<20) throw new HttpError(503,'La connexion privée n’est pas encore configurée.');
    const identity=await visitor(request,env);
    await rateLimit(db,'login:global',100,900);
    await rateLimit(db,`login:${identity.id}`,8,900);
    const data=await readJson(request,4096);
    const password=typeof data?.password==='string' ? data.password : '';
    // WebCrypto HMAC verification compares fixed-size digests, not password prefixes.
    const key=await signingKey(env.JOURNAL_SECRET);
    const expected=await crypto.subtle.sign('HMAC',key,encoder.encode(env.ADMIN_PASSWORD));
    const matches=await crypto.subtle.verify('HMAC',key,expected,encoder.encode(password));
    if (!matches) return json({error:'Le mot de passe est incorrect.'},401,identity.headers);
    const token=await signToken(env.JOURNAL_SECRET,'admin',crypto.randomUUID(),8*3600);
    const headers=new Headers({...BASE_HEADERS,'Cache-Control':'no-store','Content-Type':'application/json','X-Robots-Tag':'noindex'});
    if (identity.headers['Set-Cookie']) headers.append('Set-Cookie',identity.headers['Set-Cookie']);
    headers.append('Set-Cookie',cookie(request,ADMIN_COOKIE,token,8*3600));
    return new Response(JSON.stringify({ok:true}),{headers});
  }
  if (path==='/api/admin/logout') {
    allowedMethod(request,['POST']);
    return json({ok:true},200,{'Set-Cookie':cookie(request,ADMIN_COOKIE,'',0)});
  }
  await requireAdmin(request,env);
  if (path==='/api/admin/session') { allowedMethod(request,['GET']);return json({authenticated:true,media_enabled:Boolean(env.JOURNAL_MEDIA)}); }
  if (path==='/api/admin/preview') {
    allowedMethod(request,['POST']);
    const input=await readJson(request);
    return json({html:renderMarkdown(cleanString(input?.body,'Texte',100000))});
  }
  if (path==='/api/admin/media') return uploadMedia(request,env);
  if (path==='/api/admin/posts') {
    allowedMethod(request,['GET','POST']);
    if (request.method==='GET') {
      const params=new URL(request.url).searchParams;
      const limit=Math.max(1,Math.min(100,Math.floor(Number(params.get('limit')))||100));
      const offset=Math.max(0,Math.min(1000000,Math.floor(Number(params.get('offset')))||0));
      const result=await db.prepare('SELECT p.id,p.slug,p.title,p.status,p.kind,p.published_at,p.updated_at,(SELECT count(*) FROM journal_likes l WHERE l.post_id=p.id) AS likes FROM journal_posts p ORDER BY p.updated_at DESC,p.id DESC LIMIT ? OFFSET ?').bind(limit+1,offset).all();
      return json({posts:result.results.slice(0,limit),next_offset:result.results.length>limit?offset+limit:null});
    }
    const post=validatePost(await readJson(request));
    await ensureSlug(db,post.slug,post.id);
    await db.prepare('INSERT INTO journal_posts(id,slug,title,excerpt,body,kind,project,cover_url,cover_alt,status,published_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(...['id','slug','title','excerpt','body','kind','project','cover_url','cover_alt','status','published_at','created_at','updated_at'].map(key=>post[key])).run();
    return json({post},201);
  }
  const match=path.match(/^\/api\/admin\/posts\/([0-9a-f-]{36})$/);
  if (!match) throw new HttpError(404,'Cette action est introuvable.');
  allowedMethod(request,['GET','PUT','DELETE']);
  const existing=await db.prepare('SELECT * FROM journal_posts WHERE id=?').bind(match[1]).first();
  if (!existing) throw new HttpError(404,'Cette publication est introuvable.');
  if (request.method==='GET') return json({post:existing});
  if (request.method==='DELETE') {
    await db.prepare("UPDATE journal_posts SET status='archived',updated_at=? WHERE id=?").bind(new Date().toISOString(),existing.id).run();
    return json({ok:true,archived:true});
  }
  const input=await readJson(request);
  if (input.updated_at && input.updated_at!==existing.updated_at) throw new HttpError(409,'Cette publication a changé dans un autre onglet. Recharge-la avant de continuer.');
  const post=validatePost(input,existing);
  await ensureSlug(db,post.slug,post.id);
  const statements=[db.prepare('UPDATE journal_posts SET slug=?,title=?,excerpt=?,body=?,kind=?,project=?,cover_url=?,cover_alt=?,status=?,published_at=?,updated_at=? WHERE id=? AND updated_at=?').bind(...['slug','title','excerpt','body','kind','project','cover_url','cover_alt','status','published_at','updated_at','id'].map(key=>post[key]),existing.updated_at)];
  if (post.slug!==existing.slug) statements.push(db.prepare('INSERT OR IGNORE INTO journal_slug_aliases(slug,post_id) SELECT ?,id FROM journal_posts WHERE id=? AND slug=? AND updated_at=?').bind(existing.slug,existing.id,post.slug,post.updated_at));
  const results=await db.batch(statements);
  if (!results[0].meta.changes) throw new HttpError(409,'Cette publication a changé dans un autre onglet. Recharge-la avant de continuer.');
  return json({post});
}

async function ensureSlug(db,slug,id) {
  const conflict=await db.prepare('SELECT id FROM journal_posts WHERE slug=? AND id<>? UNION ALL SELECT post_id AS id FROM journal_slug_aliases WHERE slug=? AND post_id<>? LIMIT 1').bind(slug,id,slug,id).first();
  if (conflict) throw new HttpError(409,'Cette adresse est déjà utilisée. Choisis-en une autre.');
}

function detectImage(bytes) {
  if (bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff) return {type:'image/jpeg',extension:'jpg'};
  if (bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10) return {type:'image/png',extension:'png'};
  if (String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP') return {type:'image/webp',extension:'webp'};
  return null;
}

async function uploadMedia(request,env) {
  allowedMethod(request,['POST']);
  if (!env.JOURNAL_MEDIA) throw new HttpError(503,'L’envoi de photos n’est pas configuré. Tu peux utiliser une image déjà hébergée.');
  await rateLimit(env.JOURNAL_DB,'media:admin',60,3600);
  const bytes=await boundedBytes(request,5*1024*1024),image=detectImage(bytes);
  if (!image || image.type!==request.headers.get('Content-Type')) throw new HttpError(415,'Choisis une image JPEG, PNG ou WebP valide.');
  const key=`${crypto.randomUUID()}.${image.extension}`;
  await env.JOURNAL_MEDIA.put(key,bytes,{httpMetadata:{contentType:image.type,cacheControl:'public,max-age=31536000,immutable'}});
  return json({url:`/media/journal/${key}`},201);
}

async function serveMedia(request,env,path) {
  allowedMethod(request,['GET','HEAD']);
  if (!env.JOURNAL_MEDIA) throw new HttpError(404,'Cette image est introuvable.');
  const key=path.slice('/media/journal/'.length);
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key)) throw new HttpError(404,'Cette image est introuvable.');
  const object=await env.JOURNAL_MEDIA.get(key);
  if (!object) throw new HttpError(404,'Cette image est introuvable.');
  const headers=new Headers(BASE_HEADERS); object.writeHttpMetadata(headers);
  headers.set('Cache-Control','public,max-age=31536000,immutable');headers.set('ETag',object.httpEtag);headers.set('Content-Security-Policy',"default-src 'none'; sandbox");
  if (request.headers.get('If-None-Match')===object.httpEtag) return new Response(null,{status:304,headers});
  return new Response(request.method==='HEAD'?null:object.body,{headers});
}
