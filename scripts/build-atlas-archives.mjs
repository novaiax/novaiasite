import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {atlasHeader,atlasFooter} from '../server/atlas-shell.js';

const root=path.resolve(import.meta.dirname,'..');
const catalogPath=path.join(root,'data/atlas-archives.json');
const files=['combien-coute-un-site-web-artisan-2026.html','comment-se-faire-citer-par-les-ia.html','rendre-site-compatible-agents-ia.html','site-en-panne-que-faire.html'];
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const articleOf=html=>{const match=html.match(/<article\b[\s\S]*?<\/article>/i);if(!match)throw new Error('Archive article missing');return match[0]};
const metadataOf=head=>head.match(/<meta\b[^>]*>|<title>[\s\S]*?<\/title>|<link\b[^>]*rel=["']canonical["'][^>]*>|<script\b[^>]*type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi)||[];
const textOf=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const authorBox=/<div class="blog-author-box">[\s\S]*?<\/div>\s*<\/div>/;
const withoutAuthor=article=>article.replace(authorBox,'<!-- current-author-bio -->');
// Yann explicitly requested this biography update on 21 November 2026.
const currentAuthor='<div class="blog-author-box"><img src="/images/personnel/yann.jpg" alt="" aria-hidden="true" loading="lazy"><div><strong>Yann Wirtz</strong><p>Étudiant-entrepreneur à Strasbourg, créateur de <a href="https://novaiaweb.com/">NovaiaWeb</a>. Programme D2E, accompagné par Pépite ETENA. Je crée des outils, j’apprends et j’entreprends.</p><a href="/parcours/">Découvrir mon parcours</a></div></div>';

if(process.argv.includes('--capture')){
  if(fs.existsSync(catalogPath))throw new Error('Archive baseline already exists; refusing to replace it.');
  const entries=files.map(file=>{
    const original=fs.readFileSync(path.join(root,'blog',file),'utf8');
    const head=original.match(/<head>([\s\S]*?)<\/head>/i)?.[1];
    if(!head)throw new Error('Archive head missing: '+file);
    const article=articleOf(original);
    return {file,originalDocumentSha256:hash(original),articleSha256:hash(article),articleTextSha256:hash(textOf(article)),metadataSha256:hash(JSON.stringify(metadataOf(head))),head,article};
  });
  fs.mkdirSync(path.dirname(catalogPath),{recursive:true});
  fs.writeFileSync(catalogPath,JSON.stringify({version:1,capturedAt:'2026-11-21',purpose:'Original archive articles and SEO metadata retained verbatim; Atlas changes only the surrounding presentation.',entries},null,2)+'\n');
}

const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
assert.deepEqual(catalog.entries.map(entry=>entry.file),files);
for(const entry of catalog.entries){
  assert.equal(hash(entry.article),entry.articleSha256,'Baseline article integrity: '+entry.file);
  assert.equal(hash(textOf(entry.article)),entry.articleTextSha256,'Baseline text integrity: '+entry.file);
  assert.equal(hash(JSON.stringify(metadataOf(entry.head))),entry.metadataSha256,'Baseline metadata integrity: '+entry.file);
  const target=path.join(root,'blog',entry.file);
  const current=fs.readFileSync(target,'utf8');
  assert.equal(withoutAuthor(articleOf(current)),withoutAuthor(entry.article),'Existing article outside the authorized biography was edited: '+entry.file);
  assert.ok(authorBox.test(entry.article),'Original author box missing: '+entry.file);
  const article=entry.article.replace(authorBox,currentAuthor);
  const originalHead=entry.head.replace(/^[ \t]*<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com|href=["']blog\.css["'])[^>]*>[^\S\r\n]*(?:\r?\n)?/gmi,'');
  const html=`<!doctype html>\n<html lang="fr">\n<head>${originalHead}\n  <meta name="theme-color" content="#e9eff2">\n  <link rel="preload" href="/fonts/newatlas-inter.woff2" as="font" type="font/woff2" crossorigin>\n  <link rel="stylesheet" href="/css/atlas.css">\n  <link rel="stylesheet" href="/css/atlas-archives.css">\n  <link rel="alternate" type="application/rss+xml" title="Le journal de Yann Wirtz" href="/journal.xml">\n  <script type="module" src="/js/atlas.js"></script>\n</head>\n<body class="atlas-site atlas-archive" data-page="archive-article">\n${atlasHeader()}\n<main id="main-content" class="archive-main">\n  <nav class="archive-context" aria-label="Fil d’Ariane"><a href="/">L’Atlas</a><span aria-hidden="true">/</span><a href="/blog/">Les archives</a></nav>\n${article}\n  <aside class="archive-continuation"><p class="eyebrow">La suite du chemin</p><a class="text-link" href="/blog/">Retrouver les premières pages</a><a class="text-link" href="/journal/">Lire le journal actuel</a></aside>\n</main>\n${atlasFooter()}\n</body>\n</html>\n`;
  assert.equal(withoutAuthor(articleOf(html)),withoutAuthor(entry.article),'Rendered article integrity outside biography: '+entry.file);
  assert.equal(articleOf(html),article,'Rendered updated author biography: '+entry.file);
  const renderedMetadata=metadataOf(html).filter(value=>!/<meta\b[^>]*name="theme-color"/i.test(value));
  assert.deepEqual(renderedMetadata,metadataOf(entry.head),'Rendered SEO metadata integrity: '+entry.file);
  if(process.argv.includes('--check')){
    assert.equal(current,html,'Archive output is stale: '+entry.file);
  }else fs.writeFileSync(target,html);
}
console.log(`Atlas archives: ${catalog.entries.length} articles, authorized biography updated; other content/SEO metadata preserved${process.argv.includes('--check')?' (check only)':''}.`);
