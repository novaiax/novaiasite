/** The personal company profile, shared by the page and the Atlas reader. */
export function novaiawebPage(project, {esc, art}) {
 const p = project;
 const paragraphs = text => String(text || '').split(/\n\s*\n/).filter(Boolean).map(text => `<p>${esc(text)}</p>`).join('');
 const services = p.services || [];
 const method = p.method || [];
 const sections = p.sections || [];
 const external = p.external;
 const logo = typeof art === 'function' ? art(p.art || 'web', 'eager') : '<img src="/images/projets/novaiaweb.png" alt="" width="256" height="256" decoding="async">';

 return `<main id="main-content" class="page-wrap"><div class="novaiaweb-profile">
 <nav class="breadcrumbs nw-breadcrumbs" aria-label="Fil d’Ariane"><a href="/" data-atlas-link>L’Atlas</a><a href="/projets/" data-atlas-link>Créations</a><span>${esc(p.name)}</span></nav>
 <header class="nw-opening">
  <div class="nw-opening-copy"><p class="eyebrow">${esc(p.category || 'Entrepreneuriat')}</p><h1>${esc(p.name)},<br><em>mon entreprise.</em></h1><p class="nw-deck">${esc(p.deck)}</p>${p.intro ? `<div class="nw-intro">${paragraphs(p.intro)}</div>` : ''}</div>
  <figure class="nw-identity" aria-label="Identité de ${esc(p.name)}"><div class="nw-logo">${logo}</div><figcaption><strong>${esc(p.name)}</strong>${p.status ? `<span>${esc(p.status)}</span>` : ''}</figcaption></figure>
 </header>

 <section class="nw-section nw-work" aria-labelledby="nw-work-title">
  <header class="nw-section-heading"><p class="eyebrow">Ce que je fais</p><h2 id="nw-work-title">${esc(p.servicesTitle || 'Du besoin au concret.')}</h2>${p.lead ? `<div class="nw-section-intro">${paragraphs(p.lead)}</div>` : ''}</header>
  <div class="nw-service-list">${services.map((service, index) => `<article class="nw-service"><span class="nw-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><h3>${esc(service.title)}</h3><div class="nw-prose">${paragraphs(service.text)}</div></article>`).join('')}</div>
${sections.length ? `<div class="nw-context">${sections.map(section => `<section><h3>${esc(section.title)}</h3><div class="nw-prose">${paragraphs(section.text)}</div></section>`).join('')}</div>` : ''}
 </section>

 ${method.length ? `<section class="nw-section nw-method" aria-labelledby="nw-method-title"><header class="nw-section-heading"><p class="eyebrow">Comment je travaille</p><h2 id="nw-method-title">${esc(p.methodTitle || 'Faire avancer les choses.')}</h2>${p.methodIntro ? `<div class="nw-section-intro">${paragraphs(p.methodIntro)}</div>` : ''}</header><ol class="nw-method-list">${method.map((step, index) => `<li><span class="nw-step-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div><h3>${esc(step.title)}</h3><div class="nw-prose">${paragraphs(step.text)}</div></div></li>`).join('')}</ol></section>` : ''}

 ${p.ambition ? `<section class="nw-ambition" aria-labelledby="nw-ambition-title"><p class="eyebrow">Ce que je veux construire</p><div><h2 id="nw-ambition-title">${esc(p.ambition.title)}</h2><div class="nw-ambition-copy">${paragraphs(p.ambition.text)}</div></div></section>` : ''}

 ${p.origin ? `<aside class="nw-origin" aria-labelledby="nw-origin-title"><h2 id="nw-origin-title">${esc(p.origin.title || 'Le point de départ.')}</h2><div>${paragraphs(p.origin.text)}</div></aside>` : ''}

 <nav class="nw-next" aria-label="Poursuivre la visite"><div><p class="eyebrow">Pour aller plus loin</p>${external ? `<a class="nw-site-link" href="${esc(external.url)}" target="_blank" rel="noopener">${esc(external.label)}<span aria-hidden="true">↗</span><span class="sr-only"> (nouvel onglet)</span></a>` : ''}</div><a class="nw-atlas-link" href="/" data-atlas-link><span aria-hidden="true">←</span> Retour à l’Atlas</a></nav>
 </div></main>`;
}
