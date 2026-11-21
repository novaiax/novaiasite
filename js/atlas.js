import {atlasDestination,journalDate,escapeAtlas as esc} from './atlas-routing.js';

const $=(selector,scope=document)=>scope.querySelector(selector);
const $$=(selector,scope=document)=>[...scope.querySelectorAll(selector)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const cache=new Map(),journalRoots=new WeakMap();
let gpu,gpuAbort,pendingReader,readerSequence=0,readerDepth=0,readerBase,readerFocus,readerTransition;
let motionEnabled=!reduced.matches;
try{if(localStorage.getItem('atlas-motion')==='paused')motionEnabled=false}catch{}
document.documentElement.classList.add('atlas-js');

function announce(value){const el=$('#atlas-announcement');if(el)el.textContent=value}
function updateMotionControl(){const button=$('#atlas-motion-toggle');if(!button)return;button.disabled=reduced.matches;button.setAttribute('aria-pressed',String(motionEnabled&&!reduced.matches));button.textContent=reduced.matches?'Mouvement réduit':motionEnabled?'Mettre la carte en pause':'Animer la carte'}

async function initGPU(){
  const canvas=$('#atlas-gpu'),container=$('#atlas-map');
  if(!canvas||!container||gpu)return;
  if(new URL(location.href).searchParams.get('graphics')==='static'){container.dataset.renderer='static';return}
  gpuAbort?.abort();gpuAbort=new AbortController();
  try{
    const {initAtlasGPU}=await import('/js/generated/atlas-gpu.js');
    if(gpuAbort.signal.aborted||!canvas.isConnected)return;
    gpu=await initAtlasGPU({canvas,container,nodes:$$('[data-atlas-node]',container),signal:gpuAbort.signal,forceWebGL:new URL(location.href).searchParams.get('graphics')==='webgl'});
    gpu.setMotion(motionEnabled&&!reduced.matches&&!reader.open);
  }catch{container.dataset.renderer='static';container.classList.remove('gpu-ready')}
}

const reader=ensureReader();
function ensureReader(){
  let dialog=$('#atlas-reader');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='atlas-reader';dialog.className='atlas-reader';dialog.setAttribute('aria-label','Lecture dans l’Atlas');dialog.innerHTML='<header class="reader-bar"><button type="button" data-reader-back>Retour au fil</button><span class="reader-location" aria-live="polite"></span><button type="button" data-reader-close aria-label="Fermer la lecture">Fermer</button></header><div class="reader-body"></div>';document.body.append(dialog)}
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeReader()});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeReader()}});
  return dialog;
}

async function getDocument(destination,signal){
  const prior=cache.get(destination.href);
  if(destination.cacheable&&prior&&Date.now()-prior.time<120000)return prior.html;
  const response=await fetch(destination.href,{signal,headers:{Accept:'text/html'},credentials:'same-origin'});
  if(!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))throw Error(response.status===404?'Cette page n’est pas ici.':'La lecture ne peut pas être ouverte pour le moment.');
  const html=await response.text();
  if(destination.cacheable){cache.set(destination.href,{html,time:Date.now()});if(cache.size>24)cache.delete(cache.keys().next().value)}
  return html;
}

function readerDocument(html,destination){
  const parsed=new DOMParser().parseFromString(html,'text/html');
  const main=parsed.querySelector('#main-content');
  if(!main||!parsed.body.classList.contains('atlas-site'))throw Error('Cette page se consulte dans son propre espace.');
  const wrapper=document.createElement('div');wrapper.className='reader-document';wrapper.dataset.readerPage=parsed.body.dataset.page||destination.kind;
  wrapper.innerHTML=main.innerHTML;
  if(main.hasAttribute('data-journal-root'))wrapper.dataset.journalRoot='';
  $$('script,style,iframe,object,embed,link',wrapper).forEach(el=>el.remove());
  $$('*',wrapper).forEach(el=>{for(const attr of [...el.attributes])if(/^on/i.test(attr.name)||attr.name==='srcdoc')el.removeAttribute(attr.name)});
  const ids=new Map();
  $$('[id]',wrapper).forEach(el=>{
    const old=el.id;
    if(old==='like-post')el.dataset.readerLike='';
    if(old==='like-label')el.dataset.readerLikeLabel='';
    if(old==='like-count')el.dataset.readerLikeCount='';
    if(old==='like-message')el.dataset.readerLikeStatus='';
    const next=`atlas-panel-${readerSequence}-${old}`;ids.set(old,next);el.id=next;
  });
  $$('*',wrapper).forEach(el=>{
    for(const name of ['for','aria-controls','aria-labelledby','aria-describedby'])if(el.hasAttribute(name))el.setAttribute(name,el.getAttribute(name).split(/\s+/).map(x=>ids.get(x)||x).join(' '));
    if(el.tagName==='A'){
      const href=el.getAttribute('href')||'';
      if(/^(javascript|data|vbscript):/i.test(href.trim()))el.removeAttribute('href');
      if(href.startsWith('#')&&ids.has(href.slice(1)))el.setAttribute('href','#'+ids.get(href.slice(1)));
    }
  });
  const titleHeading=wrapper.querySelector('h1')?.cloneNode(true);
  titleHeading?.querySelectorAll('br').forEach(br=>br.replaceWith(' '));
  return {wrapper,title:parsed.title,heading:titleHeading?.textContent.replace(/\s+/g,' ').trim()||'Lecture',ids};
}

