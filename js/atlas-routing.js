/** URL rules shared by the reader and its regression tests. */
export function atlasDestination(href, base) {
  let url;try{url=new URL(href,base)}catch{return null}
  const origin=new URL(base).origin;
  if(url.origin!==origin||!['http:','https:'].includes(url.protocol)||url.username||url.password)return null;
  const path=url.pathname;
  const project=/^\/projets\/(?:[a-z0-9-]+\/?)?$/.test(path);
  const parcours=/^\/parcours\/?$/.test(path);
  const journal=/^\/journal\/(?:[a-z0-9-]+\/?)?$/.test(path)||path==='/journal';
  const plan=path==='/journal-plan';
  const archives=path==='/blog'||path==='/blog/';
  if(!project&&!parcours&&!journal&&!plan&&!archives)return null;
  const dynamic=plan||(/^\/journal\/[a-z0-9-]+\/?$/.test(path));
  return {href:url.href,path,hash:url.hash,cacheable:!dynamic,kind:journal||plan?'journal':parcours?'parcours':project?'project':'archives'};
}

export function journalDate(value) {
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Paris'}).format(date);
}

export function escapeAtlas(value) {
  return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
