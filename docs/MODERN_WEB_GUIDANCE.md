# Modern Web Guidance

Références obligatoires avant une création, une refonte ou un choix technique important :

- https://github.com/googlechrome/modern-web-guidance
- https://developer.chrome.com/docs/modern-web-guidance?hl=fr
- Index : https://developer.chrome.com/docs/modern-web-guidance/guides?hl=fr

Lire les guides utiles au projet, puis documenter la date, les liens lus, les décisions appliquées, la compatibilité et les replis. La présence de ces liens ne signifie pas qu'une consultation a été effectuée. Cette règle complète les instructions globales et les briefs de la bibliothèque NovaiaWeb.

## Consultation du 23 novembre 2026 — fiche personnelle NovaiaWeb

Le dépôt, la présentation et l'index officiels ci-dessus ont été lus. Aucune installation ni dépendance ajoutée.

Guides effectivement lus :

- [Mise en page et lisibilité du texte](https://developer.chrome.com/docs/modern-web-guidance/guides/visual-design/improve-text-layout-and-legibility?hl=fr) : `text-wrap: balance` limité aux titres courts de cette fiche ; les paragraphes restent en composition normale. Les navigateurs qui ignorent cette propriété conservent des titres lisibles sans script ni polyfill.
- [Icônes](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-atoms/icons?hl=fr) : conserver l'image originale NW avec URL relative à la racine et dimensions explicites. Logo et flèches décoratives masqués aux technologies d'assistance, texte visible pour les liens. Pas de nouvelle police d'icônes ni de système de masques requis.
- [Défilement sous un dialogue modal](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/prevent-page-scroll-under-modal-dialog) : le lecteur conserve le dialogue HTML natif et son contrôle de focus. `overscroll-behavior: contain` sur le dialogue et son fond ; `overflow: hidden` limité au pseudo-élément `::backdrop`. Aucun verrouillage ajouté sur le document. Sur les navigateurs qui ne contiennent pas encore les conteneurs non défilants, le confinement est progressif ; le dialogue reste modal et accessible au clavier.

La page complète est du HTML statique avec CSS Grid/Flex et liens natifs. Elle reste lisible sans JavaScript. Le lecteur ne charge la feuille dédiée, locale et limitée à `.novaiaweb-profile`, que lorsqu'on ouvre cette fiche. En cas d'échec de chargement, il revient à la navigation normale. Sur les navigateurs sans `showModal`, le lien ouvre directement la page. Les effets respectent `prefers-reduced-motion`.

Cibles : versions récentes de Chrome/Edge, Firefox et Safari, dont le navigateur intégré Instagram sur iOS et Android. Les vérifications automatisées, essais navigateur et limites de vérification réelles sont consignés dans le compte rendu de livraison ; une émulation mobile ne vaut pas un essai sur un appareil physique.
