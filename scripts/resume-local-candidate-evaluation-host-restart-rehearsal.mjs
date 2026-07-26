import {
  resumeLocalCandidateEvaluationHostRestartRehearsal,
} from './local-candidate-evaluation-host-restart-rehearsal.mjs';

function parseRehearsalId(args) {
  if (
    args.length !== 2 ||
    args[0] !== '--id' ||
    !args[1]
  ) {
    throw new Error(
      'Expected --id <rehearsal-id>.',
    );
  }
  return args[1];
}

const result =
  resumeLocalCandidateEvaluationHostRestartRehearsal({
    rehearsalId: parseRehearsalId(
      process.argv.slice(2),
    ),
  });

process.stdout.write(
  `${JSON.stringify({
    ...result,
    ok: true,
  }, null, 2)}\n`,
);
