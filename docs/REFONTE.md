# Refonte personnelle de NovaIA.org

> Document historique du premier brouillon. L’état actuel, le déploiement Atlas et les choix définitifs sont décrits dans `ATLAS_RELEASE.md` et `EDITORIAL_ATLAS.md`.

## Source et sauvegarde

La référence de départ est la branche principale GitHub de `novaiax/novaiasite`, commit `5290728cfde619199dfc7787802d34eea697fb08` du 20 novembre 2026. Le dossier fourni par Yann contient plusieurs anciennes copies. La copie `novaia.org v9 (Avec EN)` a servi à récupérer `origin/main`.

Avant la refonte, la branche locale `safety/avant-refonte-20261121` conserve son ancien `main`. Le travail est réalisé dans le worktree distinct `refonte-personnelle-20261121`, sur `codex/refonte-personnelle-20261121`, créé à partir du dernier `origin/main`. Les anciennes copies, leurs fichiers non suivis (`.claude`, `.vite`, `header-banner.svg`, `video memoire.mp4`) et leur état local sont conservés. Aucune remise à zéro ni suppression de ces fichiers n’est nécessaire.

## Architecture préservée

L’hébergement existant reste Cloudflare Workers : point d’entrée `_worker.js`, binding statique `ASSETS`, ressources à la racine et URL HTML sans extension. Le callback `/tiktok/callback`, ses états vide/succès/erreur et son échappement HTML restent fonctionnels. Les autres routes conservent la transmission au binding statique. Le site utilise une architecture légère ; les pages historiques et leurs URL ne sont pas effacées.

Le dépôt de départ ne contient pas d’administration, de stockage des publications ni de likes persistants. Les quatre articles historiques sous `/blog/` sont des fichiers HTML. Leur présence ne constitue pas un système de publication administrable. La page `/analytics/` historique contient une démonstration avec des chiffres codés en dur ; elle ne doit pas être présentée comme une mesure réelle d’audience.

Le README de référence indique une intégration Cloudflare avec la branche `main` et `npx wrangler deploy`. Un push sur `main` peut donc déclencher une publication. Vérifier les résultats de Cloudflare et le site public après toute publication ; un push GitHub réussi n’est pas une preuve de déploiement réussi.

## Périmètre NovaLove protégé

Les fichiers suivants doivent rester strictement identiques au commit de référence, y compris leurs dépendances :

- `novalove.html`
- `extraitnovalove.html`
- `novabook.html`
- `conseils/comment-se-remettre-dune-rupture.html`
- `css/novalovestyles.css`
- `js/novalove.js`
- `images/couvertureavant.png`
- `images/couvertureavant.webp`
- `images/logonova.webp`
- `images/favicon/apple-touch-icon.png`
- `images/favicon/favicon-96x96.png`
- `images/favicon/favicon.ico`
- `images/favicon/favicon.svg`
- `images/favicon/site.webmanifest`
- `images/favicon/web-app-manifest-192x192.png`
- `images/favicon/web-app-manifest-512x512.png`

Les polices externes Google Fonts, les interactions du lecteur et les liens Amazon sont conservés avec ces fichiers. Le texte de l’extrait n’est pas modifié. Le choix de police du lecteur est conservé sous la clé locale `novalove-reading-font`.

## Validation

Depuis la racine du checkout :

```powershell
node --test tests/site.test.mjs
node --check _worker.js
node --check js/novalove.js
npx wrangler deploy --dry-run --outdir <dossier-hors-du-depot>
```

Le test utilise uniquement les modules intégrés de Node.js et Git. Il compare le SHA-256 de chaque fichier protégé au contenu exact de `git show 5290728:<chemin>`, vérifie le callback OAuth avec entrées HTML malicieuses et contrôle la transmission des routes historiques au binding statique. Il contrôle aussi les liens et ressources locaux des pages HTML. Les chemins administrés dynamiquement (`/journal`, `/journal-plan`, `/journal-sitemap.xml`, `/api`, `/admin`) sont laissés aux tests fonctionnels de leur serveur. Les liens déjà cassés dans la référence historique sont signalés à titre de diagnostic ; un lien nouveau cassé ou une ressource supprimée provoque un échec.

Les tests sans navigateur ne prouvent pas la présentation visuelle, le comportement tactile, les animations, la navigation clavier ni la persistance réelle des publications en production. Le serveur historique `serve.js` ne reproduit pas les routes Cloudflare sans extension : employer Wrangler pour les vérifications avec routage réel. Avant publication, vérifier les pages publiques protégées sur ordinateur et mobile, puis la création/lecture des publications, l’authentification administrative et les likes avec leur stockage réel.

Les routes publiques `/_worker.js`, `/serve.js`, `/wrangler.jsonc` et `/.git/config` doivent répondre 404. Les fichiers de développement, tests, documentation et configuration doivent être exclus des ressources statiques publiées.

## Architecture ajoutée par la refonte

La nouvelle présentation utilise sa propre feuille `css/personal.css`, son script `js/personal.js`, ses polices locales et le portrait fourni. Elle ne réutilise ni ne modifie les styles de NovaLove. Les nouvelles pages couvrent l’accueil, le parcours, les créations et leurs histoires, le journal, les liens mobiles et la confidentialité. L’ancien index du blog devient une porte vers les archives sans supprimer ses quatre articles.

Le Worker conserve le callback existant et délègue les nouvelles routes à `server/journal.js`. Le journal utilise le binding D1 `JOURNAL_DB` pour les publications, likes, alias de slugs et limites de fréquence. Le binding R2 `JOURNAL_MEDIA` sert aux photos publiées depuis l’administration. Les secrets `JOURNAL_SECRET` et `ADMIN_PASSWORD` appartiennent à l’environnement privé du Worker. Voir `docs/JOURNAL.md` pour la configuration et les migrations.

Les articles sont rendus côté serveur. Le sommaire `/journal-plan` reste lisible sans JavaScript ; `/journal-sitemap.xml` expose les publications publiques. Les identités anonymes et sessions administratives sont signées et conservées dans des cookies HttpOnly. Les likes sont idempotents, réversibles et stockés en base sans identifiant dérivé d’une adresse IP. Les routes dynamiques sont déclarées dans `assets.run_worker_first` ; la transmission statique reste active pour le reste du site.

Les fichiers de développement (`server/`, `migrations/`, `tests/`, `docs/`, manifestes npm et variables privées) sont exclus des assets dans `.assetsignore`. Les bindings, migrations et secrets de production doivent être réellement configurés avant qu’une publication puisse être considérée comme utilisable. Les placeholders de configuration ne constituent pas une infrastructure provisionnée.

## Vérification consignée le 21 novembre 2026

Sur le worktree généré, après restauration brute des fichiers protégés depuis les objets Git :

- `node --test tests/site.test.mjs` : 19 tests réussis, aucun échec.
- `npm test` : 33 tests réussis, aucun échec, couvrant aussi le journal avec un adaptateur SQLite en mémoire.
- Les 16 empreintes SHA-256 des fichiers protégés correspondent exactement aux objets Git de référence.
- Les nouveaux liens locaux vérifiés ne présentent pas de ressource manquante. Le lien historique déjà absent `novaia.html → images/logo Nova sans fond.png` reste signalé sans être modifié.

Ces résultats prouvent les contrôles automatiques décrits, pas la persistance dans un binding D1 de production ni un déploiement effectif. Aucun test navigateur n’a été exécuté dans le cadre de cette vérification.
