import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadAgentTemplate({ role }) {
  const filePath = path.join(__dirname, `${role}.md`);
  return fs.readFileSync(filePath, 'utf8');
}