async function openReader(href,trigger,{historyMode='push',depth}={}){
  const destination=atlasDestination(href,location.href);
  if(!destination||typeof reader.showModal!=='function'){location.assign(href);return}
  pendingReader?.abort();pendingReader=new AbortController();const sequence=++readerSequence;
  if(trigger){trigger.setAttribute('aria-busy','true');trigger.classList.add('atlas-opening')}
  announce('Ouverture de la lecture…');
  try{
    const html=await getDocument(destination,pendingReader.signal);
    if(sequence!==readerSequence)return;
    const documentData=readerDocument(html,destination);
    if(!reader.open){
      readerBase={url:location.href,title:document.title,scroll:scrollY};readerFocus=trigger||document.activeElement;
      history.replaceState({...history.state,atlasBase:readerBase,atlasReader:false},'',location.href);
    }
    const targetDepth=depth??(reader.open?readerDepth+1:1);
    const sourceArt=trigger?.querySelector('.node-art');
    const targetArt=$('.project-hero .node-art',documentData.wrapper);
    const shared=sourceArt&&targetArt&&!reduced.matches&&typeof document.startViewTransition==='function';
    const apply=()=>{
      if(sourceArt)sourceArt.style.viewTransitionName='none';
      if(shared)targetArt.style.viewTransitionName='atlas-artifact';
      $('.reader-body',reader).replaceChildren(documentData.wrapper);
      $('.reader-location',reader).textContent=documentData.heading;
      $('[data-reader-back]',reader).textContent=targetDepth>1?'Revenir au passage précédent':'Retour au fil';
      if(!reader.open)reader.showModal();
      readerDepth=targetDepth;document.body.classList.add('atlas-reading');gpu?.setMotion(false);
      if(historyMode==='push')history.pushState({atlasReader:true,href:destination.href,depth:targetDepth,atlasBase:readerBase},'',destination.href);
      document.title=documentData.title;
      initJournals(documentData.wrapper,destination.href);
      const heading=$('h1',documentData.wrapper);if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}
      reader.scrollTop=0;
      if(destination.hash){const original=decodeURIComponent(destination.hash.slice(1));const target=documentData.ids.get(original);if(target)document.getElementById(target)?.scrollIntoView({block:'start',behavior:'instant'})}
    };
    if(shared){
      readerTransition?.skipTransition?.();sourceArt.style.viewTransitionName='atlas-artifact';
      readerTransition=document.startViewTransition(apply);
      readerTransition.finished.catch(()=>{}).finally(()=>{sourceArt.style.viewTransitionName='';targetArt.style.viewTransitionName=''})
    }else apply();
    announce(documentData.heading);
  }catch(error){
    if(error.name==='AbortError')return;
    announce(error.message);
    // Standard navigation keeps the original URL and server error handling.
    location.assign(destination.href);
  }finally{trigger?.removeAttribute('aria-busy');trigger?.classList.remove('atlas-opening')}
}

function closeReader(){
  if(!reader.open)return;
  pendingReader?.abort();
  if(history.state?.atlasReader&&readerDepth>0)history.go(-readerDepth);
  else hideReader();
}
function hideReader(){
  if(!reader.open)return;
  reader.close();document.body.classList.remove('atlas-reading');
  $('.reader-body',reader).replaceChildren();
  document.title=readerBase?.title||document.title;
  if(readerBase)scrollTo({top:readerBase.scroll,behavior:'instant'});
  if(readerFocus?.isConnected)readerFocus.focus({preventScroll:true});
  readerDepth=0;gpu?.setMotion(motionEnabled&&!reduced.matches);
}

