import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {novaiawebPage} from '../scripts/atlas-novaiaweb.mjs';
import {escapeAtlas as esc} from '../js/atlas-routing.js';

test('company profile stays complete in its static page and declares its own stylesheet',()=>{
  const html=fs.readFileSync(new URL('../projets/novaiaweb/index.html',import.meta.url),'utf8');
  assert.match(html,/<link rel="stylesheet" href="\/css\/atlas-novaiaweb\.css" data-atlas-novaiaweb-style>/);
  const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1]||'';
  for(const text of ['Ce que je fais','Comment je travaille','Ce que je veux construire','septembre 2025 à janvier 2026','https://novaiaweb.com/','/images/projets/novaiaweb.png'])assert.ok(main.includes(text),text);
  assert.doesNotMatch(main,/DNS|SSL|interventions d’urgence|Les premières prestations/);
  const home=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.doesNotMatch(home,/href="\/css\/atlas-novaiaweb\.css"/);
});

test('new profile fields are escaped before rendering into a page or reader',()=>{
  const attack='<img src=x onerror="alert(1)">';
  const html=novaiawebPage({name:attack,deck:attack,lead:attack,services:[{title:attack,text:attack}],method:[{title:attack,text:attack}],ambition:{title:attack,text:attack},origin:{title:attack,text:attack},sections:[]},{esc});
  assert.doesNotMatch(html,/<img src=x/);
  assert.ok(html.includes(esc(attack)));
  assert.ok(html.indexOf('class="novaiaweb-profile"')>html.indexOf('<main'));
});
