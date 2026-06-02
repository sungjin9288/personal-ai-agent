import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_MAX_CONVERTED_CHARS = 200_000;
const DEFAULT_MAX_BUFFER_BYTES = 10 * 1024 * 1024;
const DEFAULT_CONVERTER_PROBE_TIMEOUT_MS = 5000;
const DEFAULT_CONVERTER_PROBE_MAX_BUFFER_BYTES = 256 * 1024;

export const DOCUMENT_CONVERSION_MARKITDOWN_EXTENSIONS = Object.freeze([
  '.doc',
  '.docx',
  '.html',
  '.htm',
  '.pdf',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
]);

export const DOCUMENT_CONVERSION_TEXT_EXTENSIONS = Object.freeze([
  '.c',
  '.cc',
  '.cpp',
  '.css',
  '.csv',
  '.go',
  '.html',
  '.htm',
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

const MARKITDOWN_COMPATIBLE_EXTENSIONS = new Set(DOCUMENT_CONVERSION_MARKITDOWN_EXTENSIONS);
const TEXT_ATTACHMENT_EXTENSIONS = new Set(DOCUMENT_CONVERSION_TEXT_EXTENSIONS);

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeConverterCommand(value, env = process.env) {
  return normalizeText(value, env.PERSONAL_AI_AGENT_MARKITDOWN_BIN || 'markitdown');
}

function normalizeFilePath(filePath) {
  const normalizedPath = path.resolve(normalizeText(filePath));
  if (!normalizedPath) {
    throw new Error('Attachment file path is required.');
  }
  return normalizedPath;
}

function readTextAttachment(filePath, extension) {
  const content = fs.readFileSync(filePath, 'utf8');
  return {
    content,
    conversion: {
      converted: false,
      converter: 'native-text',
      extension,
      sourcePath: filePath,
    },
  };
}

async function runMarkdownConverter({
  converterArgs = [],
  converterCommand,
  filePath,
  maxBufferBytes = DEFAULT_MAX_BUFFER_BYTES,
  maxConvertedChars = DEFAULT_MAX_CONVERTED_CHARS,
}) {
  const command = normalizeConverterCommand(converterCommand);
  const args = [...converterArgs, filePath];

  try {
    const { stdout } = await execFileAsync(command, args, {
      encoding: 'utf8',
      maxBuffer: maxBufferBytes,
    });
    const content = normalizeText(stdout);
    if (!content) {
      throw new Error(`Document converter returned empty Markdown for ${path.basename(filePath)}.`);
    }

    return {
      content: content.slice(0, maxConvertedChars),
      conversion: {
        converted: true,
        converter: path.basename(command),
        sourcePath: filePath,
        truncated: content.length > maxConvertedChars,
      },
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(
        `Document converter not found: ${command}. Install MarkItDown or set PERSONAL_AI_AGENT_MARKITDOWN_BIN to a compatible local converter.`,
      );
    }
    throw error;
  }
}

function buildConverterErrorSummary(error) {
  return {
    code: error?.code || '',
    killed: Boolean(error?.killed),
    message: normalizeText(error?.message),
    signal: error?.signal || '',
    stderrPreview: normalizeText(error?.stderr).slice(0, 500),
    stdoutPreview: normalizeText(error?.stdout).slice(0, 500),
  };
}

function classifyConverterProbeError(error) {
  if (error?.code === 'ENOENT') {
    return 'converter-not-found';
  }

  if (error?.code === 'EACCES') {
    return 'converter-not-executable';
  }

  if (error?.killed || error?.signal === 'SIGTERM' || error?.code === 'ETIMEDOUT') {
    return 'converter-probe-timeout';
  }

  return 'converter-probe-failed';
}

export async function getDocumentConversionCapabilities({
  converterArgs = [],
  converterCommand = '',
  env = process.env,
  maxBufferBytes = DEFAULT_MAX_BUFFER_BYTES,
  maxConvertedChars = DEFAULT_MAX_CONVERTED_CHARS,
  probeMaxBufferBytes = DEFAULT_CONVERTER_PROBE_MAX_BUFFER_BYTES,
  probeTimeoutMs = DEFAULT_CONVERTER_PROBE_TIMEOUT_MS,
} = {}) {
  const explicitCommand = normalizeText(converterCommand);
  const envCommand = normalizeText(env.PERSONAL_AI_AGENT_MARKITDOWN_BIN);
  const command = normalizeConverterCommand(explicitCommand, env);
  const args = Array.isArray(converterArgs) ? converterArgs.map((arg) => String(arg)).filter(Boolean) : [];
  const configured = Boolean(explicitCommand || envCommand);
  const checkedAt = new Date().toISOString();
  const base = {
    available: false,
    checkedAt,
    configured,
    converter: {
      args,
      basename: path.basename(command),
      command,
      envVariable: 'PERSONAL_AI_AGENT_MARKITDOWN_BIN',
      probe: {
        args: [...args, '--help'],
        ok: false,
        timeoutMs: probeTimeoutMs,
      },
      source: explicitCommand ? 'option' : envCommand ? 'env' : 'path-default',
    },
    defaults: {
      maxBufferBytes,
      maxConvertedChars,
    },
    disabledReason: '',
    security: {
      childProcessBoundary: true,
      localFilesOnly: true,
      networkFetchEnabled: false,
      ocrEnabled: false,
      urlConversionEnabled: false,
    },
    supportedExtensions: {
      markitdown: [...DOCUMENT_CONVERSION_MARKITDOWN_EXTENSIONS],
      nativeText: [...DOCUMENT_CONVERSION_TEXT_EXTENSIONS],
      unsupportedPolicy: 'reject',
    },
  };

  try {
    const { stdout, stderr } = await execFileAsync(command, [...args, '--help'], {
      encoding: 'utf8',
      maxBuffer: probeMaxBufferBytes,
      timeout: probeTimeoutMs,
    });

    return {
      ...base,
      available: true,
      disabledReason: '',
      converter: {
        ...base.converter,
        probe: {
          ...base.converter.probe,
          ok: true,
          stderrPreview: normalizeText(stderr).slice(0, 500),
          stdoutPreview: normalizeText(stdout).slice(0, 500),
        },
      },
    };
  } catch (error) {
    return {
      ...base,
      available: false,
      disabledReason: classifyConverterProbeError(error),
      converter: {
        ...base.converter,
        probe: {
          ...base.converter.probe,
          error: buildConverterErrorSummary(error),
          ok: false,
        },
      },
    };
  }
}

export function isTextAttachmentPath(filePath) {
  return TEXT_ATTACHMENT_EXTENSIONS.has(path.extname(normalizeText(filePath)).toLowerCase());
}

export function isMarkitdownCompatiblePath(filePath) {
  return MARKITDOWN_COMPATIBLE_EXTENSIONS.has(path.extname(normalizeText(filePath)).toLowerCase());
}

export async function convertMissionAttachmentFile({
  converterArgs = [],
  converterCommand = '',
  filePath,
  maxBufferBytes,
  maxConvertedChars,
} = {}) {
  const normalizedPath = normalizeFilePath(filePath);
  const stats = fs.statSync(normalizedPath);

  if (!stats.isFile()) {
    throw new Error(`Attachment path is not a file: ${normalizedPath}`);
  }

  const extension = path.extname(normalizedPath).toLowerCase();
  if (isTextAttachmentPath(normalizedPath)) {
    return readTextAttachment(normalizedPath, extension);
  }

  if (!isMarkitdownCompatiblePath(normalizedPath)) {
    throw new Error(
      `Unsupported attachment extension for ${path.basename(normalizedPath)}. Use a text file or a MarkItDown-compatible document.`,
    );
  }

  const result = await runMarkdownConverter({
    converterArgs,
    converterCommand,
    filePath: normalizedPath,
    maxBufferBytes,
    maxConvertedChars,
  });

  return {
    ...result,
    conversion: {
      ...result.conversion,
      extension,
    },
  };
}