window.addEventListener('popstate',event=>{
  if(event.state?.atlasReader){readerBase=event.state.atlasBase||readerBase;openReader(event.state.href,null,{historyMode:'restore',depth:event.state.depth})}
  else hideReader();
});

async function updateReaderLike(button){
  const wrapper=button.closest('.reader-document');if(!wrapper)return;
  const status=$('[data-reader-like-status]',wrapper);button.disabled=true;
  try{
    const response=await fetch(`/api/journal/${encodeURIComponent(button.dataset.slug)}/like`,{method:'PUT',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({liked:button.getAttribute('aria-pressed')!=='true'})});
    const data=await response.json();if(!response.ok)throw Error(data.error||'La réaction n’a pas pu être enregistrée.');
    button.setAttribute('aria-pressed',String(data.liked));
    const label=$('[data-reader-like-label]',wrapper),count=$('[data-reader-like-count]',wrapper);
    if(label)label.textContent=data.liked?'Aimé':'J’aime';if(count)count.textContent=data.likes;
    if(status)status.textContent='';
  }catch(error){if(status)status.textContent=error.message}
  finally{button.disabled=false}
}

function journalMarkup(post,preview){return `<a class="journal-entry" href="/journal/${encodeURIComponent(post.slug)}" data-atlas-link><div><p class="journal-meta"><time datetime="${esc(post.published_at)}">${esc(journalDate(post.published_at))}</time> · ${esc(({note:'Note',article:'Article',photo:'Photo'})[post.kind]||'Note')}</p><${preview?'h3':'h2'}>${esc(post.title)}</${preview?'h3':'h2'}></div><div><p>${esc(post.excerpt)}</p><span class="read-label">Lire cette page</span></div></a>`}
function initJournals(scope=document,url=location.href){
  const roots=scope.matches?.('[data-journal-root]')?[scope,...$$('[data-journal-root]',scope)]:$$('[data-journal-root]',scope);
  for(const root of roots){
    if(journalRoots.has(root))continue;
    const target=$('[data-journal-list]',root);if(!target)continue;
    const state={controller:null,offset:0,revision:0,project:new URL(url,location.origin).searchParams.get('projet')||'',preview:root.dataset.journalMode==='preview'};
    const context=$('[data-journal-context]',root);if(context&&state.project)context.innerHTML=`Les pages liées à <strong>${esc(state.project)}</strong>. <a href="/journal/" data-atlas-link>Voir tout le journal</a>`;
    state.load=async(append=false)=>{
      state.controller?.abort();state.controller=new AbortController();const revision=++state.revision;
      const more=$('[data-journal-more]',root);if(more)more.disabled=true;target.setAttribute('aria-busy','true');
      const params=new URLSearchParams({limit:state.preview?'3':'12',offset:String(append?state.offset:0)});
      const q=$('[data-journal-search]',root)?.value.trim(),kind=$('[data-journal-kind]',root)?.value;
      if(q)params.set('q',q);if(kind)params.set('kind',kind);if(state.project)params.set('project',state.project);
      try{
        const response=await fetch('/api/journal?'+params,{signal:state.controller.signal,headers:{Accept:'application/json'}});const data=await response.json();if(!response.ok)throw Error(data.error||'Le journal est momentanément indisponible.');
        if(revision!==state.revision||!root.isConnected)return;
        const html=(data.posts||[]).map(p=>journalMarkup(p,state.preview)).join('');
        if(append)target.insertAdjacentHTML('beforeend',html);else target.innerHTML=html||'<p class="empty-state">Aucune page pour cette sélection. <a href="/journal-plan">Ouvrir le sommaire du journal</a>.</p>';
        state.offset=data.next_offset||0;if(more)more.hidden=!data.has_more;
      }catch(error){if(error.name==='AbortError')return;if(!append)target.innerHTML='<p class="empty-state">Le journal est momentanément indisponible. <a href="/journal-plan">Ouvrir le sommaire</a> ou <a href="/blog/">retrouver les archives</a>.</p>';if(more)more.hidden=true}
      finally{if(revision===state.revision){target.removeAttribute('aria-busy');if(more)more.disabled=false}}
    };
    journalRoots.set(root,state);state.load();
  }
}

