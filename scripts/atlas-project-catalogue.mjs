import fs from 'node:fs';
import path from 'node:path';

export function extendAtlasProjects(original,root){
  const file=path.join(root,'data/atlas-github-projects.json');
  const discovered=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{projects:[],augment:[]};
  const projects=structuredClone(original);
  for(const addition of discovered.augment||[]){
    const project=projects.find(p=>p.slug===addition.slug);
    if(project)for(const section of addition.sections||[])if(!project.sections.some(s=>s.title===section.title))project.sections.push(section);
  }
  projects.push(...discovered.projects||[]);
  const slugs=new Set();
  for(const project of projects){
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)||slugs.has(project.slug))throw Error('Invalid or duplicate project slug: '+project.slug);
    if(/novablock|focus-fortress|focusapp/i.test(project.slug+' '+project.name))throw Error('Excluded project cannot be published.');
    slugs.add(project.slug);
  }
  return projects;
}

export function projectFamily(p){
  return p.family||({novamemory:'ia',novalove:'life',novaformation:'apps',novaiaweb:'web','rock-de-strass':'life',novaprompter:'apps',trouvejob:'apps'})[p.slug]||'apps';
}

export function projectCatalogue(projects,{art,esc,link}){
  const families=[['all','Tout explorer'],['ia','Intelligence artificielle'],['apps','Applications & outils'],['web','Web'],['learning','Apprentissages'],['life','Écriture & terrain']];
  return `<main id="main-content" class="page-wrap"><header class="page-heading"><p class="eyebrow">Ce que j’ai construit</p><h1>Des idées qui ont<br>pris <em>forme.</em></h1><p class="page-deck">Des outils que j’ai construits pour moi, des expérimentations, des explorations web, un livre et des engagements. Chaque création ouvre un chemin.</p></header><div class="catalogue-search"><label for="project-search">Explorer mon atelier</label><input id="project-search" type="search" data-project-search placeholder="Un projet, un outil, une idée…" autocomplete="off"><p data-project-results role="status" aria-live="polite">${projects.length} créations à explorer</p></div><div class="atlas-filters" role="group" aria-label="Filtrer les créations">${families.map(([id,label])=>`<button data-project-filter="${id}" aria-pressed="${id==='all'}">${label}</button>`).join('')}</div><section class="project-index" aria-label="Les créations">${projects.map(p=>`<a class="project-row${p.art.startsWith('mark:')?' project-row-compact':''}" data-project-category="${projectFamily(p)}" data-project-search-text="${esc([p.name,p.description,...p.sections.map(s=>s.title+' '+s.text)].join(' '))}" href="${link(p)}" data-atlas-link><div class="project-row-art">${art(p.art)}</div><div class="project-summary"><p class="project-meta">${esc(p.category)} · ${esc(p.status)}</p><h2>${esc(p.name)}</h2></div><p class="project-description">${esc(p.description)}</p></a>`).join('')}<p class="empty-state" data-project-empty hidden>Aucun projet pour cette recherche. Essaie un autre mot ou une autre catégorie.</p></section><section class="archive-note"><p class="eyebrow">Un atelier qui continue</p><h2>Les premiers essais<br>font aussi partie du <em>chemin.</em></h2><p>Certains projets sont devenus des applications, d’autres restent des essais ou des idées en construction. Je garde leur place ici.</p><a class="text-link" href="https://github.com/novaiax">Retrouver mes dépôts publics sur GitHub</a></section></main>`;
}
