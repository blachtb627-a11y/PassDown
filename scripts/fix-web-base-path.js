// Expo's static web export (without expo-router) emits domain-root-absolute
// asset paths ("/assets/...", "/_expo/...", "/favicon.ico"). That's correct when
// the site is served from a domain's root — which is the case now that PassDown
// has its own custom domain (passdown.it.com) instead of living under the
// "/PassDown/" subpath GitHub Pages used for the old github.io project URL.
// BASE_PATH stays here (empty by default) in case that ever changes again.
const fs = require('fs');
const path = require('path');

const BASE_PATH = '';
const DIST_DIR = path.join(__dirname, '..', 'dist');

function rewriteFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  fs.writeFileSync(filePath, content);
}

if (BASE_PATH) {
  const indexHtmlPath = path.join(DIST_DIR, 'index.html');
  rewriteFile(indexHtmlPath, [
    [/href="\/favicon\.ico"/g, `href="${BASE_PATH}/favicon.ico"`],
    [/src="\/_expo\//g, `src="${BASE_PATH}/_expo/`],
  ]);

  const jsDir = path.join(DIST_DIR, '_expo', 'static', 'js', 'web');
  for (const file of fs.readdirSync(jsDir)) {
    if (!file.endsWith('.js')) continue;
    rewriteFile(path.join(jsDir, file), [[/"\/assets\//g, `"${BASE_PATH}/assets/`]]);
  }
  console.log(`Rewrote dist/ asset paths for base path "${BASE_PATH}".`);
} else {
  console.log('BASE_PATH is empty — dist/ already uses domain-root paths, nothing to rewrite.');
}
