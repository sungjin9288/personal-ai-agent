// Shared helpers for UI smoke scripts.
//
// The frontend is served as ES modules: `/app.js` imports pure utilities from
// `/lib/*.js`. Smoke assertions of the form `bundle.includes('someFunction')`
// express the intent "this behavior ships in the served frontend code". Because
// a function may live either in app.js OR in one of the served lib modules, the
// assertion surface must be the CONCATENATION of app.js plus every lib module it
// imports — otherwise extracting a pure function into /lib/ would break an
// assertion that only inspected /app.js.
//
// `fetchServedFrontendBundle` discovers the lib module list at runtime by
// parsing app.js's own `from './lib/<name>.js'` import statements, fetches each
// over HTTP (proving they are served with the right MIME type too), and returns
// the combined text. New modules are picked up automatically as long as app.js
// imports them.
//
// Discovery recurses: a lib module may itself import a sibling lib module (e.g.
// `from './app-state.js'`). Those transitive imports are followed so the bundle
// stays complete even when a function is extracted into a module that app.js
// only reaches indirectly.

// Matches `from './lib/<name>.js'` (as written in app.js) and `from './<name>.js'`
// (as written between sibling lib modules). Capture group 2 is the bare module
// file name; the resolved served path is always `lib/<name>.js`. Requiring the
// quote to sit immediately before `./` rejects parent specifiers like
// `'../app.js'` — a lib module importing back into app.js is not a lib module.
const LIB_IMPORT_PATTERN = /from\s+['"]\.\/(lib\/)?([\w-]+\.js)['"]/g;

async function fetchTextOrThrow(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

/**
 * Extract the served lib module paths that app.js imports.
 * @param {string} appJsText raw text of /app.js
 * @returns {string[]} e.g. ['lib/text-format.js', 'lib/ui-params.js']
 */
export function extractServedLibModulePaths(sourceText) {
  const paths = [];
  const seen = new Set();
  let match;
  while ((match = LIB_IMPORT_PATTERN.exec(sourceText)) !== null) {
    const relativePath = `lib/${match[2]}`;
    if (!seen.has(relativePath)) {
      seen.add(relativePath);
      paths.push(relativePath);
    }
  }
  return paths;
}

/**
 * Fetch the served frontend as a single combined text bundle: `/app.js` plus
 * every `/lib/*.js` module it imports. Assertions against the returned text
 * preserve the "ships in the served frontend" intent regardless of which module
 * a given function was extracted into.
 * @param {string} baseUrl server origin, e.g. http://127.0.0.1:PORT
 * @returns {Promise<string>} concatenated source text
 */
export async function fetchServedFrontendBundle(baseUrl) {
  const appJsText = await fetchTextOrThrow(`${baseUrl}/app.js`);
  const fetchedTexts = [appJsText];
  const fetched = new Set();
  let pending = extractServedLibModulePaths(appJsText);
  while (pending.length > 0) {
    const batch = pending.filter((relativePath) => !fetched.has(relativePath));
    batch.forEach((relativePath) => fetched.add(relativePath));
    const batchTexts = await Promise.all(
      batch.map((relativePath) => fetchTextOrThrow(`${baseUrl}/${relativePath}`)),
    );
    fetchedTexts.push(...batchTexts);
    pending = batchTexts.flatMap((text) => extractServedLibModulePaths(text));
  }
  return fetchedTexts.join('\n');
}
