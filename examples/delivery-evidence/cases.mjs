import { createHash } from 'node:crypto';

function packet() {
  const criterion = '담당자와 관리자가 모두 승인해야 한다.';
  return {
    schemaVersion: 'delivery-evidence-input/v1',
    target: { projectId: 'purchasing', sourceRevision: 'a'.repeat(40) },
    requirements: [{
      id: 'REQ-1', criterion, mappingConfirmed: true,
      checks: [{ id: 'approval-suite', definitionDigest: 'b'.repeat(64), environmentId: 'node24-local' }],
    }],
    evidence: [{
      id: 'EV-1', projectId: 'purchasing', sourceRevision: 'a'.repeat(40),
      requirementId: 'REQ-1', criterionDigest: createHash('sha256').update(criterion).digest('hex'),
      checkId: 'approval-suite', definitionDigest: 'b'.repeat(64), environmentId: 'node24-local', result: 'passed',
    }],
  };
}

// Inputs contain no expected decisions. The oracle is maintained separately.
export function deliveryEvaluationCases() {
  const cases = [];
  function add(id, change = () => {}) {
    const input = packet();
    change(input);
    cases.push({ id, packet: input });
  }
  add('current-single');
  add('current-multiple', input => {
    input.requirements[0].checks.push({ ...input.requirements[0].checks[0], id: 'receipt-suite' });
    input.requirements.push({ ...structuredClone(input.requirements[0]), id: 'REQ-2' });
    input.evidence.push(
      { ...input.evidence[0], id: 'EV-2', checkId: 'receipt-suite' },
      { ...input.evidence[0], id: 'EV-3', requirementId: 'REQ-2' },
      { ...input.evidence[0], id: 'EV-4', requirementId: 'REQ-2', checkId: 'receipt-suite' },
    );
  });
  add('current-after-old-failure', input => {
    input.evidence.push({ ...input.evidence[0], id: 'EV-OLD', sourceRevision: 'c'.repeat(40), result: 'failed' });
  });
  add('current-sha256', input => {
    input.target.sourceRevision = 'd'.repeat(64);
    input.evidence[0].sourceRevision = input.target.sourceRevision;
  });
  add('missing', input => { input.evidence = []; });
  add('stale-revision', input => { input.target.sourceRevision = 'c'.repeat(40); });
  add('changed-criterion', input => { input.requirements[0].criterion = '담당자, 관리자, 감사자가 모두 승인해야 한다.'; });
  add('changed-definition', input => { input.requirements[0].checks[0].definitionDigest = 'e'.repeat(64); });
  add('changed-environment', input => { input.requirements[0].checks[0].environmentId = 'node24-other'; });
  add('foreign-project', input => { input.evidence[0].projectId = 'another-project'; });
  add('conflicting-current', input => { input.evidence.push({ ...input.evidence[0], id: 'EV-2', result: 'failed' }); });
  add('mapping-unconfirmed', input => { input.requirements[0].mappingConfirmed = false; });
  return cases;
}
