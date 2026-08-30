// Expo's static web export (without expo-router) emits domain-root-absolute
// asset paths ("/assets/...", "/_expo/...", "/favicon.ico"). That's correct when
// the site is served from a domain's root — which is the case now that PassDown
// has its own custom domain (passdown.it.com) instead of living under the
// "/PassDown/" subpath GitHub Pages used for the old github.io project URL.
// BASE_PATH stays here (empty by default) in case that ever changes again.
//
// This script also patches dist/ so deep links (e.g. a shared recipe's
// "/recipe/<id>" URL) survive a hard page load on GitHub Pages — see
// writeSpaFallback404() below for why that needs a workaround at all.
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

// GitHub Pages only serves the exact files it's given — there's no server-side
// router to fall back to index.html for a path like "/recipe/<id>", so a hard
// load of a shared recipe link (exactly what happens when someone taps it in
// iMessage) 404s before the app ever boots. The standard workaround: GitHub
// Pages *does* serve a custom 404.html for any unmatched path, so 404.html
// repackages that path into a query string and redirects to "/", and a tiny
// inline script (added to index.html, running before the app bundle) unpacks
// it back into the address bar via history.replaceState. From there the app's
// own DeepLinkHandler reads the restored URL normally.
function writeSpaFallback404() {
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>PassDown</title>
    <script>
      var target = location.pathname + location.search + location.hash;
      location.replace('/?redirect=' + encodeURIComponent(target));
    </script>
  </head>
  <body></body>
</html>
`;
  fs.writeFileSync(path.join(DIST_DIR, '404.html'), html);
}

function injectRedirectRestoreScript() {
  const indexHtmlPath = path.join(DIST_DIR, 'index.html');
  const restoreScript =
    '<script>(function(){var p=new URLSearchParams(location.search).get("redirect");' +
    'if(p){history.replaceState(null,"",p);}})();</script>';
  rewriteFile(indexHtmlPath, [[/<head>/, `<head>\n    ${restoreScript}`]]);
}

writeSpaFallback404();
injectRedirectRestoreScript();
console.log('Wrote dist/404.html and injected the redirect-restore script into dist/index.html.');
