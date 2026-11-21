# Novaia.org — Atlas vivant

Le 21 novembre 2026, Yann a choisi l’Atlas vivant et autorisé la refonte complète du site principal avec de belles animations WebGPU. Le site reste personnel, non commercial. Préserver les contenus factuels corrigés, les anciennes URL et les routes dynamiques Cloudflare.

## Périmètre figé

Ne modifier ni `/yann`, ni ses styles `css/links.css`, ni les ressources qu’il utilise. Ne modifier ni NovaLove, ni l’extrait, ni le guide associé, ni leurs ressources. Le manifeste `tests/fixtures/protected-atlas-baseline.json` conserve les SHA-256 de tous ces fichiers au début de la réalisation Atlas. Chaque test doit les retrouver strictement identiques. Ne pas réécrire le manifeste pour faire passer un test.

Les anciennes copies locales restent en place. Travailler dans ce worktree sur `codex/refonte-personnelle-20261121`. La référence GitHub initiale est `5290728`. Un push sur main peut publier automatiquement ; ne pas pousser une version non vérifiée. Les placeholders D1 de configuration ne constituent pas une infrastructure provisionnée.

Exception explicitement demandée ensuite le 21 novembre : sur `/yann`, retirer uniquement l’étoile, le bouton TikTok NovaIA, et appliquer le libellé Programme D2E. `scripts/protected-atlas.mjs` vérifie ces transformations exactes depuis la copie originale conservée dans les fixtures. Le manifeste initial reste intact ; les 23 autres fichiers restent identiques. Ne pas élargir cette exception à une refonte de la page.

Pour les textes : au moins trois recherches réelles distinctes dans NovaMemory par projet. Garder les preuves et les détails privés hors des ressources publiques. Sélectionner ce qui intéresse le visiteur et met le travail de Yann en valeur : rôle, réalisation, usage concret et personnalité. Éviter les journaux de bugs, détails de paiement, étapes insignifiantes ou allégations inventées. Le nom public de son IA personnelle est NovaIA, et son aide concerne aussi la gestion de son entreprise. Ne pas employer son ancien nom dans le site.

Derniers choix : les sept fiches clients sont retirées des créations personnelles ; conserver NovaiaWeb. Les déclinaisons privées de mémoire ne sont pas citées. Le logo NovaMemory retenu est le cerveau violet fourni par Yann, et NovaHub reprend l’icône orbitale orange fournie. Employer les vrais logos des projets sur la carte, les fiches et l’écosystème. CS50x est présenté dans le parcours avec le certificat VERIFIED edX / HarvardX délivré le 14 janvier 2026, lien officiel ea8d527454164678b3742bc0f8901702. Le PDF affiché est une impression fidèle de cette page officielle. Il remplace l’ancien certificat CS50 standard 2025 ; ne pas en faire un diplôme universitaire ni un projet principal sur l’accueil.

Libellés publics CS50 demandés ensuite : « CS50x · Harvard » et « Certificat vérifié ». Ne pas citer la plateforme dans le texte de présentation ; conserver le document authentique et son URL de vérification.

## Contenu et comportement

- YannService freelance : septembre 2025 à janvier 2026, puis création de NovaiaWeb en janvier 2026.
- Yann est étudiant-entrepreneur, Programme D2E, accompagné par Pépite ETENA ; aucun diplôme obtenu à inventer. Utiliser ce libellé exact demandé le 21 novembre.
- Strasbourg aujourd’hui, ambition Paris ; ne pas présenter Paris comme sa résidence actuelle.
- Calisthenics, danse Rock de Strass, impro, éloquence, capoeira, course, lecture et anglais sont des pratiques, sans performances ni anecdotes privées inventées.
- Le journal conserve son administration privée, les brouillons et les likes anonymes persistants. Les quatre anciens articles restent à leurs URL.
- Les liens de la carte doivent rester de vrais liens utilisables sans JavaScript. Les pages ont une URL et restent lisibles pour les moteurs et au clavier.
- NovaFormation est son logiciel personnel de formation : organisation de l’apprentissage en autodidacte, suivi du niveau et de la progression.
- Le catalogue doit couvrir les créations du GitHub complet, en regroupant les versions d’un même projet. NovaBlock et sa famille ne doivent apparaître dans aucune présentation publique. Ne pas republier les URL privées, secrets ni données personnelles lus pendant une recherche.
- Le symbole étoile de NovaiaWeb a été supprimé à la demande de Yann. Les biographies des quatre archives sont désormais actualisées ; le reste de leurs articles demeure conservé.
- WebGPU est une amélioration progressive : chargement non bloquant, rendu mesuré, arrêt hors écran/document masqué, repli accessible et `prefers-reduced-motion`.

## Vérification

`npm test`, `npm run check`, contrôle Wrangler sans publication, puis contrôles navigateur ordinateur/mobile, WebGPU actif, repli et réduction du mouvement. Les modifications de présentation n’autorisent pas de régression TikTok OAuth, NovaLove, lecture de l’extrait, journal ou administration.

La bibliothèque `D:/code/outils/novaia-design-library` fournit les recherches, techniques et prototypes ; elle reste indépendante du site. Ne pas recopier un site tiers ou ses médias.
