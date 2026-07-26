import {
  createLocalCandidateEvaluationWorkspace,
} from '../src/core/local-candidate-evaluation-workspace-recovery.mjs';

const temporaryDirectory = process.argv[2];
const workspace = createLocalCandidateEvaluationWorkspace({
  createdAt: '2026-07-17T08:00:00.000Z',
  leaseExpiresAt: '2026-07-17T08:30:00.000Z',
  temporaryDirectory,
});

process.stdout.write(
  `${JSON.stringify({
    leaseId: workspace.lease.leaseId,
  })}\n`,
);
