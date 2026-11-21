export function ecosystemSection(){
  const logos={memory:'/images/projets/novamemory.png',hub:'/images/projets/novahub.png'};
  const tools=[
    ['memory','novamemory','Nm','NovaMemory','Garder le contexte'],
    ['hub','novahub','Nh','NovaHub','Mobiliser les bons outils'],
    ['cognition','novacognition','Nc','NovaCognition','Mieux réfléchir et vérifier'],
    ['learning','novalearning','Nl','NovaLearning','Apprendre des retours'],
    ['social','novasocial','Ns','NovaSocial','Comprendre les interactions'],
    ['imagination','novaimagination','Ni','NovaImagination','Explorer des possibles'],
    ['goals','novagoals','Ng','NovaGoals','Garder le cap']
  ];
  return `<section id="ecosysteme" class="ecosystem-section"><header class="ecosystem-heading"><p class="eyebrow">NovaIA, au quotidien</p><h2>Une IA personnelle.<br>Un écosystème <em>vivant.</em></h2><p>NovaIA est mon IA personnelle. Reliée à mes outils et à mes systèmes, elle m’aide à organiser mon quotidien, gérer mon entreprise et déléguer des tâches. Je la fais évoluer en continu pour gagner du temps, rester à la pointe des technologies et repérer de nouvelles opportunités.</p><a class="text-link" href="/projets/novaia-assistant/" data-atlas-link>Découvrir NovaIA</a></header><div class="ecosystem-orbit" aria-label="Les outils de mon écosystème IA"><svg class="ecosystem-lines" viewBox="0 0 1000 450" preserveAspectRatio="none" aria-hidden="true"><g fill="none"><path d="M500 225Q350 95 140 105"/><path d="M500 225Q325 365 140 335"/><path d="M500 225Q520 120 420 55"/><path d="M500 225Q650 75 780 80"/><path d="M500 225Q700 290 860 245"/><path d="M500 225Q675 300 760 400"/><path d="M500 225Q375 315 430 400"/></g><circle cx="500" cy="225" r="94" fill="none"/></svg><a class="ecosystem-core" href="/projets/novaia-assistant/" data-atlas-link><img src="/images/logonova.webp" width="88" height="88" loading="lazy" alt=""><strong>NovaIA</strong><span>L’IA personnelle.</span></a>${tools.map(([klass,slug,initials,name,purpose])=>`<a class="ecosystem-tool tool-${klass}" href="/projets/${slug}/" data-atlas-link><i aria-hidden="true" class="${logos[klass]?'ecosystem-tool-logo':''}">${logos[klass]?`<img src="${logos[klass]}" width="42" height="42" alt="" loading="lazy" decoding="async">`:initials}</i><strong>${name}</strong><span>${purpose}</span></a>`).join('')}</div></section>`;
}
