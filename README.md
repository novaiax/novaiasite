# novaiasite
Site novaia.org

## NovaLove

- Page de présentation : `novalove.html`, URL publique `/novalove`.
- Extrait : `extraitnovalove.html`, URL publique `/extraitnovalove`.
- Styles communs à ces deux pages : `css/novalovestyles.css`.
- Interactions et événements Analytics : `js/novalove.js`.
- Achat : fiche Amazon `B0FHHYZ8NJ` ; prix et caractéristiques vérifiés le 20 novembre 2026 : broché en français, 120 pages, 13 €. Recontrôler la fiche avant de changer les informations commerciales.

Le texte du prologue et du chapitre de l’extrait doit rester identique au livre. Les autres pages du site ont leurs propres styles. Le site utilise les URL sans extension fournies par Cloudflare Static Assets ; le Worker `_worker.js` conserve les routes dynamiques existantes.

Validation sans build : `node --check js/novalove.js`, contrôle des liens et ressources, vérification des deux pages sur ordinateur et mobile. Le serveur historique `serve.js` ne reproduit pas les routes sans extension de Cloudflare.
