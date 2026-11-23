# NovaBU dans l'Atlas — 23 novembre 2026

À la demande de Yann, NovaBU rejoint les créations personnelles et la carte d'accueil. La fiche est publiée à `/projets/novabu/` et relie l'application `https://novabu.novaia.org/` au dépôt `https://github.com/novaiax/NovaBU`. Le catalogue contient désormais 44 créations, dont 11 représentées sur l'accueil. Le filtre Applications & outils et la recherche incluent la fiche.

Le contenu provient des README et documentation technique du dépôt public, lus via GitHub, et de la page de connexion réellement servie. Trois recherches NovaMemory distinctes n'ont pas retourné de souvenir exact sur ce nouveau projet ; aucun récit privé n'en est déduit. Le logo WebP est une copie identique du fichier servi par NovaBU (SHA-256 `87950c5ec4095b536a9ee69561cb45fd927b302e5c2470c92e8ed12bac60e3bc`, 3 384 octets).

La fiche distingue la recherche des créneaux et la confirmation auprès d'Affluences. L'instance hébergée demande un compte ; le dépôt décrit aussi la distribution Windows locale gratuite. Aucun quota ni accès à un établissement n'est présenté comme garanti.

Le point d'accueil utilise l'identité existante de l'Atlas. Il reste un lien HTML et s'ouvre dans le lecteur natif. Le moteur graphique relie NovaBU à NovaFormation et au parcours. Sur les largeurs intermédiaires, une grille évite la superposition des cibles ; sur mobile, NovaBU figure dans la première paire. Le repli statique et la réduction du mouvement restent gérés par le moteur existant. Aucun ajout de dépendance.

Vérifications locales : build, syntaxe, 54 tests Node ; 127 contrôles HTTP principaux, dont les 24 ressources protégées ; 10 contrôles ciblés NovaBU. Contrôles navigateur à 1440, 1280, 1024, 980, 768, 390 et 320 px pendant l'ajustement ; absence finale de chevauchement vérifiée à 1440, 1280, 1024, 390 et 320 px, logo chargé, modes WebGPU et statique, lecteur, Échap/retour du focus, recherche du catalogue et fiche directe à 320 px. Les essais sont effectués en navigateur de bureau, pas sur appareil physique. Les lectures Modern Web Guidance et leurs décisions figurent dans `MODERN_WEB_GUIDANCE.md`.

La vérification publique après publication est conservée dans les rapports de livraison hors des ressources hébergées. `/yann`, NovaLove et leurs ressources restent soumis aux empreintes de protection existantes.
