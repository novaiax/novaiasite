import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {atlasDestination,journalDate,escapeAtlas} from '../js/atlas-routing.js';
import {extendAtlasProjects} from '../scripts/atlas-project-catalogue.mjs';
import {expectedProtectedHash} from '../scripts/protected-atlas.mjs';
const root=path.resolve(import.meta.dirname,'..');
test('Atlas preserves protected files and only the explicitly authorized Yann edits',()=>{
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/protected-atlas-baseline.json'),'utf8'));
  for(const[file,expected]of Object.entries(baseline.files)){const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');assert.equal(actual,expectedProtectedHash(file,expected,root),file)}
});
test('reader enhances owned stories, leaving protected and external pages to normal navigation',()=>{
  const base='https://novaia.org/';
  for(const url of ['/parcours/#sur-le-terrain','/projets/novalove/','/journal/','/journal/un-texte','/journal-plan?page=2','/blog/'])assert.ok(atlasDestination(url,base),url);
  for(const url of ['/yann','/novalove','/extraitnovalove','/novabook','/conseils/comment-se-remettre-dune-rupture','/tiktok/callback','/admin','/api/journal','/journal.xml','https://example.org/projets/','mailto:contact@novaia.org','/blog/site-en-panne-que-faire.html'])assert.equal(atlasDestination(url,base),null,url);
  assert.equal(atlasDestination('/journal/mon-texte',base).cacheable,false);assert.equal(atlasDestination('/journal-plan',base).cacheable,false);assert.equal(atlasDestination('/projets/novamemory/',base).cacheable,true);
});
test('journal presentation escapes untrusted titles and dates do not crash on invalid input',()=>{
  assert.equal(escapeAtlas('<img onerror="bad">'),'&lt;img onerror=&quot;bad&quot;&gt;');assert.equal(journalDate('bad'),'');assert.match(journalDate('2026-11-21T12:00:00Z'),/21 novembre 2026/);
});
test('main pages share one Atlas identity, retain real links and contain corrected personal facts',()=>{
  const projects=extendAtlasProjects(JSON.parse(fs.readFileSync(path.join(root,'data/atlas-content.json'),'utf8')).projects,root);
  const files=['index.html','parcours/index.html','projets/index.html','journal/index.html','blog/index.html','confidentialite/index.html',...projects.map(p=>`projets/${p.slug}/index.html`)];
  for(const file of files){const html=fs.readFileSync(path.join(root,file),'utf8');assert.match(html,/css\/atlas\.css/);assert.match(html,/id="main-content"/);assert.doesNotMatch(html,/css\/personal\.css/)}
  const home=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.equal((home.match(/data-atlas-node=/g)||[]).length,11);assert.match(home,/Ambition Paris/);assert.match(home,/href="\/parcours\/#sur-le-terrain"/);assert.match(home,/data-atlas-node="novaia-assistant"/);assert.doesNotMatch(home,/data-atlas-node="novaprompter"/);assert.match(home,/data-atlas-node="novabu"[^>]*href="\/projets\/novabu\/"/);
  const story=fs.readFileSync(path.join(root,'projets/novaiaweb/index.html'),'utf8');assert.match(story,/septembre 2025 à janvier 2026/);assert.doesNotMatch(story,/mai 2026/);
});
