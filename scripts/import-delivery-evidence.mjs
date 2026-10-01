import { importDeliveryEvidence } from '../src/core/delivery-evidence-import.mjs';

try {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--repo' || args[2] !== '--receipt') {
    throw new Error('Expected --repo ABSOLUTE_REPOSITORY --receipt ABSOLUTE_RECEIPT.');
  }
  const result = importDeliveryEvidence({ repoDir: args[1], receiptPath: args[3] });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.report.status === 'evidence-current' ? 0 : 2;
} catch {
  process.stderr.write('Delivery import rejected. Check clean source, manifest, receipt and version bindings.\n');
  process.exitCode = 1;
}
