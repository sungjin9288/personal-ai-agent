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

const LIB_IMPORT_PATTERN = /from\s+['"]\.\/(lib\/[\w-]+\.js)['"]/g;

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
export function extractServedLibModulePaths(appJsText) {
  const paths = [];
  const seen = new Set();
  let match;
  while ((match = LIB_IMPORT_PATTERN.exec(appJsText)) !== null) {
    const relativePath = match[1];
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
  const libModulePaths = extractServedLibModulePaths(appJsText);
  const libTexts = await Promise.all(
    libModulePaths.map((relativePath) => fetchTextOrThrow(`${baseUrl}/${relativePath}`)),
  );
  return [appJsText, ...libTexts].join('\n');
}
