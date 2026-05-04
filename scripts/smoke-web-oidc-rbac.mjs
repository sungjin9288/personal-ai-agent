import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { evaluateOidcWebAuth, normalizeWebAuthMode } from '../src/core/web-auth-policy.mjs';
import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-web-oidc-rbac-'));
const issuer = 'https://issuer.example.test';
const audience = 'personal-ai-agent-web';
const kid = 'personal-ai-agent-smoke-key';
const nowSeconds = Math.floor(Date.now() / 1000);
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const publicJwk = {
  ...publicKey.export({ format: 'jwk' }),
  alg: 'RS256',
  kid,
  use: 'sig',
};

assert.equal(normalizeWebAuthMode('oidc'), 'oidc');
assert.equal(normalizeWebAuthMode('jwks'), 'oidc');

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', repoDir, '--name', 'web-oidc-rbac-workspace'],
});

const jwksPort = await getFreePort();
const jwksServer = http.createServer((request, response) => {
  if (request.url === '/.well-known/jwks.json') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ keys: [publicJwk] }));
    return;
  }
  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'not-found' }));
});
await listen(jwksServer, jwksPort);
const jwksUrl = `http://127.0.0.1:${jwksPort}/.well-known/jwks.json`;

const operatorToken = signJwt({
  claims: {
    aud: audience,
    exp: nowSeconds + 600,
    iat: nowSeconds,
    iss: issuer,
    role: 'operator',
    sub: 'operator-user',
  },
  kid,
  privateKey,
});
const viewerToken = signJwt({
  claims: {
    aud: audience,
    exp: nowSeconds + 600,
    iat: nowSeconds,
    iss: issuer,
    role: 'viewer',
    sub: 'viewer-user',
  },
  kid,
  privateKey,
});
const wrongAudienceToken = signJwt({
  claims: {
    aud: 'wrong-audience',
    exp: nowSeconds + 600,
    iat: nowSeconds,
    iss: issuer,
    role: 'operator',
    sub: 'operator-user',
  },
  kid,
  privateKey,
});

const directAuth = await evaluateOidcWebAuth({
  audience,
  authorizationHeader: `Bearer ${operatorToken}`,
  issuer,
  jwksUrl,
});
assert.equal(directAuth.allowed, true);
assert.equal(directAuth.role, 'operator');
assert.equal(directAuth.subject, 'operator-user');
assert.equal(
  (
    await evaluateOidcWebAuth({
      audience,
      authorizationHeader: `Bearer ${wrongAudienceToken}`,
      issuer,
      jwksUrl,
    })
  ).error,
  'auth-token-invalid',
);

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const serverOutput = { stderr: '', stdout: '' };

const serverProcess = spawn(process.execPath, [serverEntry], {
  cwd: repoDir,
  env: {
    ...process.env,
    PERSONAL_AI_AGENT_OIDC_AUDIENCE: audience,
    PERSONAL_AI_AGENT_OIDC_ISSUER: issuer,
    PERSONAL_AI_AGENT_OIDC_JWKS_URL: jwksUrl,
    PERSONAL_AI_AGENT_OIDC_ROLE_CLAIM: 'role',
    PERSONAL_AI_AGENT_RBAC_MODE: 'enforce',
    PERSONAL_AI_AGENT_ROOT: tempRoot,
    PERSONAL_AI_AGENT_UI_HOST: '127.0.0.1',
    PERSONAL_AI_AGENT_UI_PORT: String(port),
    PERSONAL_AI_AGENT_WEB_AUTH_MODE: 'oidc',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

serverProcess.stdout.on('data', (chunk) => {
  serverOutput.stdout += String(chunk);
});

serverProcess.stderr.on('data', (chunk) => {
  serverOutput.stderr += String(chunk);
});

try {
  await waitForServer(baseUrl, serverProcess, serverOutput, operatorToken);

  const unauthenticatedHealth = await fetchJson(`${baseUrl}/api/health`, {}, { expectOk: false });
  assert.equal(unauthenticatedHealth.status, 401);
  assert.equal(unauthenticatedHealth.body.error, 'auth-token-required');

  const invalidAudienceHealth = await fetchJson(
    `${baseUrl}/api/health`,
    { headers: { authorization: `Bearer ${wrongAudienceToken}` } },
    { expectOk: false },
  );
  assert.equal(invalidAudienceHealth.status, 401);
  assert.equal(invalidAudienceHealth.body.error, 'auth-token-invalid');

  const meta = await fetchJson(`${baseUrl}/api/meta`, {
    headers: { authorization: `Bearer ${operatorToken}` },
  });
  assert.equal(meta.webAuth.mode, 'oidc');
  assert.equal(meta.webAuth.required, true);
  assert.equal(meta.webAuth.roleClaim, 'role');
  assert.equal(JSON.stringify(meta).includes(operatorToken), false);

  const viewerCannotSpoofOperator = await fetchJson(
    `${baseUrl}/api/missions`,
    {
      body: JSON.stringify({
        mode: 'knowledge',
        objective: 'viewer token should not escalate through role header spoofing.',
        title: 'OIDC viewer spoof blocked mission',
        workspaceId: workspace.id,
      }),
      headers: {
        authorization: `Bearer ${viewerToken}`,
        'content-type': 'application/json',
        'x-personal-ai-agent-role': 'operator',
      },
      method: 'POST',
    },
    { expectOk: false },
  );
  assert.equal(viewerCannotSpoofOperator.status, 403);
  assert.equal(viewerCannotSpoofOperator.body.error, 'rbac-forbidden');
  assert.equal(viewerCannotSpoofOperator.body.rbac.role, 'viewer');

  const operatorMission = await fetchJson(`${baseUrl}/api/missions`, {
    body: JSON.stringify({
      mode: 'knowledge',
      objective: 'operator claim can create a mission without role header.',
      title: 'OIDC operator mission',
      workspaceId: workspace.id,
    }),
    headers: {
      authorization: `Bearer ${operatorToken}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  });
  assert.equal(operatorMission.mission.status, 'created');

  console.log(
    JSON.stringify(
      {
        authMode: 'oidc',
        mode: 'web-oidc-rbac',
        ok: true,
        port,
        roleChecks: {
          invalidAudienceBlocked: true,
          missingTokenBlocked: true,
          operatorClaimCreatedMission: true,
          viewerHeaderSpoofBlocked: true,
        },
      },
      null,
      2,
    ),
  );
} finally {
  if (!serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
  await waitForExit(serverProcess);
  await closeServer(jwksServer);
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function signJwt({ claims, kid: keyId, privateKey: signingKey }) {
  const header = {
    alg: 'RS256',
    kid: keyId,
    typ: 'JWT',
  };
  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(claims)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${signer.sign(signingKey).toString('base64url')}`;
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(address.port);
      });
    });
  });
}

async function listen(server, port) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
}

async function closeServer(server) {
  if (!server.listening) {
    return;
  }
  await new Promise((resolve) => server.close(resolve));
}

async function waitForServer(baseUrl, child, output, token) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`UI server exited early: ${child.exitCode}\n${output.stderr || output.stdout}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the server starts listening.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`UI server did not start on ${baseUrl}\n${output.stderr || output.stdout}`);
}

async function fetchJson(url, init = {}, { expectOk = true } = {}) {
  const response = await fetch(url, init);
  const body = await response.json();
  if (expectOk && !response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}: ${JSON.stringify(body)}`);
  }
  if (!expectOk) {
    return {
      body,
      status: response.status,
    };
  }
  return body;
}

async function waitForExit(child) {
  if (child.exitCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    child.once('exit', resolve);
    setTimeout(resolve, 1000);
  });
}
