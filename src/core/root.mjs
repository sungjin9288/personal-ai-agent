import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRootDir = path.resolve(__dirname, '..', '..');

export function resolveRootDir() {
  const override = String(process.env.PERSONAL_AI_AGENT_ROOT || '').trim();
  return override ? path.resolve(override) : defaultRootDir;
}
