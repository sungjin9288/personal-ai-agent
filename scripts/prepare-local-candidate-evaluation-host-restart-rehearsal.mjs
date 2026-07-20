import {
  prepareLocalCandidateEvaluationHostRestartRehearsal,
} from './local-candidate-evaluation-host-restart-rehearsal.mjs';

if (process.argv.length !== 2) {
  throw new Error(
    'Host restart rehearsal prepare does not accept arguments.',
  );
}

const result =
  prepareLocalCandidateEvaluationHostRestartRehearsal();

process.stdout.write(
  `${JSON.stringify({
    ...result,
    nextAction:
      `Restart the host manually, wait until ${result.leaseExpiresAt}, then run npm run resume:local-candidate-evaluation-host-restart-rehearsal -- --id ${result.rehearsalId}`,
    ok: true,
  }, null, 2)}\n`,
);
