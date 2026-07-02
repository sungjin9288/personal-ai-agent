import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createRuntimeHarness } from '../src/harness/runtime-harness.mjs';

// classifyRisk does not touch `store`, but createRuntimeHarness requires the
// param to be present as a destructured object; an empty stub is sufficient.
const { classifyRisk } = createRuntimeHarness({ store: {} });

test('classifyRisk', async (t) => {
  await t.test('no approval required for stub provider with explicit selection and no proposed action', () => {
    const result = classifyRisk({
      providerId: 'stub',
      explicitProviderSelection: true,
      executorOutput: {},
    });

    assert.deepEqual(result, {
      approvalRequired: false,
      kind: null,
      title: '',
      reason: '',
    });
  });

  await t.test('no approval required for stub provider with no explicit selection (stub is exempt)', () => {
    const result = classifyRisk({
      providerId: 'stub',
      explicitProviderSelection: false,
      executorOutput: {},
    });

    assert.equal(result.approvalRequired, false);
    assert.equal(result.kind, null);
  });

  await t.test('requires approval when executorOutput.proposedAction.requiresApproval is true', () => {
    const result = classifyRisk({
      providerId: 'stub',
      explicitProviderSelection: true,
      executorOutput: {
        proposedAction: {
          requiresApproval: true,
          title: 'Run destructive migration',
          reason: 'Drops a table.',
        },
      },
    });

    assert.equal(result.approvalRequired, true);
    assert.equal(result.kind, 'workspace_execution');
    assert.equal(result.title, 'Run destructive migration');
    assert.equal(result.reason, 'Drops a table.');
  });

  await t.test('requires approval when provider is non-stub and selection was not explicit', () => {
    const result = classifyRisk({
      providerId: 'anthropic',
      explicitProviderSelection: false,
      executorOutput: {},
    });

    assert.equal(result.approvalRequired, true);
    assert.equal(result.kind, 'provider_selection');
    assert.equal(result.title, 'Approve provider escalation for anthropic');
    assert.equal(
      result.reason,
      'Provider anthropic cannot run implicitly. Select it explicitly before external model use.',
    );
  });

  await t.test('no approval required when provider is non-stub but selection was explicit', () => {
    const result = classifyRisk({
      providerId: 'anthropic',
      explicitProviderSelection: true,
      executorOutput: {},
    });

    assert.equal(result.approvalRequired, false);
    assert.equal(result.kind, null);
    assert.equal(result.title, '');
    assert.equal(result.reason, '');
  });

  await t.test('combines both reasons when proposedAction requires approval AND provider needs explicit selection', () => {
    const result = classifyRisk({
      providerId: 'openai',
      explicitProviderSelection: false,
      executorOutput: {
        proposedAction: {
          requiresApproval: true,
          title: 'Run destructive migration',
          reason: 'Drops a table.',
        },
      },
    });

    assert.equal(result.approvalRequired, true);
    // kind is set by the proposedAction branch first, and the provider_selection
    // branch only backfills kind/title with `kind || ...` / `title || ...`,
    // so the workspace_execution branch's values win when both fire.
    assert.equal(result.kind, 'workspace_execution');
    assert.equal(result.title, 'Run destructive migration');
    assert.equal(
      result.reason,
      'Drops a table. Provider openai cannot run implicitly. Select it explicitly before external model use.',
    );
  });

  await t.test('treats missing executorOutput as no proposed action (optional chaining)', () => {
    const result = classifyRisk({
      providerId: 'stub',
      explicitProviderSelection: true,
      executorOutput: undefined,
    });

    assert.equal(result.approvalRequired, false);
  });

  await t.test('treats executorOutput without proposedAction as no proposed action', () => {
    const result = classifyRisk({
      providerId: 'stub',
      explicitProviderSelection: true,
      executorOutput: { someOtherField: true },
    });

    assert.equal(result.approvalRequired, false);
  });

  await t.test('proposedAction.requiresApproval === false does not trigger workspace_execution branch', () => {
    const result = classifyRisk({
      providerId: 'stub',
      explicitProviderSelection: true,
      executorOutput: {
        proposedAction: { requiresApproval: false, title: 'noop', reason: 'not needed' },
      },
    });

    assert.equal(result.approvalRequired, false);
    assert.equal(result.kind, null);
  });
});
