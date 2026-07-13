export function extractBulletValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${label}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractMarkdownSection(markdown, heading, level = 2) {
  const normalizedLevel = Math.max(1, Math.min(Number(level) || 2, 6));
  const headingPrefix = '#'.repeat(normalizedLevel);
  const sectionPattern = new RegExp(
    `(?:^|\\n)${headingPrefix} ${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=\\n#{1,${normalizedLevel}}\\s|$)`,
  );
  const sectionMatch = String(markdown || '').match(sectionPattern);
  return sectionMatch ? String(sectionMatch[1] || '').trim() : '';
}

export function extractSectionBullets(markdown, heading) {
  const sectionPattern = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?:\\n## |$)`);
  const sectionMatch = String(markdown || '').match(sectionPattern);
  if (!sectionMatch) {
    return [];
  }

  return String(sectionMatch[1] || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

export function extractBulletsAfterLabel(markdown, label) {
  const normalizedLabel = `${String(label || '').trim().replace(/:$/, '')}:`.toLowerCase();
  const entries = [];
  let inList = false;
  let foundListItem = false;

  for (const line of String(markdown || '').split('\n')) {
    const trimmedLine = line.trim();
    if (!inList && trimmedLine.toLowerCase() === normalizedLabel) {
      inList = true;
      continue;
    }
    if (!inList) {
      continue;
    }
    if (!trimmedLine) {
      continue;
    }
    if (!trimmedLine.startsWith('- ')) {
      if (foundListItem) {
        break;
      }
      continue;
    }
    entries.push(trimmedLine.slice(2).trim());
    foundListItem = true;
  }

  return entries.filter(Boolean);
}

export function extractPlainStatus(markdown) {
  const match = String(markdown || '').match(/^Status:\s+(.+)$/m);
  return match ? String(match[1] || '').trim().replace(/\.$/, '') : '';
}

export function extractChecklistItems(markdown) {
  const sectionPattern = /## Closeout Checklist\n([\s\S]*?)(?:\n## |$)/;
  const sectionMatch = String(markdown || '').match(sectionPattern);
  if (!sectionMatch) {
    return [];
  }

  return String(sectionMatch[1] || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^- \[[ x]\]/.test(line))
    .map((line) => ({
      done: line.startsWith('- [x]'),
      label: line.replace(/^- \[[ x]\]\s*/, '').trim(),
    }));
}

export function extractStatusMap(markdown) {
  return Object.fromEntries(
    extractSectionBullets(markdown, 'Current Status')
      .map((line) => {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex === -1) {
          return null;
        }
        return [
          String(line.slice(0, separatorIndex) || '').trim(),
          String(line.slice(separatorIndex + 1) || '').trim(),
        ];
      })
      .filter(Boolean),
  );
}

export function extractLiveValidationItems(markdown) {
  return extractSectionBullets(markdown, 'Live Validation').map((line) => {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      return {
        provider: 'summary',
        status: line,
      };
    }

    return {
      provider: String(line.slice(0, separatorIndex) || '').trim(),
      status: String(line.slice(separatorIndex + 1) || '').trim(),
    };
  });
}

export function extractDeterministicItems(markdown) {
  return extractSectionBullets(markdown, 'Deterministic Verification').map((line) => {
    const separatorIndex = line.lastIndexOf(':');
    if (separatorIndex === -1) {
      return {
        script: line,
        status: 'unknown',
      };
    }

    return {
      script: String(line.slice(0, separatorIndex) || '').trim(),
      status: String(line.slice(separatorIndex + 1) || '').trim(),
    };
  });
}

export function extractDeterministicRuntimeItems(markdown) {
  return extractSectionBullets(markdown, 'Deterministic Runtime Summary').map((line) => {
    const match = line.match(/^(.*):\s+(.+?) elapsed, stdout (.+?), stderr (.+?), timeout (.+)$/);
    if (!match) {
      return {
        script: line,
        summary: line,
      };
    }

    return {
      elapsed: String(match[2] || '').trim(),
      script: String(match[1] || '').trim(),
      stderr: String(match[4] || '').trim(),
      stdout: String(match[3] || '').trim(),
      summary: String(line.slice(String(match[1] || '').length + 1) || '').trim(),
      timeout: String(match[5] || '').trim(),
    };
  });
}

export function extractReferenceAdoptionAggregate(markdown) {
  const lines = extractSectionBullets(markdown, 'Reference Adoption Aggregate');
  const scriptCountLine = lines.find((line) => line.startsWith('scriptCount:'));
  const totalDurationLine = lines.find((line) => line.startsWith('totalDuration:'));
  const okLine = lines.find((line) => line.startsWith('ok:'));
  const scripts = lines
    .map((line) => {
      const match = line.match(/^(scripts\/[^:]+):\s+(\w+)(?:\s+\(([^)]+)\))?$/);
      if (!match) {
        return null;
      }

      const details = parseReferenceAdoptionScriptDetails(match[3] || '');
      return {
        duration: details.duration,
        script: String(match[1] || '').trim(),
        status: String(match[2] || '').trim(),
        timedOut: details.timedOut,
        timeout: details.timeout,
      };
    })
    .filter(Boolean);

  return {
    ok: okLine ? okLine.split(':').slice(1).join(':').trim() === 'true' : null,
    scriptCount: Number.parseInt(String(scriptCountLine || '').split(':').slice(1).join(':').trim(), 10) || scripts.length,
    scripts,
    totalDuration: totalDurationLine ? totalDurationLine.split(':').slice(1).join(':').trim() : null,
  };
}

function parseReferenceAdoptionScriptDetails(rawDetails = '') {
  const segments = String(rawDetails || '')
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const duration = segments[0] || null;
  const timeoutSegment = segments.find((segment) => segment.startsWith('timeout '));
  const timedOutSegment = segments.find((segment) => segment.startsWith('timedOut '));

  return {
    duration,
    timedOut: timedOutSegment ? timedOutSegment.split(/\s+/).slice(1).join(' ') === 'true' : null,
    timeout: timeoutSegment ? timeoutSegment.split(/\s+/).slice(1).join(' ') || null : null,
  };
}
