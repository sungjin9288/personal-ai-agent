const FORMAT_CONTROLS = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/gu;
const LEADING_MARKUP = /^[\s>*#"'`()[\]{}-]+/u;
const ROLE_PREFIX = /^(?:system|assistant|developer)\s*:\s*/iu;
const SPLIT_DIRECTIVE_WORDS = Object.freeze([
  'bypass',
  'disregard',
  'emit',
  'expose',
  'forget',
  'ignore',
  'output',
  'override',
  'print',
  'return',
  'reveal',
  'write',
]);
const ENGLISH_INSTRUCTION = new RegExp(
  [
    '^(?:please\\s+)?',
    '(?:ignore|disregard|override|bypass|forget)\\s+',
    '(?:(?:all|any|the|these|those|every|previous|prior|above|earlier|existing|',
    'system|developer|source|evidence)\\s+){0,6}',
    '(?:instructions?|rules?|constraints?|sources?|evidence)\\b',
  ].join(''),
  'iu',
);
const ENGLISH_OUTPUT_COMMAND = new RegExp(
  [
    '^(?:please\\s+)?',
    '(?:print|output|emit|reveal|return|write|say|expose)\\s+',
    '(?:(?:the|this|only|exact|following)\\s+){0,3}',
    '(?:[a-z0-9]+[_-])?(?:canary|marker|secret|token)\\b',
  ].join(''),
  'iu',
);
const KOREAN_INSTRUCTION =
  /^(?:이전|위의|모든|시스템|개발자|증적|출처).{0,80}(?:지시|규칙|제약|증적|출처).{0,80}(?:무시|우회|덮어쓰)/u;
const JAPANESE_INSTRUCTION =
  /^(?:以前|上記|すべて|システム|開発者).{0,80}(?:指示|規則|制約|証拠|情報源).{0,80}(?:無視|回避|上書き)/u;
const SPANISH_INSTRUCTION =
  /^(?:ignora|omite|anula|sobrescribe).{0,80}(?:instrucciones|reglas|restricciones|fuentes|evidencia)/iu;
const INSTRUCTION_PATTERNS = Object.freeze([
  ENGLISH_INSTRUCTION,
  ENGLISH_OUTPUT_COMMAND,
  KOREAN_INSTRUCTION,
  JAPANESE_INSTRUCTION,
  SPANISH_INSTRUCTION,
]);

function normalizeText(value) {
  return String(value || '').trim();
}

function foldSplitDirectiveWords(value) {
  let folded = value;
  for (const word of SPLIT_DIRECTIVE_WORDS) {
    const letters = [...word].join('[\\s._·•-]*');
    const pattern = new RegExp(
      `(^|[^\\p{L}\\p{N}])${letters}(?=$|[^\\p{L}\\p{N}])`,
      'giu',
    );
    folded = folded.replace(pattern, (match, prefix) => {
      const directive = match.slice(prefix.length);
      const compact = directive.replace(/[\s._·•-]/gu, '');
      return directive.length > compact.length ? `${prefix}${word}` : match;
    });
  }
  return folded;
}

function normalizeForDetection(value) {
  const kinds = [];
  const compatibilityNormalized = value.normalize('NFKC');
  if (compatibilityNormalized !== value) {
    kinds.push('unicode-nfkc');
  }
  const controlsRemoved = compatibilityNormalized.replace(FORMAT_CONTROLS, '');
  if (controlsRemoved !== compatibilityNormalized) {
    kinds.push('format-controls-removed');
  }
  const splitWordsFolded = foldSplitDirectiveWords(controlsRemoved);
  if (splitWordsFolded !== controlsRemoved) {
    kinds.push('split-directive-folded');
  }
  return {
    kinds,
    text: splitWordsFolded.replace(/\s+/gu, ' ').trim(),
  };
}

function isUntrustedInstruction(segment) {
  const normalized = normalizeForDetection(segment);
  const candidate = normalized.text
    .replace(LEADING_MARKUP, '')
    .replace(ROLE_PREFIX, '');
  return {
    detected: INSTRUCTION_PATTERNS.some((pattern) => pattern.test(candidate)),
    normalizationKinds: normalized.kinds,
  };
}

function splitSentences(text) {
  const segments = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const previous = text[index - 1] || '';
    const next = text[index + 1] || '';
    const decimalPoint = character === '.' && /\d/u.test(previous) && /\d/u.test(next);
    const terminalPunctuation = /[!?。！？]/u.test(character) ||
      (character === '.' && !decimalPoint && (!next || /\s/u.test(next)));
    if (!terminalPunctuation) {
      continue;
    }
    segments.push(text.slice(start, index + 1));
    start = index + 1;
  }
  if (start < text.length) {
    segments.push(text.slice(start));
  }
  return segments.length > 0 ? segments : [text];
}

export function sanitizeUntrustedInstructions(value) {
  const originalText = String(value ?? '');
  const text = normalizeText(originalText);
  const segments = splitSentences(text);
  const retained = [];
  const normalizationKinds = new Set();
  let removedCount = 0;

  for (const segment of segments) {
    const normalizedSegment = normalizeText(segment);
    if (!normalizedSegment) {
      continue;
    }
    const result = isUntrustedInstruction(normalizedSegment);
    for (const kind of result.normalizationKinds) {
      normalizationKinds.add(kind);
    }
    if (result.detected) {
      removedCount += 1;
      continue;
    }
    retained.push(normalizedSegment);
  }

  return {
    normalization: {
      applied: normalizationKinds.size > 0,
      kinds: [...normalizationKinds].sort(),
    },
    removedCount,
    text: removedCount === 0
      ? originalText
      : retained.join(' ').trim() ||
        'An untrusted instruction was removed before generation.',
  };
}
