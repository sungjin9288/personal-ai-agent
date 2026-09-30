import { evaluateDeliveryImpact } from '../src/core/delivery-evidence-impact.mjs';

const MAX_INPUT_BYTES = 1024 * 1024;

try {
  if (process.argv.length !== 2) throw new Error('Expected no arguments.');
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
  const report = evaluateDeliveryImpact(input);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.status === 'no-declared-impact' ? 0 : 2;
} catch (error) {
  process.stderr.write(`Delivery impact check failed: ${error.message}\n`);
  process.exitCode = 1;
}
