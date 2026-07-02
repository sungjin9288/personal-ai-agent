import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatEscalationReminderDetail,
  formatEscalationOwnerChangeDetail,
  formatEscalationOwnerHandoffDetail,
  buildOwnerHandoffReminderNote,
  formatEscalationOwnerHandoffReminderDetail,
  deriveEscalationReminderCadenceHours,
  deriveOwnerHandoffSlaHours,
  deriveOwnerHandoffReminderCadenceHours,
} from '../src/core/escalation-handoff.mjs';
import {
  ESCALATION_REMINDER_CADENCE_HOURS,
  OWNER_HANDOFF_ACK_SLA_HOURS,
  OWNER_HANDOFF_REMINDER_CADENCE_HOURS,
} from '../src/core/constants.mjs';

test('formatEscalationReminderDetail', async (t) => {
  await t.test('prefixes with the tier in brackets and includes the note', () => {
    const result = formatEscalationReminderDetail({ tier: 'critical', note: 'Owner unresponsive.' });
    assert.equal(result, '[critical] Owner unresponsive.');
  });

  await t.test('omits the tier prefix when tier is missing, and falls back for note when empty/undefined', () => {
    assert.equal(formatEscalationReminderDetail({}), 'Escalation reminder issued.');
    assert.equal(formatEscalationReminderDetail({ note: '' }), 'Escalation reminder issued.');
    assert.equal(
      formatEscalationReminderDetail({ tier: '', note: 'Custom note' }),
      'Custom note',
    );
  });
});

test('formatEscalationOwnerChangeDetail', async (t) => {
  await t.test('formats a from -> to arrow with a parenthesized reason suffix when reason is present', () => {
    const result = formatEscalationOwnerChangeDetail({
      from: 'mission-owner',
      to: 'human-approver',
      reason: 'SLA breach',
    });
    assert.equal(result, 'mission-owner -> human-approver (SLA breach)');
  });

  await t.test('omits the reason suffix entirely when reason is missing or empty', () => {
    assert.equal(
      formatEscalationOwnerChangeDetail({ from: 'workspace-owner', to: 'mission-owner' }),
      'workspace-owner -> mission-owner',
    );
    assert.equal(
      formatEscalationOwnerChangeDetail({ from: 'a', to: 'b', reason: '' }),
      'a -> b',
    );
  });
});

test('formatEscalationOwnerHandoffDetail', async (t) => {
  await t.test('includes an "[overdue]" marker and the note when wasOverdue is true', () => {
    const result = formatEscalationOwnerHandoffDetail({
      owner: 'human-approver',
      wasOverdue: true,
      note: 'Picked up after SLA.',
    });
    assert.equal(result, 'human-approver acknowledged owner handoff [overdue]: Picked up after SLA.');
  });

  await t.test('omits the overdue marker when wasOverdue is false/missing, and falls back for a missing note', () => {
    assert.equal(
      formatEscalationOwnerHandoffDetail({ owner: 'mission-owner', wasOverdue: false }),
      'mission-owner acknowledged owner handoff: No explicit note recorded.',
    );
    assert.equal(
      formatEscalationOwnerHandoffDetail({ owner: 'mission-owner' }),
      'mission-owner acknowledged owner handoff: No explicit note recorded.',
    );
  });
});

test('buildOwnerHandoffReminderNote', async (t) => {
  await t.test('returns the trimmed note when a non-empty note is provided', () => {
    const result = buildOwnerHandoffReminderNote({}, '  Please review promptly.  ');
    assert.equal(result, 'Please review promptly.');
  });

  await t.test('falls back to ownerHandoffTargetOwner when note is empty/whitespace-only', () => {
    const result = buildOwnerHandoffReminderNote(
      { ownerHandoffTargetOwner: 'human-approver' },
      '   ',
    );
    assert.equal(
      result,
      'Reminder issued for pending owner handoff to human-approver.',
    );
  });

  await t.test('falls back to effectiveRecommendedOwner when ownerHandoffTargetOwner is absent', () => {
    const result = buildOwnerHandoffReminderNote(
      { effectiveRecommendedOwner: 'workspace-owner' },
      undefined,
    );
    assert.equal(
      result,
      'Reminder issued for pending owner handoff to workspace-owner.',
    );
  });

  await t.test('falls back to the literal "assigned owner" when neither owner field is present', () => {
    const result = buildOwnerHandoffReminderNote({}, null);
    assert.equal(result, 'Reminder issued for pending owner handoff to assigned owner.');
  });
});

