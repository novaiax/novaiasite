import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseline = '5290728cfde619199dfc7787802d34eea697fb08';
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const protectedPaths = [
  'novalove.html', 'extraitnovalove.html', 'novabook.html',
  'conseils/comment-se-remettre-dune-rupture.html',
  'css/novalovestyles.css', 'js/novalove.js',
  'images/couvertureavant.png', 'images/couvertureavant.webp', 'images/logonova.webp',
  ...git('ls-tree', '-r', '--name-only', baseline, '--', 'images/favicon').toString().trim().split('\n').filter(Boolean),
];

for (const path of protectedPaths) {
  test(`NovaLove remains byte-identical: ${path}`, async () => {
    const expected = git('show', `${baseline}:${path}`);
    assert.equal(hash(await readFile(join(root, path))), hash(expected), `Protected file changed: ${path}`);
  });
}

const worker = (await import(pathToFileURL(join(root, '_worker.js')).href)).default;
const fetchWorker = path => worker.fetch(new Request(`https://novaia.org${path}`), {
  ASSETS: { fetch: async () => new Response('asset fallback', { status: 207 }) },
});

test('TikTok callback preserves empty, success and error states with escaped input', async () => {
  const empty = await fetchWorker('/tiktok/callback');
  assert.equal(empty.status, 200);
  assert.match(await empty.text(), /Pas de code OAuth/);
  assert.match(empty.headers.get('cache-control'), /no-store/);
  assert.equal(empty.headers.get('referrer-policy'), 'no-referrer');
  const success = await fetchWorker('/tiktok/callback?code=%3Ctest%3E&state=%22state%22&scopes=user.info.basic,video.list');
  const successHtml = await success.text();
  assert.equal(success.status, 200);
  assert.match(successHtml, /Code OAuth généré/);
  assert.match(successHtml, /&lt;test&gt;/);
  assert.match(successHtml, /&quot;state&quot;/);
  assert.match(successHtml, /user\.info\.basic/);
  assert.match(successHtml, /video\.list/);
  assert.doesNotMatch(successHtml, /<test>/);
  const failure = await fetchWorker('/tiktok/callback?error=access_denied&error_description=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
  const failureHtml = await failure.text();
  assert.equal(failure.status, 200);
  assert.match(failureHtml, /Autorisation refusée/);
  assert.match(failureHtml, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(failureHtml, /<script>alert\(1\)<\/script>/);
});

test('unrelated requests still reach the Cloudflare static asset binding', async () => {
  for (const path of ['/novalove', '/extraitnovalove', '/blog/site-en-panne-que-faire.html', '/not-a-known-route']) {
    const response = await fetchWorker(path);
    assert.equal(response.status, 207, path);
    assert.equal(await response.text(), 'asset fallback', path);
  }
});

const ignoredDirectories = new Set(['.git', '.wrangler', '.claude', '.vite', 'node_modules', 'tests', 'docs', 'work']);
async function htmlFiles(folder = root) {
  const items = await readdir(folder, { withFileTypes: true });
  const result = [];
  for (const item of items) {
    const path = join(folder, item.name);
    if (item.isDirectory() && !ignoredDirectories.has(item.name)) result.push(...await htmlFiles(path));
    if (item.isFile() && item.name.endsWith('.html')) result.push(path);
  }
  return result;
}
function localLinks(html) {
  const links = [];
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of withoutComments.matchAll(/<(?:a|link|script|img|source|video|audio|iframe|input)\b[^>]*>/gi)) {
    for (const attribute of tag[0].matchAll(/\b(?:src|href|poster)\s*=\s*(["'])(.*?)\1/gi)) {
      const value = attribute[2].replace(/&amp;/g, '&');
      if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) continue;
      links.push(value);
    }
  }
  return links;
}
function candidates(file, link) {
  const base = new URL(`https://novaia.org/${relative(root, file).split(sep).join('/')}`);
  const url = new URL(link, base);
  if (/^\/(?:api(?:\/|$)|admin(?:\/|$)|journal(?:\/|$)|journal-plan(?:\/|$)|journal\.xml$|journal-sitemap\.xml$|tiktok\/callback(?:\/|$))/.test(url.pathname)) return null;
  const path = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  return [path, `${path}.html`, `${path.replace(/\/$/, '')}/index.html`];
}
async function isFile(path) {
  try { return (await stat(join(root, path))).isFile(); } catch { return false; }
}
function baselineExists(path) {
  try { git('cat-file', '-e', `${baseline}:${path}`); return true; } catch { return false; }
}

test('static HTML introduces no broken internal links or missing local assets', async t => {
  const failures = [];
  const historical = [];
  for (const file of await htmlFiles()) {
    const path = relative(root, file).split(sep).join('/');
    let previous = '';
    try { previous = git('show', `${baseline}:${path}`).toString(); } catch { /* new page */ }
    const previousLinks = new Set(localLinks(previous));
    for (const link of localLinks(await readFile(file, 'utf8'))) {
      const paths = candidates(file, link);
      if (!paths || (await Promise.all(paths.map(isFile))).some(Boolean)) continue;
      // Preserve the old site without silently expanding this refactor to unrelated legacy defects.
      if (previousLinks.has(link) && !paths.some(baselineExists)) historical.push(`${path}: ${link}`);
      else failures.push(`${path}: ${link}`);
    }
  }
  if (historical.length) t.diagnostic(`Pre-existing unresolved links (${new Set(historical).size}), unchanged by this refactor: ${[...new Set(historical)].join('; ')}`);
  assert.deepEqual([...new Set(failures)], [], 'Broken internal links / assets introduced by this refactor');
});
