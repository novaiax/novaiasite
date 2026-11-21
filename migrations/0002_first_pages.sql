-- Public editorial starting points grounded in the owner's brief and documented work.
-- Stable identifiers + INSERT OR IGNORE make replay safe without overwriting edits.
INSERT OR IGNORE INTO journal_posts
  (id,slug,title,excerpt,body,kind,project,cover_url,cover_alt,status,published_at,created_at,updated_at)
VALUES
  ('12465125-d865-4c45-95bb-aad9e8b93c92',
   'un-endroit-pour-relier-les-projets',
   'Un endroit pour relier les projets',
   'NovaIA devient mon espace personnel : les créations, les expériences et le chemin entre les deux.',
   'Je voulais un endroit où retrouver ce que je construis, ce que j’apprends et ce que j’essaie.

Les outils IA, NovaLove, l’activité web et la vie associative n’ont pas besoin de raconter la même chose. Ils font pourtant partie du même parcours.

Ce journal en gardera les traces : des notes courtes, des nouvelles de projets et des retours d’expérience. Le chemin reste en cours.',
   'note','','','','published','2026-11-21T09:00:00.000Z','2026-11-21T09:00:00.000Z','2026-11-21T09:00:00.000Z'),
  ('440f7ea8-3c5c-4b63-849b-9a91a62b6927',
   'novaprompter-du-texte-a-la-parole',
   'NovaPrompter : du texte à la parole',
   'Un téléprompteur Windows, une fenêtre flottante et un suivi vocal en français.',
   'NovaPrompter est un téléprompteur pour Windows. Il affiche le texte dans une fenêtre flottante et propose un suivi vocal en français pour retrouver le fil du script pendant la prise de parole.

Le projet est disponible publiquement. Son suivi vocal a été testé avec de la parole synthétique. Le comportement avec ma voix, dans une vraie prise de parole, reste à vérifier : je garde cette différence en tête avant de parler d’un usage entièrement validé.

C’est un outil qui relie deux sujets que je pratique : construire une application et travailler la parole.

[Découvrir le projet](/projets/novaprompter) ou [retrouver le code sur GitHub](https://github.com/novaiax/NovaPrompter-App).',
   'note','novaprompter','','','published','2026-11-21T09:00:00.000Z','2026-11-21T09:00:00.000Z','2026-11-21T09:00:00.000Z'),
  ('81515f33-638f-463e-8bc4-0773e945a627',
   'apprendre-aussi-sur-le-terrain',
   'Apprendre aussi sur le terrain',
   'Le code est une partie de l’histoire. Le pitch et la vie associative en écrivent une autre.',
   'En octobre 2026, j’ai participé au Startup Weekend de Strasbourg : travailler en équipe sur un projet entrepreneurial, préparer un pitch, puis le présenter devant 140 personnes.

Chez Rock de Strass, je suis membre du bureau et je m’occupe de la communication numérique et de la visibilité. Le site fait partie de cet engagement, avec des personnes et des activités bien réelles derrière les pages.

Mon statut national étudiant-entrepreneur a été accepté pour 2026–2027, avec Pépite ETENA. J’ai aussi été admis au D2E. Cette admission est une étape du parcours, pas un diplôme déjà obtenu.

Ces expériences prolongent ce que j’apprends en construisant : expliquer une idée, écouter, travailler avec d’autres et la confronter au terrain.

[Découvrir Rock de Strass](/projets/rock-de-strass) ou [remonter le fil de mon parcours](/parcours).',
   'note','rock-de-strass','','','published','2026-11-21T09:00:00.000Z','2026-11-21T09:00:00.000Z','2026-11-21T09:00:00.000Z');
