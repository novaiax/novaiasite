import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../_worker.js';

const origin='https://novaia.org';
const staticOnly={ASSETS:{fetch(){throw new Error('Unexpected static fallback')}}};

test('legacy personal URLs redirect permanently to Atlas stories and preserve query strings',async()=>{
  for(const [from,to] of Object.entries({'/novaia':'/parcours/','/novaia.html':'/parcours/','/novamemory':'/projets/novamemory/','/novamemory.html':'/projets/novamemory/'})){
    const response=await worker.fetch(new Request(origin+from+'?source=ancien%20lien'),staticOnly);
    assert.equal(response.status,301,from);
    assert.equal(response.headers.get('Location'),to+'?source=ancien%20lien');
    assert.equal(await response.text(),'');
  }
});

test('Yann, NovaLove and other static routes reach ASSETS without rewriting the request',async()=>{
  for(const pathname of ['/yann','/yann/','/novalove','/novalove.html','/extraitnovalove','/novabook','/conseils/comment-se-remettre-dune-rupture','/css/links.css','/projets/novamemory/','/blog/site-en-panne-que-faire.html']){
    const request=new Request(origin+pathname+'?keep=1');
    const expected=new Response('fixture asset',{status:200,headers:{'X-Asset-Fixture':'untouched'}});
    let calls=0;
    const response=await worker.fetch(request,{ASSETS:{fetch(received){calls++;assert.equal(received,request);return expected}}});
    assert.equal(calls,1,pathname);assert.equal(response,expected,pathname);
  }
});

test('TikTok callback stays dynamic, escapes URL input and prevents callback caching',async()=>{
  const query=new URLSearchParams({code:'<test-code>',state:'"test-state"',scopes:'user.info.basic,<script>'});
  const response=await worker.fetch(new Request(origin+'/tiktok/callback?'+query),staticOnly);
  assert.equal(response.status,200);
  assert.match(response.headers.get('Content-Type'),/text\/html/);
  assert.match(response.headers.get('Cache-Control'),/no-store/);
  assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
  const html=await response.text();
  assert.match(html,/Code OAuth généré/);
  assert.match(html,/&lt;test-code&gt;/);
  assert.match(html,/&quot;test-state&quot;/);
  assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(html,/<test-code>|<script><\/span>/);
});

test('TikTok error and empty callback states still render independently of journal bindings',async()=>{
  const error=await worker.fetch(new Request(origin+'/tiktok/callback?error=denied&error_description=%3Ctest%3E'),staticOnly);
  const errorHtml=await error.text();assert.match(errorHtml,/Autorisation refusée ou échouée/);assert.match(errorHtml,/&lt;test&gt;/);
  const empty=await worker.fetch(new Request(origin+'/tiktok/callback'),staticOnly);
  assert.match(await empty.text(),/Pas de code OAuth dans l'URL/);
});
