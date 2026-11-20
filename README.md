# novaiasite
Site novaia.org

## NovaLove

- Page de présentation : `novalove.html`, URL publique `/novalove`.
- Extrait : `extraitnovalove.html`, URL publique `/extraitnovalove`.
- Styles communs à ces deux pages : `css/novalovestyles.css`.
- Interactions et événements Analytics : `js/novalove.js`.
- L’extrait propose Lora, Georgia et Open Sans. Le choix s’applique au texte de lecture et est conservé dans `localStorage` sous `novalove-reading-font` ; le lecteur reste fonctionnel si ce stockage est bloqué. Les commandes restent masquées sans JavaScript.
- Achat : fiche Amazon `B0FHHYZ8NJ` ; prix et caractéristiques vérifiés le 20 novembre 2026 : broché en français, 120 pages, 13 €. Recontrôler la fiche avant de changer les informations commerciales.

Le texte du prologue et du chapitre de l’extrait doit rester identique au livre. Les autres pages du site ont leurs propres styles. Le site utilise les URL sans extension fournies par Cloudflare Static Assets ; le Worker `_worker.js` conserve les routes dynamiques existantes.

Validation sans build : `node --check js/novalove.js`, contrôle des liens et ressources, vérification des deux pages sur ordinateur et mobile. Le serveur historique `serve.js` ne reproduit pas les routes sans extension de Cloudflare.

### Référencement et identité

La marque s’écrit `NovaIA`, en un seul mot, y compris dans les textes, les données structurées et les descriptions destinées aux moteurs.

Le guide `/conseils/comment-se-remettre-dune-rupture` complète la page du livre pour les recherches sur l’après-rupture. Ses conseils généraux citent les ressources du NHS ; l’exercice d’écriture est éditorial. Les données `Book`, `WebPage`, `Article` et `BreadcrumbList` décrivent les contenus visibles, sans avis inventés ni promesse de guérison. Le sitemap et les liens internes utilisent les URL canoniques sans extension.

Les mentions de NovaLove dans le contenu utilisent un seul élément `.novalove-name` pour éviter les espacements dus aux conteneurs flex. L’animation est réservée au logo et respecte `prefers-reduced-motion`. Le montant et la devise du prix sont insécables.

L’indexation, les positions Google et les citations dans les réponses IA nécessitent une vérification après publication ; les modifications de code ne les garantissent pas. Le build Cloudflare du 20 novembre 2026 a signalé un jeton supprimé ou renouvelé : sa création de remplacement reste soumise à l’accord de Yann.
