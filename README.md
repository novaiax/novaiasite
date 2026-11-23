# novaiasite
Site novaia.org

## Atlas vivant — site personnel

Avant une création, une refonte ou un choix technique important, consulter obligatoirement [Modern Web Guidance sur GitHub](https://github.com/googlechrome/modern-web-guidance) et [la documentation officielle](https://developer.chrome.com/docs/modern-web-guidance?hl=fr). Les lectures, choix de compatibilité et replis réellement retenus sont consignés dans [docs/MODERN_WEB_GUIDANCE.md](docs/MODERN_WEB_GUIDANCE.md).

La refonte du 21 novembre 2026 se construit avec Node 24 : `npm ci`, `npm run build`, `npm run check`, puis `npm test`. `npm run dev` lance le Worker local. Le build vérifie les 24 empreintes protégées de `/yann` et de NovaLove, génère les pages et compile le moteur Three.js WebGPU/TSL avec repli WebGL2.

Le contenu éditorial est dans `data/atlas-content.json`. Les styles sont dans `css/atlas.css`, le lecteur dans `js/atlas.js`. Ne pas utiliser l'ancien générateur du brouillon personnel. La documentation de livraison et la procédure Cloudflare sont dans [docs/ATLAS_RELEASE.md](docs/ATLAS_RELEASE.md), le journal dans [docs/JOURNAL.md](docs/JOURNAL.md) et le rendu graphique dans [docs/ATLAS_GPU.md](docs/ATLAS_GPU.md).

`npm run deploy` reconstruit avant la publication. Le build Cloudflare historique appelle directement `npx wrangler deploy` : les pages et le bundle générés doivent donc être présents et actualisés dans le commit publié. Une configuration D1 avec un identifiant nul ne suffit pas à déployer le journal ; provisionner les bindings réels et les secrets selon la documentation. La validation locale ne prouve pas la mise en ligne.

## NovaLove

- Page de présentation : `novalove.html`, URL publique `/novalove`.
- Extrait : `extraitnovalove.html`, URL publique `/extraitnovalove`.
- Styles communs à ces deux pages : `css/novalovestyles.css`.
- Interactions et événements Analytics : `js/novalove.js`.
- L’extrait propose Lora, Georgia et Open Sans. Le choix s’applique au texte de lecture et est conservé dans `localStorage` sous `novalove-reading-font` ; le lecteur reste fonctionnel si ce stockage est bloqué. Les commandes restent masquées sans JavaScript.
- Achat : fiche Amazon `B0FHHYZ8NJ` ; prix et caractéristiques vérifiés le 20 novembre 2026 : broché en français, 120 pages, 13 €. Recontrôler la fiche avant de changer les informations commerciales.

Le texte du prologue et du chapitre de l’extrait doit rester identique au livre. Les autres pages du site ont leurs propres styles. Le site utilise les URL sans extension fournies par Cloudflare Static Assets ; le Worker `_worker.js` conserve les routes dynamiques existantes.

Le fichier `.assetsignore` exclut l’entrée serveur `_worker.js`, les métadonnées Git et les fichiers de développement de l’hébergement statique. L’entrée serveur reste compilée via `main` dans `wrangler.jsonc`. Vérification du déploiement sans publication : `wrangler deploy --dry-run --outdir <dossier-hors-du-depot>`.

Validation sans build : `node --check js/novalove.js`, contrôle des liens et ressources, vérification des deux pages sur ordinateur et mobile. Le serveur historique `serve.js` ne reproduit pas les routes sans extension de Cloudflare.

### Référencement et identité

La marque s’écrit `NovaIA`, en un seul mot, y compris dans les textes, les données structurées et les descriptions destinées aux moteurs.

Le guide `/conseils/comment-se-remettre-dune-rupture` complète la page du livre pour les recherches sur l’après-rupture. Ses conseils généraux citent les ressources du NHS ; l’exercice d’écriture est éditorial. Les données `Book`, `WebPage`, `Article` et `BreadcrumbList` décrivent les contenus visibles, sans avis inventés ni promesse de guérison. Le sitemap et les liens internes utilisent les URL canoniques sans extension.

Les mentions de NovaLove dans le contenu utilisent un seul élément `.novalove-name` pour éviter les espacements dus aux conteneurs flex. L’animation est réservée au logo et respecte `prefers-reduced-motion`. Le montant et la devise du prix sont insécables.

L’indexation, les positions Google et les citations dans les réponses IA nécessitent une vérification après publication ; les modifications de code ne les garantissent pas.

### Publication du 20 novembre 2026

Le jeton de build invalide a été remplacé avec l’accord explicite de Yann par `novaia-site build token 2026-11-20`, enregistré dans Cloudflare. Aucune valeur secrète n’est conservée dans ce dépôt. Le build relancé `e3f27251` a publié le commit `0223909` (version Worker `d3ad4f4a-197e-4935-8353-d4a156286bde`). Les pages publiques `/novalove`, `/extraitnovalove` et le guide ont été vérifiés, ainsi que la correspondance exacte du CSS, du JavaScript et du sitemap avec les fichiers source. `_worker.js`, `serve.js`, `.git/config` et `wrangler.jsonc` répondent en HTTP 404 sur le site public.

Le projet Cloudflare reste lié à la branche `main` de `novaiax/novaiasite`, avec la commande `npx wrangler deploy`. Vérifier le résultat Cloudflare et la page publique après un push : un push GitHub seul ne prouve pas la publication.
