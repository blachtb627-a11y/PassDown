// Expo's static web export (without expo-router) emits domain-root-absolute
// asset paths ("/assets/...", "/_expo/...", "/favicon.ico"). That's correct for
// a site served at a domain root, but GitHub Pages serves this project from
// "https://<user>.github.io/PassDown/", a subpath — so every absolute path
// needs the "/PassDown" prefix, or the browser looks for assets one level too
// high and the page loads blank. This runs once after `expo export --platform web`.
const fs = require('fs');
const path = require('path');

const BASE_PATH = '/PassDown';
const DIST_DIR = path.join(__dirname, '..', 'dist');

function rewriteFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  fs.writeFileSync(filePath, content);
}

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
