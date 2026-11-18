#!/usr/bin/env node
// The preview address (decision 0206): a second build of the app, served beside it under <base>/preview/.
//
//   node scripts/preview-pages.js <dist> <previewDist> [base=/chronicles]
//
// Copies <previewDist> into <dist>/preview and makes app routes survive a reload there. GitHub Pages has no
// fallback for app routes: an unknown path gets <dist>/404.html, which is the app's own page. So:
//   - <dist>/404.html (the app's page) first sends any path under <base>/preview/ to the preview's own page,
//     remembering the path asked for;
//   - <dist>/preview/index.html puts that path back in the address bar before its app starts.
// Everything else about <dist> is left as it is. The two builds share the site's storage: the preview reads
// the phone's own walks.

const fs = require('fs');
const path = require('path');

const KEY = 'chronicles-preview-path';

/** `html` with an inline script as the first thing in its head, so it runs before the app's bundle. */
function withHeadScript(html, js) {
  const m = /<head[^>]*>/i.exec(html);
  if (!m) throw new Error('no <head> in the page');
  const at = m.index + m[0].length;
  return `${html.slice(0, at)}<script>${js}</script>${html.slice(at)}`;
}

/** The app's 404 page: a path under the preview goes to the preview's page, the path kept for it. */
const redirectJs = (base) =>
  `(function(){var p='${base}/preview/';if(location.pathname.indexOf(p)===0&&location.pathname!==p){try{sessionStorage.setItem('${KEY}',location.pathname+location.search+location.hash);}catch(e){}location.replace(p);}})();`;

/** The preview's own page: the path it was asked for goes back in the address bar before its app reads it. */
const restoreJs = () =>
  `(function(){try{var p=sessionStorage.getItem('${KEY}');if(p){sessionStorage.removeItem('${KEY}');history.replaceState(null,'',p);}}catch(e){}})();`;

function main(argv) {
  const [dist, previewDist, base = '/chronicles'] = argv;
  if (!dist || !previewDist) {
    console.error('usage: node scripts/preview-pages.js <dist> <previewDist> [base=/chronicles]');
    process.exit(64);
  }
  const index = path.join(dist, 'index.html');
  const previewIndex = path.join(previewDist, 'index.html');
  for (const f of [index, previewIndex]) {
    if (!fs.existsSync(f)) {
      console.error(`preview-pages: ${f} is missing`);
      process.exit(1);
    }
  }
  const out = path.join(dist, 'preview');
  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(previewDist, out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), withHeadScript(fs.readFileSync(previewIndex, 'utf8'), restoreJs()));
  fs.writeFileSync(path.join(dist, '404.html'), withHeadScript(fs.readFileSync(index, 'utf8'), redirectJs(base)));
  console.log(`preview-pages: ${previewDist} is served at ${base}/preview/`);
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { withHeadScript, redirectJs, restoreJs };
