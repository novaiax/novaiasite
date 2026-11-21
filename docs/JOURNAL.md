# Journal personnel : exploitation

Le journal conserve le Worker Cloudflare existant et ses API. Il utilise une base D1 et, facultativement, un bucket R2 pour les photos. Son backend n’ajoute ni service externe d’authentification ni dépendance tierce. Les pages publiques partagent désormais la présentation Atlas du site principal.

## Configuration

Le Worker `_worker.js` doit appeler `handleJournal(request, env)` depuis `server/journal.js`, puis poursuivre ses routes historiques lorsque la fonction retourne `null`.

Bindings et secrets nécessaires :

- `JOURNAL_DB` : base Cloudflare D1 ; appliquer `migrations/0001_journal.sql` avant publication.
- `JOURNAL_SECRET` : secret aléatoire de 32 caractères minimum, utilisé pour signer les cookies. Utiliser au moins 32 octets aléatoires encodés en base64url.
- `ADMIN_PASSWORD` : mot de passe aléatoire de 20 caractères minimum. Il est comparé via WebCrypto HMAC. Le stocker exclusivement dans les secrets Cloudflare et le gestionnaire de mots de passe du propriétaire.
- `JOURNAL_MEDIA` : binding R2 facultatif. L’interface masque l’envoi de photos en son absence ; les URL d’images déjà hébergées restent utilisables.

Ne jamais placer les secrets dans le dépôt, un argument de commande, les journaux ou les fichiers distribués. Pour le développement local, `.dev.vars` doit être ignoré par Git et par Static Assets. Le fichier `.assetsignore` doit aussi exclure `server/`, `tests/`, `migrations/` et `docs/`.

Configurer `assets.run_worker_first` pour `/admin`, `/api/*`, `/journal/*`, `/journal-plan`, `/journal-sitemap.xml`, `/journal.xml` et `/media/journal/*`. Les routes existantes comme `/tiktok/callback` doivent conserver leur exécution par le Worker.

Pour appliquer le schéma : `npx wrangler d1 migrations apply JOURNAL_DB --remote`. Le nom exact de la base et son identifiant appartiennent à la configuration de déploiement. Ne pas appliquer une migration à une base d’un autre projet.

## Écrire

L’espace privé est à `/admin`. La page de connexion est accessible publiquement ; les textes et toutes les opérations d’administration exigent une session authentifiée. Les visiteurs du journal n’ont aucun compte à créer.

1. Se connecter avec le mot de passe privé.
2. Choisir « Nouvelle publication », saisir le titre, le résumé et le texte.
3. Choisir Note, Article ou Photo ; associer éventuellement un nom de projet.
4. Relire la mise en forme avec le bouton d’aperçu.
5. Garder en brouillon, publier immédiatement ou choisir une date future avant d’enregistrer.

La mise en forme accepte des paragraphes, des intertitres `#`, des listes, des citations `>`, du gras, de l’italique, des liens HTTPS et des images. Le HTML brut reste du texte : aucun script, iframe ou style arbitraire n’est exécuté.

L’envoi d’une photo passe par le navigateur : redimensionnement à 2 200 pixels maximum, réencodage JPEG, retrait des métadonnées. Le serveur vérifie le format, la signature du fichier et la taille maximale de 5 Mo. JPEG, PNG et WebP sont les seuls formats servis. Les noms des fichiers sont aléatoires ; le bucket n’est pas rendu public directement. Une photo envoyée a une URL publique non devinable et peut être affichée indépendamment du statut du texte : n’envoyer que des images destinées à devenir publiques.

« Archiver » retire le texte du journal public sans détruire le contenu ni les likes. Un changement d’adresse conserve une redirection depuis l’ancienne URL. L’interface détecte les modifications concurrentes d’un texte ; elle invite à le recharger avant d’écraser un enregistrement plus récent.

La session d’administration dure huit heures. La déconnexion supprime son cookie sur l’appareil. Pour révoquer toutes les sessions, changer `JOURNAL_SECRET` ; cela renouvelle aussi les identifiants anonymes des lecteurs. Pour changer uniquement le mot de passe, modifier `ADMIN_PASSWORD` ; les sessions déjà ouvertes continuent jusqu’à leur expiration.

## Likes et vie privée

Un cookie signé, `HttpOnly`, `SameSite=Lax` et `Secure` en HTTPS contient un identifiant anonyme valable un an. Il est créé lors de l’ouverture d’un texte ou d’un like, pas sur la simple liste publique des publications. D1 conserve le couple unique publication/identifiant et la date du like ; aucune adresse IP, nom, courriel ou empreinte d’appareil n’est enregistrée par ce code.

Un clic ajoute le like ; un second le retire. Les requêtes sont idempotentes. Le compteur est relu dans la base et reste partagé entre visiteurs et après les déploiements. Le même cookie retrouve l’état du like aux visites suivantes. Si le lecteur efface les cookies, utilise un autre navigateur ou bloque leur stockage, le site ne peut pas reconnaître ses likes antérieurs.

