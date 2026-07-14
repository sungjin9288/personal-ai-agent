import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createReleaseVerificationFlow,
  renderReleaseVerificationFlow,
} from '../src/web/public/lib/release-verification-flow.js';

test('verification flow prefers closure requirements and keeps the claim boundary explicit', () => {
  const flow = createReleaseVerificationFlow({
    closureVerification: {
      productionReadyClaimAllowed: false,
      requiredCommands: [{ command: 'npm run target:verify', kind: 'target', label: 'Target verify' }],
      requiredEvidenceDocs: [{ href: '/target', label: 'Target evidence', path: 'docs/target.md' }],
      requiredProofs: ['approved target proof', 'reviewer decision'],
      targetBoundaryRequired: true,
    },
    commands: [{ command: 'npm run fallback', label: 'Fallback' }],
    evidenceDocs: [{ href: '/fallback', label: 'Fallback evidence' }],
    id: 'blocker-target',
  });

  assert.deepEqual(flow, {
    blockerId: 'blocker-target',
    command: { command: 'npm run target:verify', kind: 'target', label: 'Target verify' },
    evidenceDoc: { href: '/target', label: 'Target evidence', path: 'docs/target.md' },
    nextEvidence: 'approved target proof',
    productionReadyClaimAllowed: false,
    requiredProofCount: 2,
    targetBoundaryRequired: true,
  });
});

test('verification flow uses the blocker action and a provider fallback command without inventing evidence', () => {
  const blockerFlow = createReleaseVerificationFlow({
    commands: [{ command: 'npm run blocker', label: 'Blocker gate' }],
    evidenceDocs: [{ href: '/blocker', path: 'docs/blocker.md' }],
    nextEvidence: 'capture blocker evidence',
  });
  const fallbackFlow = createReleaseVerificationFlow(null, {
    fallbackCommand: { command: 'npm run preflight:provider', kind: 'preflight', label: 'Provider preflight' },
  });

  assert.equal(blockerFlow.command.command, 'npm run blocker');
  assert.equal(blockerFlow.nextEvidence, 'capture blocker evidence');
  assert.equal(blockerFlow.productionReadyClaimAllowed, null);
  assert.equal(fallbackFlow.command.command, 'npm run preflight:provider');
  assert.equal(fallbackFlow.nextEvidence, '');
  assert.equal(fallbackFlow.evidenceDoc, null);
});

test('verification flow renderer escapes evidence and exposes copy actions in the same ordered surface', () => {
  const commandCalls = [];
  const linkCalls = [];
  const html = renderReleaseVerificationFlow({
    actionLabel: 'OpenAI <target>',
    context: 'provider:openai',
    flow: createReleaseVerificationFlow({
      closureVerification: {
        productionReadyClaimAllowed: false,
        targetBoundaryRequired: true,
      },
      commands: [{ command: 'npm run verify', label: 'Verify' }],
      evidenceDocs: [{ href: '/evidence', label: 'Evidence', path: 'docs/evidence.md' }],
      nextEvidence: 'capture <approved> proof',
    }),
    renderCommandCopyButton(options) {
      commandCalls.push(options);
      return '<button data-command-copy="true"></button>';
    },
    renderLinkCopyButton(options) {
      linkCalls.push(options);
      return '<button data-link-copy="true"></button>';
    },
  });

  assert.match(html, /data-release-verification-flow="provider:openai"/);
  assert.match(html, /1 · 필요한 증적/);
  assert.match(html, /2 · 다음 검증/);
  assert.match(html, /3 · claim blocked/);
  assert.match(html, /capture &lt;approved&gt; proof/);
  assert.doesNotMatch(html, /capture <approved> proof/);
  assert.equal(commandCalls[0].command, 'npm run verify');
  assert.equal(linkCalls[0].value, '/evidence');
});

test('verification flow renderer states when closure requires more than one proof', () => {
  const html = renderReleaseVerificationFlow({
    flow: createReleaseVerificationFlow({
      closureVerification: {
        requiredProofs: ['provider response', 'reviewer decision'],
      },
    }),
  });

  assert.match(html, /1 · 필요한 증적 2개/);
  assert.match(html, /claim unverified/);
});
