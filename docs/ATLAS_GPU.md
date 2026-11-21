# Moteur graphique de l’Atlas vivant

Le contenu, les objets et les liens sont du HTML. `js/atlas-gpu.js` ajoute une couche cartographique via Three.js `WebGPURenderer` et des shaders TSL : terrains souples, contours, trame, filaments et points de lumière en déplacement. La couche répond au pointeur et au focus sans remplacer la navigation.

## Intégration

```js
const {initAtlasGPU}=await import('/js/generated/atlas-gpu.js');
const controller=await initAtlasGPU({
  canvas:document.getElementById('atlas-gpu'),
  container:document.getElementById('atlas-map'),
  nodes:document.querySelectorAll('[data-atlas-node]'),
  signal:abortController.signal,
});
// Lors du départ de la page :
controller.dispose();
```

Le module source importe `three/webgpu` et `three/tsl` de manière dynamique. Le build du site doit les résoudre dans le bundle local, sans CDN au runtime. Le contrôleur expose `dispose()`, `refreshLayout(nodes?)`, `setMotion(enabled)` et `mode`. L’option d’intégration `forceWebGL:true` permet de vérifier le repli dans une prévisualisation, sans modifier les réglages du navigateur. Le canevas et le conteneur reçoivent `data-renderer="webgpu|webgl2|static"`. La classe `gpu-ready` n’est ajoutée qu’après compilation et premier rendu terminé. Une erreur d’initialisation, de validation, de rendu ou une perte du device retire cette classe pour rendre le SVG statique de nouveau visible.

La feuille du site doit placer le canevas derrière les vrais liens, le rendre non interactif et gérer l’apparition douce de `.gpu-ready`. Le module ne crée aucune capture ou image du contenu. Les routes suivent les centres réels des nœuds HTML et sont reconstruites au redimensionnement. L’événement `atlas:layout` peut demander un nouveau relevé. Le document peut recevoir `atlas:motion` avec `{enabled:false}` pour arrêter les animations, ou le contrôleur peut être appelé directement.

Si un lien contient `[data-atlas-anchor]`, les filaments se raccordent au centre de cet objet visuel ; sinon ils utilisent le centre du lien complet. Le conteneur et le canevas portent également `data-gpu-frames`, compteur des appels de rendu réussis. Il n’augmente pas à chaque callback RAF : il n’est incrémenté qu’après `renderer.render()`, et sa valeur DOM est publiée toutes les dix images ainsi qu’aux changements d’état. Ce diagnostic permet de vérifier une pause/reprise réelle sans ajouter de métrique visible au produit. Il mesure les rendus soumis, pas une fréquence d’affichage matérielle certifiée.

La carte d’accueil à dix objets relie NovaIA (`novaia-assistant`) au portrait/parcours, à NovaMemory, NovaHub, NovaFormation et NovaiaWeb. NovaHub rejoint aussi NovaMemory et le journal. Ces fils sont des repères de découverte, pas une représentation d’exécution ou de proxy d’outils. L’ancien fil d’accueil NovaPrompter n’est plus prescrit ; les créations présentes sont toujours mesurées depuis leur véritable élément HTML.

## Budget et accessibilité

- Pixels plafonnés à 3,2 millions sur ordinateur et 1,45 million sur appareil léger ; DPR limité à 2 ou 1,5.
- 60 images/s visées sur ordinateur, 30 sur appareil léger. Il s’agit d’un plafond d’ordonnancement, pas d’un benchmark de performances réelles.
- Le rendu continu s’arrête quand la carte sort de l’écran ou le document est masqué.
- `prefers-reduced-motion` produit un rendu fixe ; les liens restent utilisables au clavier et au toucher. Le contrôle de mouvement peut suspendre les animations indépendamment de cette préférence.
- `Save-Data` et les appareils extrêmement limités conservent le dessin statique sans charger Three.js.
- Chaque observateur, écouteur, géométrie, matériau et renderer est libéré au départ de la page. Une initialisation annulée ne peut pas laisser une ancienne scène active.

## Preuves et limites

`node --test tests/atlas-gpu.test.mjs` vérifie la topologie, les raccordements des rubans, leur largeur en pixels, les budgets et l’absence de blocage quand le moteur manque. Ces tests ne prétendent pas exécuter WebGPU. La compilation réelle des shaders, le backend WebGPU actif, le repli WebGL2/statique et les préférences de mouvement doivent être vérifiés dans le navigateur de prévisualisation avant publication.

Les comportements WebGPU/WebGL2 et le modèle de shader proviennent des [documents officiels Three.js](https://threejs.org/docs/pages/WebGPURenderer.html) et de la [spécification TSL](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language). Les shaders et géométries de cette carte sont écrits pour Novaia.org.
