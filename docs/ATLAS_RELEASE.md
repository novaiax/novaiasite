# Novaia.org — Livraison Atlas vivant

## Périmètre et état

L’Atlas vivant est la direction choisie par Yann le 21 novembre 2026 pour le site personnel principal. La page de liens `/yann`, NovaLove, son extrait et les ressources protégées restent hors refonte. Le manifeste `tests/fixtures/protected-atlas-baseline.json` conserve les empreintes SHA-256 de 24 fichiers acceptés avant le travail Atlas. Il ne faut jamais le régénérer pour masquer une modification.

L’Atlas a été publié et vérifié le 21 novembre 2026 sur `novaia.org` et `www.novaia.org`. Les contrôles HTTP de production passent, dont les empreintes des trois ressources Atlas principales, les routes, les contenus et la protection des sources privées. Les six contrôles d’administration authentifiée passent aussi, sans écrire de publication. La base D1 réelle est configurée et les deux migrations sont appliquées. Les logos, les retraits demandés et le certificat Verified edX font l’objet de contrôles complémentaires.

Exception demandée explicitement ensuite sur `/yann` : retirer l’étoile et le bouton TikTok NovaIA, et employer Programme D2E. Le helper `scripts/protected-atlas.mjs` exige ces transformations exactes depuis la fixture originale. Le manifeste initial reste intact ; les 23 autres fichiers protégés gardent leurs octets. `.gitattributes` protège ces octets entre Windows et le build distant.

R2 n’est pas activé : le compte impose un nouvel abonnement renouvelable, qui n’a pas été souscrit. L’administration masque l’envoi direct de photos ; les images par URL restent utilisables. Aucun achat ni abonnement ajouté. Les identifiants privés ne sont ni dans Git ni dans les fichiers publics.

Les ajouts anti-robot propres à Cloudflare modifient le HTML servi par le domaine. Le vérificateur conserve le hash brut, reconnaît seulement les deux insertions précises et exige l’égalité du contenu normalisé. Il exige aussi l’égalité brute de chaque HTML protégé depuis l’origine workers.dev. La sécurité Cloudflare est conservée.

## Architecture et édition

- `data/atlas-content.json` contient les histoires principales et le parcours ; `data/atlas-github-projects.json` complète le catalogue : 71 dépôts recensés, étudiés en 50 ensembles, puis sélectionnés en 43 créations personnelles après retrait des fiches clients. Chaque sujet a fait l’objet d’au moins trois recherches distinctes dans NovaMemory, soit 152 recherches réelles consignées dans les registres privés. Modifier ces données pour une correction durable.
- `scripts/build-atlas.mjs` génère l’accueil, les index et pages projets, le parcours, le journal, les archives, la confidentialité, la 404 et les fichiers de découverte. Il vérifie les empreintes protégées avant et après son exécution.
- `scripts/prepare-atlas-data.mjs` est l’outil de capture initiale depuis l’ancienne version. Il ne fait pas partie du build courant et refuse de remplacer des données déjà présentes.
- `css/atlas.css` fournit la présentation commune. `js/atlas.js` ajoute la navigation dans le lecteur, les filtres, les listes du journal et les contrôles de mouvement.
- `js/atlas-routing.js` définit les URL admissibles au lecteur et les fonctions de présentation testées.
- `js/atlas-gpu.js` est le module graphique source ; esbuild produit `js/generated/atlas-gpu.js`, avec Three.js et sa licence servis depuis le même domaine. Il n’y a pas de dépendance de rendu à un CDN.
- `_worker.js` traite les alias historiques, puis délègue au journal et au callback TikTok avant de servir les autres ressources avec `ASSETS`.
- `server/journal.js` conserve l’API, l’administration privée, les likes, les publications et les médias. `server/atlas-shell.js` habille les articles publics, le sommaire et leurs erreurs dans l’Atlas.

Les pages statiques restent de vrais documents avec contenu, titres, liens, métadonnées et URL canonique. Le lecteur est une amélioration progressive : les liens restent des liens ordinaires sans JavaScript. Les quatre articles des anciennes archives conservent leur contenu et leurs adresses.

## Rendu et navigation

La carte conserve dix points de navigation réels, avec NovaIA à côté du portrait et NovaHub dans l’Atlas. Le module GPU est chargé après l’initialisation du document. Le moteur Three.js utilise WebGPU quand disponible et peut se replier sur WebGL2 ; une carte HTML/SVG/CSS assure la lecture et les liens si le moteur ne peut pas démarrer. Voir `ATLAS_GPU.md` pour les limites, la reprise et les diagnostics.

Le bouton de pause conserve le choix dans le stockage local. La réduction des animations du système est respectée. La boucle graphique s’arrête lorsque le document ou la carte n’est plus visible et lorsque le lecteur est ouvert. Les effets ne sont pas nécessaires à la compréhension du site.

Pour vérifier les chemins de repli localement : ouvrir `/?graphics=webgl` pour forcer WebGL2 et `/?graphics=static` pour laisser uniquement la carte statique. Ces paramètres sont des aides de diagnostic ; les visiteurs n’en ont pas besoin.

Le lecteur utilise un élément `dialog`, conserve le focus, une URL réelle et l’historique précédent/suivant. Les transitions de vue sont optionnelles. Les pages projets et parcours statiques ont un cache de lecture borné ; les articles et le sommaire du journal ne sont pas conservés dans ce cache. Les éléments injectés sont débarrassés de scripts et leurs identifiants sont préfixés pour éviter les collisions avec le document de fond. Le bouton de like chargé dans le lecteur a son propre gestionnaire ; l’article SSR direct conserve son gestionnaire d’origine.

