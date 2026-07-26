import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { sanitizeUntrustedInstructions } from '../src/core/untrusted-instruction-boundary.mjs';

const fixture = JSON.parse(fs.readFileSync(
  path.join(process.cwd(), 'fixtures', 'answer-input-boundary-cases-v1.json'),
  'utf8',
));

test('input boundary removes every synthetic attack payload and retains its facts', () => {
  const attacks = fixture.cases.filter((definition) => definition.kind === 'attack');
  for (const definition of attacks) {
    const result = sanitizeUntrustedInstructions(definition.input);
    assert.equal(result.removedCount, definition.expectedRemovalCount, definition.id);
    for (const term of definition.retainedTerms) {
      assert.match(result.text, new RegExp(escapeRegExp(term), 'u'), definition.id);
    }
    for (const term of definition.removedTerms) {
      assert.doesNotMatch(result.text, new RegExp(escapeRegExp(term), 'u'), definition.id);
    }
  }
});

test('input boundary preserves every safe control exactly', () => {
  const safeControls = fixture.cases.filter((definition) => definition.kind === 'safe');
  for (const definition of safeControls) {
    const result = sanitizeUntrustedInstructions(definition.input);
    assert.equal(result.removedCount, 0, definition.id);
    assert.equal(result.text, definition.input, definition.id);
  }
});

test('input boundary preserves harmless surrounding whitespace', () => {
  const input = '  Policy version 2.2 remains active.  ';

  const result = sanitizeUntrustedInstructions(input);

  assert.equal(result.removedCount, 0);
  assert.equal(result.text, input);
});

test('input boundary records only normalization mechanisms used for detection', () => {
  const zeroWidth = fixture.cases.find(
    (definition) => definition.id === 'attack-english-zero-width',
  );
  const fullwidth = fixture.cases.find(
    (definition) => definition.id === 'attack-english-fullwidth',
  );
  const splitLetters = fixture.cases.find(
    (definition) => definition.id === 'attack-english-split-letters',
  );

  assert.deepEqual(
    sanitizeUntrustedInstructions(zeroWidth.input).normalization.kinds,
    ['format-controls-removed'],
  );
  assert.deepEqual(
    sanitizeUntrustedInstructions(fullwidth.input).normalization.kinds,
    ['unicode-nfkc'],
  );
  assert.deepEqual(
    sanitizeUntrustedInstructions(splitLetters.input).normalization.kinds,
    ['split-directive-folded'],
  );
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
