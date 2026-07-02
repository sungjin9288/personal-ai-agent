// Extracted pure UI helpers (round 2). Byte-identical function/const bodies moved
// from app.js; served as an ES module under /lib/.
export function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function formatDate(value) {
  if (!value) {
    return '-';
  }

  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatDurationMs(value) {
  const durationMs = Number(value);
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return '-';
  }
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }
  if (durationMs < 60_000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }
  return `${Math.round(durationMs / 60_000)}m`;
}

export function getStatusClass(status = '') {
  return `status-${String(status).trim().replaceAll(' ', '-').replaceAll('/', '-').toLowerCase()}`;
}

export const DISPLAY_LABELS = {
  'approval-resolution': '승인 처리 결과',
  approved: '승인됨',
  artifact: '산출물',
  'awaiting-approval': '승인 대기',
  awaiting_approval: '승인 대기',
  blocked: '막힘',
  completed: '완료',
  'decision-memo': '의사결정 메모',
  decision: '결정',
  deliverable: '최종 산출물',
  devlog: '개발 로그',
  engineering: '엔지니어링 작업',
  'env-missing': '환경 변수 누락',
  'execution-handoff': '실행 인계',
  execution_lease: '실행 lease',
  'execution-manifest': '실행 manifest',
  execution_ready: '실행 준비',
  execution_running: '실행 중',
  fallback: 'fallback',
  failed: '실패',
  fact: '사실',
  high: '높음',
  'implementation-proposal': '구현 제안서',
  incident: '인시던트 기록',
  knowledge: '지식 작업',
  low: '낮음',
  manager: '매니저',
  medium: '보통',
  normal: '보통',
  open: '열림',
  pending: '대기',
  'pending-approval': '승인 대기',
  planner: '플래너',
  'eligible-provider-failure': 'fallback 가능 provider failure',
  prd: 'PRD',
  'mission-status-completed': 'fallback 완료',
  'no-provider-failure-metadata': 'provider failure metadata 없음',
  'non-recoverable-provider-failure': '비복구 provider failure',
  queued: '대기열',
  ready: '준비됨',
  'approval-required': '승인 필요',
  required: '필요',
  reference: '참고 레포 기록',
  rejected: '반려됨',
  retrieval: 'retrieval 근거',
  retryReady: '재실행 권장',
  reviewer: '리뷰어',
  running: '실행 중',
  'provider-failure-only': 'provider failure only',
  'provider-fallback-attempted': 'fallback 판정',
  'provider-fallback-used': 'fallback 사용',
  'recoverable-provider-failure-only': 'recoverable provider failure only',
  stopped: '중단됨',
  stable: '안정',
  stub: '스텁',
  supported: '지원됨',
  preference: '선호',
  verification: '검증',
};

export function getDisplayLabel(value, fallback = '-') {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const raw = String(value).trim();
  return DISPLAY_LABELS[raw] || DISPLAY_LABELS[raw.toLowerCase()] || raw;
}

export function markdownToHtml(markdown = '') {
  const lines = String(markdown || '').replace(/\r/g, '').split('\n');
  const html = [];
  let inList = false;
  let inCode = false;
  let paragraph = [];
  let code = [];

  function flushParagraph() {
    if (!paragraph.length) {
      return;
    }
    html.push(`<p>${paragraph.join('<br />')}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  }

  function flushCode() {
    if (!inCode) {
      return;
    }
    html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
    inCode = false;
    code = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('```')) {
      flushParagraph();
      flushList();
      if (inCode) {
        flushCode();
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      code.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
      continue;
    }

    const list = line.match(/^[-*]\s+(.*)$/);
    if (list) {
      flushParagraph();
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${escapeHtml(list[1])}</li>`);
      continue;
    }

    flushList();
    paragraph.push(escapeHtml(line));
  }

  flushParagraph();
  flushList();
  flushCode();
  return html.join('');
}
