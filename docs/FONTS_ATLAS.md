# Typographie de l’Atlas vivant

La feuille `css/atlas.css` conserve une typographie locale et indépendante des services de polices :

- `AtlasSans` charge une copie locale WOFF2 du sous-ensemble latin variable d’Inter : `/fonts/newatlas-inter.woff2`, avec `font-display: swap` et graisses variables. Le fichier fourni par le propriétaire de l’intégration provient de Google Fonts et pèse 48 256 octets.
- Georgia, puis Times New Roman et la famille serif du système, assurent les titres et la lecture éditoriale.

Aucun fichier de police antérieur n’a été modifié ou remplacé, et aucune requête vers un service de polices n’est nécessaire à la lecture du site. Le fichier `fonts/inter.ttf` fait partie du manifeste de protection parce qu’il est utilisé par `/yann` ; il reste strictement identique. L’avis OFL d’Inter est conservé dans `fonts/newatlas-OFL.txt`.

Le corps de lecture reste au minimum à 16 px. Les commandes et liens de navigation ont une zone de 44 px au minimum ; les annotations secondaires peuvent employer 12 px. Les textes principaux restent en bleu sombre sur la surface claire de l’Atlas.
