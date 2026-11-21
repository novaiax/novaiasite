/** Public journal documents share the Atlas shell; body/head/tail are trusted server markup. */
const ORIGIN = 'https://novaia.org';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function atlasHeader() {
  return `<a class="skip-link" href="#main-content">Aller au contenu</a>
<header class="atlas-header">
  <a class="atlas-wordmark" href="/" aria-label="NovaIA, accueil de Yann">novaia<small>Yann Wirtz</small></a>
  <button class="atlas-menu-toggle" id="atlas-menu-toggle" type="button" aria-expanded="false" aria-controls="atlas-navigation" aria-label="Ouvrir le menu">Menu</button>
  <nav class="atlas-nav" id="atlas-navigation" aria-label="Navigation principale">
    <a href="/parcours">Parcours</a><a href="/projets">Créations</a><a href="/journal" aria-current="page">Journal</a><a href="/yann">Mes liens</a>
  </nav>
</header>`;
}

export function atlasFooter() {
  return `<footer class="atlas-footer"><a class="atlas-wordmark" href="/">novaia<small>Yann Wirtz</small></a><p>Strasbourg aujourd’hui. Ambition Paris.</p><nav aria-label="Liens de bas de page"><a href="/journal.xml">Flux RSS</a><a href="/confidentialite">Confidentialité</a><a href="mailto:contact@novaia.org">M’écrire</a></nav></footer>`;
}

export function atlasDocument({title, description = '', canonical = '', body, head = '', tail = '', noindex = false}) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#e9eff2"><title>${escape(title)}</title>${description ? `<meta name="description" content="${escape(description)}">` : ''}${canonical ? `<link rel="canonical" href="${escape(new URL(canonical, ORIGIN).href)}">` : ''}${noindex ? '<meta name="robots" content="noindex,nofollow">' : ''}<link rel="icon" href="/images/personnel/monogram.svg" type="image/svg+xml"><link rel="stylesheet" href="/css/atlas.css"><link rel="alternate" type="application/rss+xml" title="Le journal de Yann Wirtz" href="/journal.xml">${head}<script type="module" src="/js/atlas.js"></script></head><body class="atlas-site" data-page="journal">${atlasHeader()}${body}${atlasFooter()}${tail}</body></html>`;
}