Les écritures exigent une origine identique au site. Les cookies sont vérifiés par HMAC et les identifiants sont uniques dans D1. Des limites par identifiant et globales freinent les rafales : 60 opérations de like par minute et par identifiant, 300 par minute au total ; 8 essais de connexion par quart d’heure et par identifiant, 100 au total. Les compteurs de limitation expirent et sont nettoyés lors des écritures. Cela ne constitue pas une défense absolue contre les robots réinitialisant leurs cookies ou une attaque distribuée ; aucune métrique d’audience fiable ne doit être déduite des likes.

Les journaux d’infrastructure Cloudflare et leur durée de conservation relèvent du compte d’hébergement ; ils sont distincts des données minimales enregistrées ici.

## API et vérifications

- `GET /api/journal?limit=50&offset=0` : publications publiques, compteur de likes, pagination ; filtres combinables `q` (titre/résumé, 120 caractères), `kind` (`note`, `article`, `photo`) et `project` (identifiant canonique du projet, 80 caractères maximum). Les caractères SQL `%` et `_` d’une recherche restent littéraux.
- `GET /api/journal/:slug` : texte public et état du like pour le cookie présent.
- `PUT /api/journal/:slug/like` avec `{"liked":true}` ou `false` : état souhaité.
- `GET /journal/:slug` : article rendu côté serveur, métadonnées, données structurées et bouton de like.
- `GET /journal-plan?page=1` : sommaire rendu côté serveur, utilisable sans JavaScript ; 50 textes par page, liens de pagination accessibles.
- `GET /journal-sitemap.xml` : sitemap XML des 1 000 publications publiques les plus récentes ; à déclarer dans `robots.txt` en complément du sitemap statique. Étendre en index de sitemaps si le journal dépasse ce volume.
- `GET /journal.xml` et `HEAD /journal.xml` : flux RSS 2.0 des 50 dernières publications publiques. Titre, extrait (ou les 600 premiers caractères du texte si le résumé est vide), date et URL canonique sont échappés pour XML. Le flux ne crée pas de cookie lecteur et est mis en cache cinq minutes. Les brouillons, archives et dates futures sont exclus.
- `/api/admin/login`, `/logout`, `/session`, `/posts`, `/posts/:id`, `/preview`, `/media` : opérations privées de l’interface.

Les brouillons, les archives et les dates futures restent absents des routes publiques. Les erreurs retournent des messages génériques sans SQL, mot de passe ni secret.

La migration `0002_first_pages.sql` ajoute trois premiers textes éditoriaux datés du 21 novembre 2026 à partir du brief et d’expériences documentées. Ses insertions sont idempotentes et ne remplacent pas les modifications ultérieures du propriétaire.

Les tests d’intégration utilisent SQLite réel en mémoire via `node:sqlite` et un adaptateur de l’API D1. Avec Node 24 :

```text
node --check server/journal.js
node --check server/admin-page.js
node --test tests/journal.test.mjs
```

Ils couvrent signatures, expiration, HTML malveillant, validation, administration non authentifiée, origine des écritures, limite de connexion, isolation des brouillons, likes persistants et annulables, redirections, édition concurrente et envoi d’images. Compléter par les vérifications Wrangler locales, un test visuel mobile/ordinateur, puis la vérification réelle du déploiement et des bindings de production. Les tests SQLite ne remplacent pas ces vérifications Cloudflare.

Avant toute publication, vérifier aussi le hash inchangé des fichiers et ressources NovaLove et les routes dynamiques historiques. Ce module renvoie `null` pour ces routes et ne modifie pas leur contenu.


## Présentation Atlas des pages publiques

`server/atlas-shell.js` fournit l’en-tête, le pied de page et les métadonnées communes aux articles, au sommaire et aux pages d’erreur du journal. Ces documents chargent uniquement `/css/atlas.css` et le module `/js/atlas.js` pour leur présentation principale. Les liens et les textes restent présents dans le HTML rendu côté serveur, donc lisibles sans JavaScript. Le lien de saut vise `#main-content`.

Le sommaire ajoute un lien de découverte RSS dans les métadonnées et le pied de page. Un article associé à un projet connu propose un lien vers son histoire. Les autres créations et le journal restent accessibles depuis les chemins de lecture.

Le bouton de like conserve son gestionnaire existant et son nonce aléatoire par réponse. La politique CSP autorise les modules du même domaine et ce nonce, sans autoriser les scripts inline arbitraires. Le module global Atlas ne doit pas ajouter un second gestionnaire au bouton `#like-post`. Les routes d’API et l’administration privée conservent leur fonctionnement ; l’administration garde sa présentation dédiée.

Les tests vérifient la structure Atlas, le JSON-LD décodable avec des caractères HTML échappés, la concordance du nonce avec la CSP, la lecture SSR, les réponses HEAD, les erreurs et l’isolation des publications du RSS. Compléter ces contrôles locaux par la vérification visuelle dans le navigateur et les bindings Cloudflare réels avant publication.
