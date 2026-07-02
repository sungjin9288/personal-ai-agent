import path from 'node:path';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

const MISSION_ATTACHMENT_ALLOWED_EXTENSIONS = new Set([
  '.c',
  '.cc',
  '.cpp',
  '.css',
  '.csv',
  '.go',
  '.html',
  '.java',
  '.js',
  '.json',
  '.jsx',
  '.log',
  '.md',
  '.mjs',
  '.py',
  '.rb',
  '.rs',
  '.sql',
  '.text',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
]);

const MISSION_ATTACHMENT_ALLOWED_MIME_PREFIXES = ['application/', 'text/'];
const MISSION_ATTACHMENT_ALLOWED_MIME_TYPES = new Set([
  'application/json',
  'application/ld+json',
  'application/sql',
  'application/xml',
]);

export function normalizeMissionAttachmentFileName(fileName) {
  const normalized = path.basename(normalizeText(fileName));
  if (!normalized) {
    throw new Error('Attachment fileName is required.');
  }

  return normalized.replace(/[^\w.\- ]+/g, '_');
}

export function inferMissionAttachmentMimeType(fileName) {
  const extension = path.extname(normalizeMissionAttachmentFileName(fileName)).toLowerCase();

  switch (extension) {
    case '.json':
      return 'application/json';
    case '.xml':
      return 'application/xml';
    case '.yaml':
    case '.yml':
      return 'application/yaml';
    case '.csv':
      return 'text/csv';
    case '.html':
      return 'text/html';
    case '.css':
      return 'text/css';
    case '.js':
    case '.mjs':
      return 'text/javascript';
    case '.ts':
    case '.tsx':
    case '.jsx':
      return 'text/plain';
    case '.sql':
      return 'application/sql';
    default:
      return 'text/plain';
  }
}

export function isSupportedMissionAttachment({ fileName, mimeType, content }) {
  const extension = path.extname(normalizeMissionAttachmentFileName(fileName)).toLowerCase();
  const normalizedMimeType = normalizeText(mimeType).toLowerCase();

  if (MISSION_ATTACHMENT_ALLOWED_EXTENSIONS.has(extension)) {
    return true;
  }

  if (
    normalizedMimeType &&
    (MISSION_ATTACHMENT_ALLOWED_MIME_TYPES.has(normalizedMimeType) ||
      MISSION_ATTACHMENT_ALLOWED_MIME_PREFIXES.some((prefix) => normalizedMimeType.startsWith(prefix)))
  ) {
    return true;
  }

  return !String(content || '').includes('\u0000');
}

export function sanitizeMissionAttachmentContent(content) {
  const normalized = String(content || '').replace(/\r\n/g, '\n');
  if (!normalizeText(normalized)) {
    throw new Error('Attachment content is required.');
  }

  return normalized;
}
