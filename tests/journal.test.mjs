import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { Script } from 'node:vm';
import { handleJournal, renderMarkdown, signToken, verifyToken, validatePost, safeUrl } from '../server/journal.js';
import { adminPage } from '../server/admin-page.js';

const origin='https://novaia.org';
function database() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_journal.sql',import.meta.url),'utf8'));
  function prepare(sql) {
    let args=[];
    const statement={bind(...values){args=values;return statement;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){const result=sqlite.prepare(sql).run(...args);return {success:true,meta:{changes:result.changes},results:[]};}};
    return statement;
  }
  return {prepare,async batch(statements){sqlite.exec('BEGIN');try{const values=[];for(const statement of statements)values.push(await statement.run());sqlite.exec('COMMIT');return values;}catch(error){sqlite.exec('ROLLBACK');throw error;}},sqlite};
}
function fixture() {return {JOURNAL_DB:database(),JOURNAL_SECRET:'test-journal-signing-secret-64-characters-random-in-production-123',ADMIN_PASSWORD:'test-only-password-long-enough-1234567'};}
function request(path,{method='GET',body,cookie,foreign=false,headers={}}={}) {
  return new Request(origin+path,{method,headers:{...(method!=='GET'&&method!=='HEAD'?{'Origin':foreign?'https://foreign.example':origin,'Content-Type':'application/json'}:{}),...(cookie?{'Cookie':cookie}:{}),...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
}
function cookieFrom(response,name) {const values=response.headers.getSetCookie();const value=values.find(value=>value.startsWith(name+'='));return value?.split(';')[0]||'';}
async function login(env,password=env.ADMIN_PASSWORD) {const response=await handleJournal(request('/api/admin/login',{method:'POST',body:{password}}),env);assert.equal(response.status,200);return cookieFrom(response,'novaia_admin');}
async function create(env,cookie,changes={}) {
  const response=await handleJournal(request('/api/admin/posts',{method:'POST',cookie,body:{slug:'une-note',title:'Une note',excerpt:'Quelques mots',body:'Un texte **personnel**.',kind:'note',status:'published',published_at:'2026-01-01T12:00:00.000Z',...changes}}),env);
  assert.equal(response.status,201,JSON.stringify(await response.clone().json()));
  return (await response.json()).post;
}

test('signed identities reject tampering, wrong purposes and expiry',async()=>{
  const secret=fixture().JOURNAL_SECRET,id=crypto.randomUUID(),now=1700000000000;
  const token=await signToken(secret,'visitor',id,60,now);
  assert.equal(await verifyToken(secret,token,'visitor',now),id);
  assert.equal(await verifyToken(secret,token,'admin',now),null);
  assert.equal(await verifyToken(secret,token,'visitor',now+61000),null);
  const [data,signature]=token.split('.');assert.equal(await verifyToken(secret,data+'.'+(signature[0]==='a'?'b':'a')+signature.slice(1),'visitor',now),null);
});

test('markup never executes raw HTML or dangerous link protocols',()=>{
  const result=renderMarkdown('# Bonjour\n\n<script>alert(1)</script>\n\n[click](javascript:alert)\n\n![photo](https://example.com/a.jpg)\n\n- **Oui**\n- *ici*');
  assert.match(result,/<h2>Bonjour<\/h2>/);assert.ok(!result.includes('<script>'));assert.ok(!result.includes('href="javascript:'));assert.match(result,/&lt;script&gt;/);assert.match(result,/<img src="https:\/\/example.com\/a.jpg"/);assert.match(result,/<ul><li><strong>Oui/);
  assert.equal(safeUrl('//evil.example'), '');assert.equal(safeUrl('/\\evil.example'), '');assert.equal(safeUrl('data:image/png;base64,a',true), '');
});

test('public feed omits drafts, archived texts and future posts',async()=>{
  const env=fixture(),admin=await login(env);
  await create(env,admin);await create(env,admin,{slug:'brouillon',status:'draft'});await create(env,admin,{slug:'archive',status:'archived'});await create(env,admin,{slug:'avenir',published_at:'2099-01-01T00:00:00Z'});
  const response=await handleJournal(request('/api/journal'),env),data=await response.json();assert.equal(response.status,200);assert.deepEqual(data.posts.map(post=>post.slug),['une-note']);assert.equal(data.posts[0].likes,0);assert.equal(response.headers.get('Set-Cookie'),null);
  for(const slug of ['brouillon','archive','avenir'])assert.equal((await handleJournal(request('/journal/'+slug),env)).status,404);
});

test('public filters combine safely and pagination applies after filtering',async()=>{
  const env=fixture(),admin=await login(env);
  await create(env,admin,{slug:'memoire-note',title:'Une mémoire durable',excerpt:'Le fil de NovaMemory.',project:'novamemory',kind:'note',published_at:'2026-01-03T12:00:00Z'});
  await create(env,admin,{slug:'memoire-article',title:'Le contexte',excerpt:'Retour sur une mémoire durable.',project:'novamemory',kind:'article',published_at:'2026-01-02T12:00:00Z'});
  await create(env,admin,{slug:'livre-photo',title:'Une page en photo',excerpt:'La mémoire du livre.',project:'novalove',kind:'photo'});
  await create(env,admin,{slug:'literal-percent',title:'Un progrès de 100%',excerpt:'Un signe littéral.',project:'novamemory'});
  await create(env,admin,{slug:'literal-underscore',title:'Un nom_avec_tirets',excerpt:'Un autre signe littéral.'});
  async function feed(query){const response=await handleJournal(request('/api/journal?'+query),env);assert.equal(response.status,200);return response.json();}
  let data=await feed('q='+encodeURIComponent('mémoire')+'&project=novamemory&kind=note');assert.deepEqual(data.posts.map(post=>post.slug),['memoire-note']);
  data=await feed('project=novamemory&limit=1');assert.equal(data.posts.length,1);assert.equal(data.posts[0].slug,'memoire-note');assert.equal(data.has_more,true);assert.equal(data.next_offset,1);
  data=await feed('project=novamemory&limit=1&offset=1');assert.equal(data.posts[0].slug,'memoire-article');assert.equal(data.next_offset,2);
  data=await feed('q=%25');assert.deepEqual(data.posts.map(post=>post.slug),['literal-percent']);
  data=await feed('q=_');assert.deepEqual(data.posts.map(post=>post.slug),['literal-underscore']);
  data=await feed('q='+encodeURIComponent("' OR 1=1 --"));assert.equal(data.posts.length,0);
  assert.equal((await handleJournal(request('/api/journal?kind=unknown'),env)).status,400);
  assert.equal((await handleJournal(request('/api/journal?project='+encodeURIComponent('invalid project')),env)).status,400);
  assert.equal((await handleJournal(request('/api/journal?q='+'a'.repeat(121)),env)).status,400);
  assert.match(adminPage(),/<select id="project" name="project">/);assert.match(adminPage(),/<option value="rock-de-strass">Rock de Strass<\/option>/);
});

test('likes persist, are idempotent, undoable and isolated by signed anonymous identity',async()=>{
  const env=fixture(),admin=await login(env);await create(env,admin);
  const detail=await handleJournal(request('/api/journal/une-note'),env),visitor=cookieFrom(detail,'novaia_visitor');assert.ok(visitor);assert.match(detail.headers.get('Set-Cookie'),/HttpOnly; SameSite=Lax; Secure/);
  for(let i=0;i<2;i++){const response=await handleJournal(request('/api/journal/une-note/like',{method:'PUT',cookie:visitor,body:{liked:true}}),env);assert.deepEqual(await response.json(),{liked:true,likes:1});}
  let data=await (await handleJournal(request('/api/journal/une-note',{cookie:visitor}),env)).json();assert.equal(data.liked,true);assert.equal(data.post.likes,1);
  data=await (await handleJournal(request('/api/journal/une-note'),env)).json();assert.equal(data.liked,false);assert.equal(data.likes,1);
  const undo=await handleJournal(request('/api/journal/une-note/like',{method:'PUT',cookie:visitor,body:{liked:false}}),env);assert.deepEqual(await undo.json(),{liked:false,likes:0});
  assert.equal(env.JOURNAL_DB.sqlite.prepare('SELECT count(*) AS count FROM journal_likes').get().count,0);
});

test('cross-origin state changes and unauthenticated administration are denied',async()=>{
  const env=fixture();
  assert.equal((await handleJournal(request('/api/admin/posts'),env)).status,401);
  assert.equal((await handleJournal(request('/api/admin/login',{method:'POST',foreign:true,body:{password:env.ADMIN_PASSWORD}}),env)).status,403);
  const admin=await login(env);await create(env,admin);
  assert.equal((await handleJournal(request('/api/journal/une-note/like',{method:'PUT',foreign:true,body:{liked:true}}),env)).status,403);
  assert.equal((await handleJournal(request('/api/journal/une-note/like',{method:'GET'}),env)).status,405);
  assert.equal((await handleJournal(request('/api/admin/posts',{method:'POST',cookie:admin,body:'{}',headers:{'Content-Type':'text/plain'}}),env)).status,415);
});

test('password login rate limit follows signed cookie and records no IP',async()=>{
  const env=fixture();let cookie='';
  for(let i=0;i<9;i++){const response=await handleJournal(request('/api/admin/login',{method:'POST',cookie,body:{password:'incorrect'}}),env);if(!cookie)cookie=cookieFrom(response,'novaia_visitor');assert.equal(response.status,i===8?429:401);}
  const columns=env.JOURNAL_DB.sqlite.prepare('PRAGMA table_info(journal_rate_limits)').all().map(row=>row.name);assert.deepEqual(columns,['key','window','hits','expires_at']);
});

test('resetting cookies cannot grow per-visitor login counters past the global cap',async()=>{
  const env=fixture();
  for(let i=0;i<120;i++) {
    const response=await handleJournal(request('/api/admin/login',{method:'POST',body:{password:'incorrect'}}),env);
    assert.equal(response.status,i<100?401:429);
  }
  const counters=env.JOURNAL_DB.sqlite.prepare("SELECT count(*) AS total FROM journal_rate_limits WHERE key LIKE 'login:%' AND key<>'login:global'").get();assert.equal(counters.total,100);
  const global=env.JOURNAL_DB.sqlite.prepare("SELECT hits FROM journal_rate_limits WHERE key='login:global'").get();assert.equal(global.hits,120);
});

test('changing slug preserves old published URL and detects concurrent editing',async()=>{
  const env=fixture(),admin=await login(env),post=await create(env,admin);
  const update=await handleJournal(request('/api/admin/posts/'+post.id,{method:'PUT',cookie:admin,body:{...post,slug:'nouvelle-adresse'}}),env);assert.equal(update.status,200);
  const alias=await handleJournal(request('/journal/une-note'),env);assert.equal(alias.status,301);assert.equal(alias.headers.get('Location'),'/journal/nouvelle-adresse');
  const stale=await handleJournal(request('/api/admin/posts/'+post.id,{method:'PUT',cookie:admin,body:{...post,updated_at:'2000-01-01T00:00:00Z'}}),env);assert.equal(stale.status,409);
  const archived=await handleJournal(request('/api/admin/posts/'+post.id,{method:'DELETE',cookie:admin,body:{}}),env);assert.equal(archived.status,200);assert.equal((await handleJournal(request('/journal/nouvelle-adresse'),env)).status,404);assert.equal(env.JOURNAL_DB.sqlite.prepare('SELECT status FROM journal_posts WHERE id=?').get(post.id).status,'archived');
});

test('article SSR includes escaped metadata, structured content, per-request nonce and like state',async()=>{
  const env=fixture(),admin=await login(env);await create(env,admin,{title:'Un titre <sûr>',body:'Une idée.\n\n## La suite'});
  const response=await handleJournal(request('/journal/une-note'),env),body=await response.text();assert.equal(response.status,200);assert.match(body,/<h1>Un titre &lt;sûr&gt;<\/h1>/);assert.match(body,/application\/ld\+json/);assert.match(body,/<h3>La suite/);assert.match(body,/aria-pressed="false"/);assert.match(response.headers.get('Content-Security-Policy'),/script-src 'self' 'nonce-/);assert.match(response.headers.get('Cache-Control'),/no-store/);
});

test('JS-free journal index and sitemap contain only currently public posts',async()=>{
  const env=fixture(),admin=await login(env);
  await create(env,admin,{title:'Une page publique'});await create(env,admin,{slug:'secret-draft',title:'Titre confidentiel',status:'draft'});await create(env,admin,{slug:'old-archive',status:'archived'});await create(env,admin,{slug:'future-note',published_at:'2099-01-01T00:00:00Z'});
  const plan=await handleJournal(request('/journal-plan'),env),planText=await plan.text();assert.equal(plan.status,200);assert.match(planText,/href="\/journal\/une-note"/);assert.match(planText,/Une page publique/);assert.doesNotMatch(planText,/secret-draft|Titre confidentiel|old-archive|future-note/);assert.match(planText,/<script type="module" src="\/js\/atlas\.js"><\/script>/);assert.doesNotMatch(planText,/data-journal-list/);
  const sitemap=await handleJournal(request('/journal-sitemap.xml'),env),xml=await sitemap.text();assert.equal(sitemap.status,200);assert.match(sitemap.headers.get('Content-Type'),/application\/xml/);assert.match(xml,/<loc>https:\/\/novaia.org\/journal\/une-note<\/loc>/);assert.doesNotMatch(xml,/secret-draft|old-archive|future-note/);
  assert.equal((await handleJournal(request('/journal-plan?page=2'),env)).status,404);
});

test('editorial seeds are idempotent and never overwrite an edited post',()=>{
  const env=fixture(),sql=readFileSync(new URL('../migrations/0002_first_pages.sql',import.meta.url),'utf8');env.JOURNAL_DB.sqlite.exec(sql);assert.equal(env.JOURNAL_DB.sqlite.prepare('SELECT count(*) AS count FROM journal_posts').get().count,3);
  env.JOURNAL_DB.sqlite.prepare("UPDATE journal_posts SET title='Titre relu' WHERE slug='un-endroit-pour-relier-les-projets'").run();env.JOURNAL_DB.sqlite.exec(sql);assert.equal(env.JOURNAL_DB.sqlite.prepare('SELECT count(*) AS count FROM journal_posts').get().count,3);assert.equal(env.JOURNAL_DB.sqlite.prepare("SELECT title FROM journal_posts WHERE slug='un-endroit-pour-relier-les-projets'").get().title,'Titre relu');
});

test('configuration absence fails closed while static and legacy routes are untouched',async()=>{
  assert.equal(await handleJournal(request('/novalove'),{}),null);assert.equal(await handleJournal(request('/tiktok/callback?code=example'),{}),null);
  assert.equal((await handleJournal(request('/api/journal'),{})).status,503);assert.equal((await handleJournal(request('/admin'),{})).status,200);
  assert.match(adminPage(),/noindex,nofollow/);
});

test('admin browser script and SSR like script compile',async()=>{
  const adminScript=adminPage().match(/<script>([\s\S]*?)<\/script>/)?.[1];assert.ok(adminScript);assert.doesNotThrow(()=>new Script(adminScript));
  const env=fixture(),admin=await login(env);await create(env,admin);const page=await (await handleJournal(request('/journal/une-note'),env)).text();
  const scripts=[...page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(match=>!match[1].includes('application/ld+json')&&!/\bsrc=/.test(match[1]));assert.equal(scripts.length,1);assert.doesNotThrow(()=>new Script(scripts[0][2]));
});

test('validation rejects unbounded text, unsafe cover URLs and invalid statuses',()=>{
  const valid={title:'Titre',slug:'titre',body:'Texte'};
  assert.throws(()=>validatePost({...valid,status:'secret'}));assert.throws(()=>validatePost({...valid,slug:'../admin'}));assert.throws(()=>validatePost({...valid,cover_url:'javascript:alert(1)'}));assert.throws(()=>validatePost({...valid,body:'a'.repeat(100001)}));assert.equal(validatePost(valid).status,'draft');
});

test('media upload rejects SVG and validates magic bytes before R2 write',async()=>{
  const env=fixture(),admin=await login(env);let stored;
  env.JOURNAL_MEDIA={async put(key,bytes,options){stored={key,bytes,options};}};
  let response=await handleJournal(request('/api/admin/media',{method:'POST',cookie:admin,headers:{'Content-Type':'image/svg+xml'},body:'<svg></svg>'}),env);assert.equal(response.status,415);assert.equal(stored,undefined);
  response=await handleJournal(new Request(origin+'/api/admin/media',{method:'POST',headers:{Origin:origin,Cookie:admin,'Content-Type':'image/png'},body:new Uint8Array([137,80,78,71,13,10,26,10,0])}),env);assert.equal(response.status,201);assert.match((await response.json()).url,/^\/media\/journal\/.*\.png$/);assert.equal(stored.options.httpMetadata.contentType,'image/png');
});


test('public journal uses the Atlas shell and preserves nonce-protected likes',async()=>{
  const env=fixture(),admin=await login(env);
  await create(env,admin,{title:'Un <titre> & une idée',body:'Une page **lisible**.',project:'novamemory'});
  const response=await handleJournal(request('/journal/une-note'),env),body=await response.text();
  assert.equal(response.status,200);
  assert.match(body,/<body class="atlas-site"/);
  assert.match(body,/<header class="atlas-header">/);
  assert.match(body,/<nav class="atlas-nav"/);
  assert.match(body,/<main id="main-content" class="page-wrap journal-article">/);
  assert.match(body,/<article class="story-content">/);
  assert.match(body,/<div class="post-actions">/);
  assert.match(body,/<aside class="related-paths"/);
  assert.match(body,/<footer class="atlas-footer">/);
  assert.match(body,/href="\/css\/atlas\.css"/);
  assert.match(body,/<script type="module" src="\/js\/atlas\.js"><\/script>/);
  assert.doesNotMatch(body,/\/css\/personal\.css|href="#contenu"/);
  assert.match(body,/href="\/projets\/novamemory"/);
  const metadata=body.match(/<script nonce="([^"]+)" type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(metadata);
  assert.equal(JSON.parse(metadata[2]).headline,'Un <titre> & une idée');
  assert.ok(!metadata[2].includes('<titre>'));
  assert.ok(response.headers.get('Content-Security-Policy').includes(`'nonce-${metadata[1]}'`));
  assert.match(body,new RegExp('<script nonce="'+metadata[1]+'">const button='));
  assert.doesNotMatch(response.headers.get('Content-Security-Policy'),/unsafe-inline/);
  const next=await handleJournal(request('/journal/une-note'),env);
  assert.notEqual(next.headers.get('Content-Security-Policy'),response.headers.get('Content-Security-Policy'));
  assert.match(body,/<link rel="alternate" type="application\/rss\+xml"/);
});

test('public journal errors and HEAD responses retain the Atlas shell and status',async()=>{
  const env=fixture();
  const missing=await handleJournal(request('/journal/page-absente'),env),body=await missing.text();
  assert.equal(missing.status,404);
  assert.match(body,/<body class="atlas-site"/);
  assert.match(body,/id="main-content"/);
  assert.match(body,/Cette page a pris un autre chemin/);
  assert.match(missing.headers.get('X-Robots-Tag'),/noindex/);
  assert.match(missing.headers.get('Content-Security-Policy'),/script-src 'self'/);
  assert.equal((await handleJournal(request('/journal/page-absente',{method:'HEAD'}),env)).status,404);
  assert.equal(await (await handleJournal(request('/journal/page-absente',{method:'HEAD'}),env)).text(),'');
  const unavailable=await handleJournal(request('/journal-plan'),{});
  assert.equal(unavailable.status,503);
  assert.match(await unavailable.text(),/<body class="atlas-site"/);
  assert.equal((await handleJournal(request('/api/admin/posts'),env)).headers.get('Content-Type'),'application/json');
});

test('RSS publishes only current public entries and escapes XML without exposing reader data',async()=>{
  const env=fixture(),admin=await login(env);
  await create(env,admin,{title:'Un <titre> & une idée',excerpt:'Du texte <public> & rien de caché.\u0000',project:'novamemory'});
  await create(env,admin,{slug:'rss-body',title:'Sans résumé',excerpt:'',body:'Un extrait ]]> & <script>inerte</script>.'});
  await create(env,admin,{slug:'rss-draft',title:'Brouillon confidentiel',status:'draft'});
  await create(env,admin,{slug:'rss-archive',title:'Archive confidentielle',status:'archived'});
  await create(env,admin,{slug:'rss-future',title:'Publication future',published_at:'2099-01-01T00:00:00.000Z'});
  const response=await handleJournal(request('/journal.xml'),env),xml=await response.text();
  assert.equal(response.status,200);
  assert.match(response.headers.get('Content-Type'),/application\/rss\+xml/);
  assert.equal(response.headers.get('Set-Cookie'),null);
  assert.match(xml,/<rss version="2\.0"/);
  assert.match(xml,/<language>fr-FR<\/language>/);
  assert.match(xml,/<atom:link href="https:\/\/novaia\.org\/journal\.xml"/);
  assert.match(xml,/<title>Un &lt;titre&gt; &amp; une idée<\/title>/);
  assert.match(xml,/Du texte &lt;public&gt; &amp; rien de caché/);
  assert.match(xml,/Un extrait \]\]&gt; &amp; &lt;script&gt;inerte&lt;\/script&gt;/);
  assert.match(xml,/<category>NovaMemory<\/category>/);
  assert.match(xml,/<guid isPermaLink="true">https:\/\/novaia\.org\/journal\/une-note<\/guid>/);
  assert.equal((xml.match(/<item>/g)||[]).length,2);
  assert.doesNotMatch(xml,/Brouillon confidentiel|Archive confidentielle|Publication future|rss-draft|rss-archive|rss-future|<script>|\u0000|visitor_id/);
  const head=await handleJournal(request('/journal.xml',{method:'HEAD'}),env);
  assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.match(head.headers.get('Content-Type'),/application\/rss\+xml/);
  assert.equal((await handleJournal(request('/journal.xml',{method:'POST',body:{}}),env)).status,405);
});
