# Fiche personnelle NovaiaWeb — 23 novembre 2026

URL : `/projets/novaiaweb/`, sur le site personnel. Le site commercial `novaiaweb.com` n'est pas modifié.

Le contenu public reste dans `data/atlas-content.json`. `scripts/atlas-novaiaweb.mjs` rend une page dédiée, appelée par le build Atlas. `css/atlas-novaiaweb.css` est limitée à `.novaiaweb-profile` : logo original NW, trois familles de services, méthode, ambitions et court point de départ. Les légendes et liens associés dans les autres fiches sont actualisés par le même build.

Le lecteur charge cette feuille locale à la demande, une seule fois, avant d'afficher la fiche. Sa classe reste à l'intérieur de `main`, donc survit à l'extraction du contenu. Un échec de chargement revient à la page complète. Le reste du catalogue utilise son rendu existant.

Validation locale réalisée : build ; vérification de syntaxe ; 54 tests Node, dont protection des 24 ressources figées, liens internes, rendu statique de la fiche et échappement des nouveaux champs. Le navigateur a été vérifié à 1440 px, 390 px et 320 px : page complète, lecteur, chargement du style dédié, logo chargé, absence de débordement horizontal, fermeture par Échap et retour du focus. La page et sa navigation restent présentes lorsque JavaScript est désactivé. Les modifications temporaires du navigateur ont été annulées.

La consultation Modern Web Guidance et les décisions appliquées sont détaillées dans `MODERN_WEB_GUIDANCE.md`. Les essais mobile sont des contrôles de viewport dans le navigateur de bureau ; aucun test physique iPhone/Android ni essai Safari/Firefox n'est revendiqué.
