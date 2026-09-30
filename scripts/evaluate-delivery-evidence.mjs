import { readFileSync } from 'node:fs';
import { deliveryEvaluationCases } from '../examples/delivery-evidence/cases.mjs';
import { evaluateDeliveryEvidenceCases, renderDeliveryEvaluationMarkdown } from '../src/core/delivery-evidence-evaluation.mjs';

try {
  const args = process.argv.slice(2);
  if (args.length !== 0 && !(args.length === 2 && args[0] === '--format' && ['json', 'markdown'].includes(args[1]))) {
    throw new Error('Invalid options.');
  }
  const oracle = JSON.parse(readFileSync(new URL('../examples/delivery-evidence/expected.json', import.meta.url), 'utf8'));
  const report = evaluateDeliveryEvidenceCases(deliveryEvaluationCases(), oracle);
  process.stdout.write(args[1] === 'markdown' ? renderDeliveryEvaluationMarkdown(report) : `${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.passed ? 0 : 2;
} catch {
  process.stderr.write('Delivery evaluation failed. Use no options or --format json|markdown.\n');
  process.exitCode = 1;
}
