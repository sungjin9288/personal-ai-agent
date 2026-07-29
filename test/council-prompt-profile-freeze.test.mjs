import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FROZEN_COUNCIL_PROMPT_PROFILES, assertFrozenCouncilPromptProfiles } from '../src/core/council-prompt-profile-freeze.mjs';

const expected = FROZEN_COUNCIL_PROMPT_PROFILES;

test('v1 through v5 freeze every opening, rebuttal, and chair prompt byte and hash', () => {
  assert.deepEqual(Object.keys(expected), ['seat-scoped-v1', 'seat-scoped-v2', 'seat-scoped-v3', 'seat-scoped-v4', 'seat-scoped-v5']);
  assertFrozenCouncilPromptProfiles();
});
