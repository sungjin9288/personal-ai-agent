import { spawn } from 'node:child_process';
import fs from 'node:fs';

const mode = readOption('--mode', 'success');
const pidFile = readOption('--pid-file', '');

for await (const _chunk of process.stdin) {
  // The lifecycle contract requires stdin to drain before work starts.
}

if (mode === 'hang-with-descendant') {
  const descendant = spawn(
    process.execPath,
    ['-e', 'setInterval(() => {}, 10000)'],
    {
      detached: false,
      stdio: 'ignore',
    },
  );
  if (pidFile) {
    fs.writeFileSync(pidFile, String(descendant.pid));
  }
  setInterval(() => {}, 10_000);
} else if (mode === 'orphan-descendant') {
  const descendant = spawn(
    process.execPath,
    ['-e', 'setInterval(() => {}, 10000)'],
    {
      detached: false,
      stdio: 'ignore',
    },
  );
  if (pidFile) {
    fs.writeFileSync(pidFile, String(descendant.pid));
  }
  descendant.unref();
  process.stdout.write(JSON.stringify({ ok: true }), () => {
    process.exit(0);
  });
} else if (mode === 'leader-exit-open-stdio') {
  const descendant = spawn(
    process.execPath,
    ['-e', 'setInterval(() => {}, 10000)'],
    {
      detached: false,
      stdio: ['ignore', 'inherit', 'inherit'],
    },
  );
  if (pidFile) {
    fs.writeFileSync(pidFile, String(descendant.pid));
  }
  descendant.unref();
  process.stdout.write(JSON.stringify({ ok: true }), () => {
    process.exit(0);
  });
} else if (mode === 'large-stdout') {
  process.stdout.write('x'.repeat(4_096));
  setInterval(() => {}, 10_000);
} else if (mode === 'large-stderr') {
  process.stderr.write('x'.repeat(4_096));
  setInterval(() => {}, 10_000);
} else {
  process.stdout.write(JSON.stringify({ ok: true }));
}

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}
