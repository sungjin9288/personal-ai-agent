import fs from 'node:fs';
import path from 'node:path';

import { resolveWithinRoot } from './path-guard.mjs';

export function getContentType(filePath) {
  if (filePath.endsWith('.js')) {
    return 'application/javascript; charset=utf-8';
  }
  if (filePath.endsWith('.css')) {
    return 'text/css; charset=utf-8';
  }
  if (filePath.endsWith('.html')) {
    return 'text/html; charset=utf-8';
  }
  if (filePath.endsWith('.json')) {
    return 'application/json; charset=utf-8';
  }
  if (filePath.endsWith('.md')) {
    return 'text/markdown; charset=utf-8';
  }
  if (filePath.endsWith('.png')) {
    return 'image/png';
  }
  return 'text/plain; charset=utf-8';
}

export function createStaticFileHandler({
  publicDir,
  sendFile,
  sendNotFound,
  fileSystem = fs,
}) {
  const publicRoot = fileSystem.realpathSync(publicDir);

  function resolveStaticFile(pathname) {
    const relativePath = pathname === '/' ? 'index.html' : String(pathname || '').replace(/^\/+/, '');
    const filePath = resolveWithinRoot(publicRoot, path.resolve(publicRoot, relativePath));

    if (!filePath || !fileSystem.existsSync(filePath) || fileSystem.statSync(filePath).isDirectory()) {
      return null;
    }

    const realFilePath = fileSystem.realpathSync(filePath);
    if (!resolveWithinRoot(publicRoot, realFilePath)) {
      return null;
    }

    return filePath;
  }

  function serveStatic(response, pathname) {
    const filePath = resolveStaticFile(pathname);
    if (!filePath) {
      sendNotFound(response);
      return;
    }

    sendFile(response, 200, fileSystem.readFileSync(filePath), getContentType(filePath));
  }

  return {
    resolveStaticFile,
    serveStatic,
  };
}