Le lecteur n’intercepte pas `/yann`, NovaLove, l’extrait, le guide, l’administration, les API, le callback TikTok ni les liens externes. `/projets/novalove/` est une histoire personnelle dans l’Atlas ; la page du livre `/novalove` garde son espace distinct.

Les anciens chemins `/novaia` et `/novaia.html` retournent une redirection 301 vers `/parcours/`. `/novamemory` et `/novamemory.html` retournent une 301 vers `/projets/novamemory/`. Les paramètres de requête sont conservés.

## Commandes et vérifications

Prérequis : Node 24 ou version compatible ultérieure, npm et les dépendances du lockfile.

```powershell
npm ci
npm run build
npm run check
npm test
npm audit
```

`npm run build` doit être exécuté après une modification du module GPU, du générateur ou du contenu. Ne pas modifier uniquement les pages générées : le prochain build les remplacerait. Le script `deploy` actuel appelle Wrangler ; exécuter le build et les tests avant toute publication.

Les tests couvrent les signatures et autorisations du journal, les brouillons, les dates futures, les likes persistants et annulables, les médias, le RSS, le HTML SSR, les règles du lecteur, les fichiers protégés, le routage des alias et la conservation du callback TikTok. La base des tests de journal est SQLite réelle en mémoire avec un adaptateur D1. Cela ne vérifie ni les bindings ni les migrations distantes.

Pour prévisualiser et contrôler le paquet Worker sans publication :

```powershell
npm run dev -- --ip 127.0.0.1 --port 8787 --local
npx wrangler deploy --dry-run --outdir .wrangler/atlas-dry-run
```

La base locale et le bucket local sont distincts de la production. Le journal local doit recevoir ses migrations avant utilisation. Ne jamais ajouter les secrets de `.dev.vars`, la base locale, les journaux Wrangler ou `node_modules` aux ressources publiques. `.assetsignore` exclut notamment le code serveur, les migrations, les tests, les scripts, les données de construction et les fichiers privés.

Compléter les tests par une inspection navigateur :

1. Accueil ordinateur : WebGPU réellement initialisé, carte lisible, neuf liens accessibles, aucune erreur console.
2. Pause/reprise, réduction du mouvement, sortie de l’écran et repli WebGL2/statique.
3. Écran étroit : aucun débordement horizontal, menu utilisable, ordre de lecture clair, liens tactiles et lecteur refermable.
4. Ouvrir un projet, poursuivre vers un second contenu, utiliser précédent/suivant, fermer le lecteur et vérifier URL et focus.
5. Journal : recherche, filtre, état vide, ouverture directe SSR, like, rechargement puis annulation du like.
6. `/yann`, NovaLove, extrait, anciennes archives, callback TikTok, 404 et alias historiques.
7. RSS et sommaire sans JavaScript ; aucune exposition de brouillons, de secrets ni de sources privées.

Les captures d’écran et résultats navigateur datés constituent les preuves visuelles. Ne pas remplacer ces contrôles par la seule présence de `navigator.gpu` ou une compilation réussie.

## Publication Cloudflare

Le nom de Worker est `novaia-site`. La configuration associe `JOURNAL_DB` à `novaia-journal` et `JOURNAL_MEDIA` au bucket `novaia-journal-media`. Le faux identifiant D1 doit être remplacé par celui d’une base réellement créée ou existante sur le bon compte. Ne pas déployer cette configuration comme si le stockage était prêt.

Procédure à réaliser seulement avec l’accès Cloudflare autorisé :

1. Vérifier l’identité du compte et la configuration actuelle du Worker, ses domaines et bindings. Conserver les routes, paramètres et secrets existants utiles.
2. Réutiliser les stockages nommés s’ils existent ; sinon les créer dans le compte autorisé, sans accepter de nouvelle offre payante implicitement. Mettre l’identifiant D1 réel dans la configuration.
3. Appliquer les migrations `0001_journal.sql` puis `0002_first_pages.sql` à la base distante. La seconde contient des insertions idempotentes. Lire le schéma et les publications attendues après migration.
4. Configurer `JOURNAL_SECRET` et `ADMIN_PASSWORD` via les secrets Wrangler, jamais en arguments visibles, dans Git, dans le HTML, dans les captures ou dans les journaux. Le secret de signature doit contenir au moins 32 caractères ; le mot de passe privé au moins 20. Un changement du secret révoque aussi les identités de likes et les sessions existantes : ne pas remplacer un secret valide sans raison.
5. Refaire le build, les tests et le contrôle Wrangler sans publication. Vérifier les empreintes protégées une dernière fois.
6. Déployer la version validée. Un push vers `main` peut aussi lancer la chaîne Cloudflare existante : considérer ce push comme une publication potentielle.
7. Vérifier le contenu effectivement servi sur `https://novaia.org`, une identité de version ou une empreinte de ressource, le journal distant, la santé des routes et les fichiers protégés. Vérifier le schéma réel, les médias et une opération non destructive du journal. Un déploiement annoncé par le CLI n’est pas à lui seul une preuve de fonctionnement public.

Un nouvel accord OAuth donnant accès au compte Cloudflare est une extension d’accès sensible ; le demander au dernier moment, après les contrôles locaux, avec les ressources concernées. Ne pas prétendre que la publication est terminée tant que cet accès ou la vérification publique manque.

Si le disque système est plein, il est possible d’affecter `TEMP`, `TMP`, `TMPDIR` et `WRANGLER_LOG_PATH` à un répertoire de travail sur D: pour le seul processus Wrangler. Cela ne modifie pas les paramètres globaux et ne justifie aucune suppression de données utilisateur.