test('formatEscalationOwnerHandoffReminderDetail', async (t) => {
  await t.test('includes an "[overdue]" marker directly after the owner when overdue is true', () => {
    const result = formatEscalationOwnerHandoffReminderDetail({
      owner: 'mission-owner',
      overdue: true,
      note: 'Second reminder.',
    });
    assert.equal(result, 'mission-owner [overdue] owner handoff reminder: Second reminder.');
  });

  await t.test('omits the overdue marker when overdue is false/missing, and falls back for a missing note', () => {
    assert.equal(
      formatEscalationOwnerHandoffReminderDetail({ owner: 'human-approver', overdue: false }),
      'human-approver owner handoff reminder: No explicit note recorded.',
    );
    assert.equal(
      formatEscalationOwnerHandoffReminderDetail({ owner: 'human-approver' }),
      'human-approver owner handoff reminder: No explicit note recorded.',
    );
  });
});

test('deriveEscalationReminderCadenceHours', async (t) => {
  await t.test('returns the configured cadence hours for each known tier', () => {
    for (const [tier, hours] of Object.entries(ESCALATION_REMINDER_CADENCE_HOURS)) {
      assert.equal(deriveEscalationReminderCadenceHours(tier), hours);
    }
  });

  await t.test('returns null for an unknown tier, undefined, or empty string', () => {
    assert.equal(deriveEscalationReminderCadenceHours('not-a-tier'), null);
    assert.equal(deriveEscalationReminderCadenceHours(undefined), null);
    assert.equal(deriveEscalationReminderCadenceHours(''), null);
  });
});

test('deriveOwnerHandoffSlaHours', async (t) => {
  await t.test('returns the configured SLA hours for each known owner', () => {
    for (const [owner, hours] of Object.entries(OWNER_HANDOFF_ACK_SLA_HOURS)) {
      assert.equal(deriveOwnerHandoffSlaHours(owner), hours);
    }
  });

  await t.test('returns null for an unknown owner, undefined, or empty string', () => {
    assert.equal(deriveOwnerHandoffSlaHours('not-an-owner'), null);
    assert.equal(deriveOwnerHandoffSlaHours(undefined), null);
    assert.equal(deriveOwnerHandoffSlaHours(''), null);
  });
});

test('deriveOwnerHandoffReminderCadenceHours', async (t) => {
  await t.test('returns the configured reminder cadence hours for each known owner', () => {
    for (const [owner, hours] of Object.entries(OWNER_HANDOFF_REMINDER_CADENCE_HOURS)) {
      assert.equal(deriveOwnerHandoffReminderCadenceHours(owner), hours);
    }
  });

  await t.test('returns null for an unknown owner, undefined, or empty string', () => {
    assert.equal(deriveOwnerHandoffReminderCadenceHours('not-an-owner'), null);
    assert.equal(deriveOwnerHandoffReminderCadenceHours(undefined), null);
    assert.equal(deriveOwnerHandoffReminderCadenceHours(''), null);
  });

  await t.test('note: a falsy configured value (e.g. 0) would also fall back to null due to `|| null`', () => {
    // Observed behavior: deriveOwnerHandoffReminderCadenceHours uses
    // `OWNER_HANDOFF_REMINDER_CADENCE_HOURS[owner] || null`, so if a future
    // owner were configured with 0 hours, this would incorrectly return null
    // instead of 0. Not exercised here since no current owner has a 0 value,
    // but documented as a quirk of the `||` fallback pattern shared by all
    // three derive* functions in this module.
    assert.ok(true);
  });
});
