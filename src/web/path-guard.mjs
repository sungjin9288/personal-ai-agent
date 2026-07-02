import path from 'node:path';

export function resolveWithinRoot(rootDir, candidate) {
  const safeRoot = path.resolve(String(rootDir || ''));
  const resolved = path.resolve(String(candidate || ''));
  if (resolved === safeRoot) {
    return resolved;
  }
  const relative = path.relative(safeRoot, resolved);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return null;
  }
  return resolved;
}
