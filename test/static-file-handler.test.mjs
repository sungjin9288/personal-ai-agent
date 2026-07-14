import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { createStaticFileHandler, getContentType } from '../src/web/static-file-handler.mjs';

function createFixture(t) {
  const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'static-file-handler-'));
  fs.mkdirSync(path.join(publicDir, 'lib'));
  fs.writeFileSync(path.join(publicDir, 'index.html'), '<h1>Console</h1>\n');
  fs.writeFileSync(path.join(publicDir, 'lib', 'app.js'), 'export const ready = true;\n');
  fs.mkdirSync(path.join(publicDir, 'directory'));
  t.after(() => fs.rmSync(publicDir, { force: true, recursive: true }));

  const sent = [];
  const handler = createStaticFileHandler({
    publicDir,
    sendFile(response, status, body, contentType) {
      sent.push({ body, contentType, response, status });
    },
    sendNotFound(response) {
      sent.push({ response, status: 404 });
    },
  });

  return { handler, publicDir, sent };
}

test('static root and nested modules resolve only inside the public directory', (t) => {
  const { handler, publicDir } = createFixture(t);
  const publicRoot = fs.realpathSync(publicDir);

  assert.equal(handler.resolveStaticFile('/'), path.join(publicRoot, 'index.html'));
  assert.equal(handler.resolveStaticFile('/lib/app.js'), path.join(publicRoot, 'lib', 'app.js'));
  assert.equal(handler.resolveStaticFile('/directory'), null);
  assert.equal(handler.resolveStaticFile('/missing.js'), null);
  assert.equal(handler.resolveStaticFile('/../package.json'), null);
});

test('static symlinks cannot expose files outside the public directory', (t) => {
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'static-file-handler-outside-'));
  const outsideFile = path.join(outsideDir, 'secret.txt');
  const { handler, publicDir } = createFixture(t);
  fs.writeFileSync(outsideFile, 'not public\n');
  fs.symlinkSync(outsideFile, path.join(publicDir, 'outside.txt'));
  t.after(() => fs.rmSync(outsideDir, { force: true, recursive: true }));

  assert.equal(handler.resolveStaticFile('/outside.txt'), null);
});

test('static files keep their content type and missing files use the existing 404 sender', (t) => {
  const { handler, sent } = createFixture(t);
  const response = {};

  handler.serveStatic(response, '/lib/app.js');
  handler.serveStatic(response, '/missing.js');

  assert.equal(sent[0].status, 200);
  assert.equal(sent[0].contentType, 'application/javascript; charset=utf-8');
  assert.equal(sent[0].body.toString('utf8'), 'export const ready = true;\n');
  assert.deepEqual(sent[1], { response, status: 404 });
});

test('known extensions preserve the server content type contract', () => {
  assert.equal(getContentType('app.js'), 'application/javascript; charset=utf-8');
  assert.equal(getContentType('styles.css'), 'text/css; charset=utf-8');
  assert.equal(getContentType('index.html'), 'text/html; charset=utf-8');
  assert.equal(getContentType('report.json'), 'application/json; charset=utf-8');
  assert.equal(getContentType('notes.md'), 'text/markdown; charset=utf-8');
  assert.equal(getContentType('proof.png'), 'image/png');
  assert.equal(getContentType('robots.txt'), 'text/plain; charset=utf-8');
});
