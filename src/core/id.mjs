import crypto from 'node:crypto';

function compactTimestamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

export function createId(prefix) {
  return `${prefix}_${compactTimestamp()}_${crypto.randomBytes(3).toString('hex')}`;
}
