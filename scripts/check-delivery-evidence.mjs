import { evaluateDeliveryEvidence, renderDeliveryEvidenceMarkdown } from '../src/core/delivery-evidence-gate.mjs';

const MAX_INPUT_BYTES = 1024 * 1024;

try {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--format' || !['json', 'markdown'].includes(args[1]))) {
    throw new Error('Expected no arguments or --format json|markdown.');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > MAX_INPUT_BYTES) throw new Error('Input exceeds 1 MiB.');
    chunks.push(chunk);
  }
  let input;
  try {
    input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  } catch {
    throw new Error('Input must be valid UTF-8 JSON.');
  }
  const report = evaluateDeliveryEvidence(input);
  process.stdout.write(args[1] === 'markdown'
    ? renderDeliveryEvidenceMarkdown(report) : `${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.status === 'evidence-current' ? 0 : 2;
} catch (error) {
  process.stderr.write(`Delivery evidence check failed: ${error.message}\n`);
  process.exitCode = 1;
}