function filterProjects(scope){
  const normalize=value=>value.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const query=normalize($('[data-project-search]',scope)?.value.trim()||'');
  const family=$('[data-project-filter][aria-pressed="true"]',scope)?.dataset.projectFilter||'all';
  let visible=0;
  $$('[data-project-category]',scope).forEach(row=>{row.hidden=(family!=='all'&&row.dataset.projectCategory!==family)||!normalize(row.dataset.projectSearchText||row.textContent).includes(query);if(!row.hidden)visible++});
  const status=$('[data-project-results]',scope),empty=$('[data-project-empty]',scope);
  if(status)status.textContent=`${visible} création${visible===1?'':'s'} à explorer`;
  if(empty)empty.hidden=visible>0;
}

document.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(button?.matches('[data-reader-close]')){event.preventDefault();closeReader();return}
  if(button?.matches('[data-reader-back]')){event.preventDefault();if(readerDepth>1)history.back();else closeReader();return}
  if(button?.id==='atlas-menu-toggle'){const expanded=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(expanded));return}
  if(button?.id==='atlas-index-toggle'){const list=$('#atlas-index');list.hidden=!list.hidden;button.setAttribute('aria-expanded',String(!list.hidden));button.textContent=list.hidden?'Explorer en liste':'Refermer la liste';if(!list.hidden)$('#atlas-index-search')?.focus();return}
  if(button?.id==='atlas-motion-toggle'){if(reduced.matches)return;motionEnabled=!motionEnabled;try{localStorage.setItem('atlas-motion',motionEnabled?'enabled':'paused')}catch{}gpu?.setMotion(motionEnabled);updateMotionControl();return}
  if(button?.hasAttribute('data-project-filter')){const wrap=button.closest('main,.reader-document');$$('[data-project-filter]',wrap).forEach(el=>el.setAttribute('aria-pressed',String(el===button)));filterProjects(wrap);return}
  if(button?.hasAttribute('data-journal-more')){const state=journalRoots.get(button.closest('[data-journal-root]'));state?.load(true);return}
  if(button?.hasAttribute('data-reader-like')){updateReaderLike(button);return}
  const link=event.target.closest('a[href]');
  if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target||link.hasAttribute('download'))return;
  if(link.getAttribute('href').startsWith('#'))return;
  const eligible=link.matches('[data-atlas-link],.related-paths a')||!!link.closest('.reader-document');
  const destination=eligible&&atlasDestination(link.href,location.href);
  if(!destination)return;
  event.preventDefault();openReader(destination.href,link);
});

document.addEventListener('input',event=>{
  if(event.target.matches('[data-project-search]')){filterProjects(event.target.closest('main,.reader-document'));return}
  if(event.target.id==='atlas-index-search'){
    const query=event.target.value.toLocaleLowerCase('fr');let found=0;$$('#atlas-index li').forEach(el=>{el.hidden=!el.textContent.toLocaleLowerCase('fr').includes(query);if(!el.hidden)found++});const empty=$('[data-atlas-index-empty]');if(empty)empty.hidden=found>0;return;
  }
  if(event.target.matches('[data-journal-search]')){const state=journalRoots.get(event.target.closest('[data-journal-root]'));if(state){clearTimeout(state.timer);state.timer=setTimeout(()=>state.load(),250)}}
});
document.addEventListener('change',event=>{if(event.target.matches('[data-journal-kind]'))journalRoots.get(event.target.closest('[data-journal-root]'))?.load()});
document.addEventListener('submit',event=>{if(event.target.hasAttribute('data-journal-controls')){event.preventDefault();journalRoots.get(event.target.closest('[data-journal-root]'))?.load()}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){const menu=$('#atlas-menu-toggle');menu?.setAttribute('aria-expanded','false')}});

function prefetch(event){const link=event.target.closest('a[data-atlas-link]');if(!link)return;const destination=atlasDestination(link.href,location.href);if(destination?.cacheable&&!cache.has(destination.href))getDocument(destination).catch(()=>{})}
document.addEventListener('pointerover',prefetch,{passive:true});document.addEventListener('focusin',prefetch);
reduced.addEventListener('change',()=>{if(reduced.matches)motionEnabled=false;updateMotionControl();gpu?.setMotion(motionEnabled&&!reduced.matches)});
window.addEventListener('pagehide',()=>{gpuAbort?.abort();gpu?.dispose();gpu=null;pendingReader?.abort()});
window.addEventListener('pageshow',event=>{if(event.persisted)initGPU()});
updateMotionControl();initJournals();
if('requestIdleCallback' in window)requestIdleCallback(initGPU,{timeout:1200});else setTimeout(initGPU,250);
