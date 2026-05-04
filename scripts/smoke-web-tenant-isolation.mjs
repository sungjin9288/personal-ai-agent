import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-web-tenant-isolation-'));
const workspaceAPath = path.join(tempRoot, 'tenant-a-workspace');
fs.mkdirSync(workspaceAPath, { recursive: true });

const issuer = 'https://issuer.example.test';
const audience = 'personal-ai-agent-web';
const kid = 'personal-ai-agent-tenant-smoke-key';
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

const tenantAAdminToken = signJwt({ role: 'admin', tenantId: 'tenant-a', subject: 'tenant-a-admin' });
const tenantAOperatorToken = signJwt({ role: 'operator', tenantId: 'tenant-a', subject: 'tenant-a-operator' });
const tenantBAdminToken = signJwt({ role: 'admin', tenantId: 'tenant-b', subject: 'tenant-b-admin' });

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
    PERSONAL_AI_AGENT_TENANT_CLAIM: 'tenant_id',
    PERSONAL_AI_AGENT_TENANT_MODE: 'enforce',
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
  await waitForServer(baseUrl, serverProcess, serverOutput, tenantAAdminToken);

  const meta = await fetchJson(`${baseUrl}/api/meta`, {
    headers: { authorization: `Bearer ${tenantAAdminToken}` },
  });
  assert.equal(meta.tenant.mode, 'enforce');
  assert.equal(meta.tenant.claim, 'tenant_id');

  const workspaceA = await fetchJson(`${baseUrl}/api/workspaces`, {
    body: JSON.stringify({
      name: 'tenant-a-workspace',
      workspacePath: workspaceAPath,
    }),
    headers: {
      authorization: `Bearer ${tenantAAdminToken}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  });
  assert.equal(workspaceA.created, true);
  assert.equal(workspaceA.workspace.tenantId, 'tenant-a');

  const tenantAWorkspaces = await fetchJson(`${baseUrl}/api/workspaces`, {
    headers: { authorization: `Bearer ${tenantAAdminToken}` },
  });
  assert.equal(tenantAWorkspaces.workspaces.length, 1);
  assert.equal(tenantAWorkspaces.workspaces[0].id, workspaceA.workspace.id);

  const tenantBWorkspaces = await fetchJson(`${baseUrl}/api/workspaces`, {
    headers: {
      authorization: `Bearer ${tenantBAdminToken}`,
      'x-personal-ai-agent-tenant': 'tenant-a',
    },
  });
  assert.equal(tenantBWorkspaces.workspaces.length, 0);

  const tenantBMissionCreate = await fetchJson(
    `${baseUrl}/api/missions`,
    {
      body: JSON.stringify({
        mode: 'knowledge',
        objective: 'tenant b must not create missions in tenant a workspace.',
        title: 'Tenant B blocked mission',
        workspaceId: workspaceA.workspace.id,
      }),
      headers: {
        authorization: `Bearer ${tenantBAdminToken}`,
        'content-type': 'application/json',
        'x-personal-ai-agent-tenant': 'tenant-a',
      },
      method: 'POST',
    },
    { expectOk: false },
  );
  assert.equal(tenantBMissionCreate.status, 403);
  assert.equal(tenantBMissionCreate.body.error, 'tenant-forbidden');

  const tenantAMission = await fetchJson(`${baseUrl}/api/missions`, {
    body: JSON.stringify({
      mode: 'knowledge',
      objective: 'tenant a can create a mission in its own workspace.',
      title: 'Tenant A mission',
      workspaceId: workspaceA.workspace.id,
    }),
    headers: {
      authorization: `Bearer ${tenantAOperatorToken}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  });
  assert.equal(tenantAMission.mission.workspaceId, workspaceA.workspace.id);

  const tenantAMissions = await fetchJson(`${baseUrl}/api/missions`, {
    headers: { authorization: `Bearer ${tenantAOperatorToken}` },
  });
  assert.equal(tenantAMissions.missions.length, 1);
  assert.equal(tenantAMissions.missions[0].mission.id, tenantAMission.mission.id);

  const tenantBMissions = await fetchJson(`${baseUrl}/api/missions`, {
    headers: { authorization: `Bearer ${tenantBAdminToken}` },
  });
  assert.equal(tenantBMissions.missions.length, 0);

  const tenantBShowMission = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(tenantAMission.mission.id)}`,
    {
      headers: {
        authorization: `Bearer ${tenantBAdminToken}`,
        'x-personal-ai-agent-tenant': 'tenant-a',
      },
    },
    { expectOk: false },
  );
  assert.equal(tenantBShowMission.status, 403);
  assert.equal(tenantBShowMission.body.error, 'tenant-forbidden');

  console.log(
    JSON.stringify(
      {
        mode: 'web-tenant-isolation',
        ok: true,
        port,
        tenantChecks: {
          tenantAMissionCreated: true,
          tenantBListFiltered: true,
          tenantBMissionCreateBlocked: true,
          tenantBShowMissionBlocked: true,
          tenantHeaderSpoofIgnored: true,
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

function signJwt({ role, subject, tenantId }) {
  const claims = {
    aud: audience,
    exp: nowSeconds + 600,
    iat: nowSeconds,
    iss: issuer,
    role,
    sub: subject,
    tenant_id: tenantId,
  };
  const header = {
    alg: 'RS256',
    kid,
    typ: 'JWT',
  };
  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(claims)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${signer.sign(privateKey).toString('base64url')}`;
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
