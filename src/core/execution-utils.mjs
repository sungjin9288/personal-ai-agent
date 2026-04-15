import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeStringArray(items) {
  return Array.isArray(items) ? items.map((item) => normalizeText(item)).filter(Boolean) : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sanitizeRelativePath(candidate) {
  const normalized = normalizeText(candidate).replaceAll('\\', '/');
  return normalized.replace(/^\.?\//, '');
}

function isInsideRoot(rootDir, candidatePath) {
  const relativePath = path.relative(rootDir, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function classifyCommandRisk(command) {
  const value = normalizeText(command);
  const blockedReasons = [];
  const warningReasons = [];

  if (!value) {
    blockedReasons.push('실행 명령이 비어 있습니다.');
    return { blockedReasons, warningReasons };
  }

  if (/\bsudo\b/i.test(value)) {
    blockedReasons.push('sudo 명령은 v1 실행 정책에서 차단됩니다.');
  }
  if (/\bgit\s+reset\b/i.test(value) || /\bgit\s+checkout\s+--\b/i.test(value)) {
    blockedReasons.push('파괴적 git reset/checkout 명령은 차단됩니다.');
  }
  if (/\brm\s+-rf\b/i.test(value) || /\brm\s+-fr\b/i.test(value)) {
    blockedReasons.push('파괴적 삭제 명령은 차단됩니다.');
  }
  if (/\b(nohup|disown)\b/i.test(value) || /\s&\s*$/.test(value)) {
    blockedReasons.push('백그라운드 daemon/detached 실행은 차단됩니다.');
  }
  if (/\blaunchctl\b|\bosascript\b/i.test(value)) {
    blockedReasons.push('시스템 전역 설정/GUI 조작 명령은 차단됩니다.');
  }
  if (/\bgit\s+clean\b/i.test(value)) {
    warningReasons.push('git clean 계열 명령은 주의가 필요합니다.');
  }
  if (/\brm\s+/i.test(value) && !/\brm\s+-rf\b/i.test(value)) {
    warningReasons.push('파일 삭제 명령이 포함되어 있습니다.');
  }
  if (/\bmv\s+/i.test(value)) {
    warningReasons.push('파일 이동 명령이 포함되어 있습니다.');
  }
  if (/\.\./.test(value)) {
    warningReasons.push('상위 경로 참조(..)가 포함되어 있어 현재 리포 범위를 다시 확인해야 합니다.');
  }

  return { blockedReasons, warningReasons };
}

function normalizeEditOperation(value) {
  const normalized = normalizeText(value, 'replace');
  return ['append', 'replace', 'write'].includes(normalized) ? normalized : 'replace';
}

function normalizeStepKind(value) {
  const normalized = normalizeText(value, 'command');
  return ['inspect', 'edit', 'command', 'test', 'build', 'artifact'].includes(normalized) ? normalized : 'command';
}

function createStepId(index) {
  return `step-${String(index + 1).padStart(2, '0')}`;
}

function inferVerificationKind(kind, command) {
  if (kind !== 'command') {
    return kind;
  }

  const value = normalizeText(command).toLowerCase();
  if (!value) {
    return kind;
  }

  if (/\b(build|compile)\b/.test(value)) {
    return 'build';
  }
  if (/\b(test|check|verify|smoke|lint|typecheck)\b/.test(value)) {
    return 'test';
  }
  return kind;
}

function isPlaceholderCommand(command) {
  const value = normalizeText(command);
  if (!value) {
    return true;
  }

  return (
    /^TBD(?:_|[\s-])/i.test(value) ||
    /<[A-Za-z][A-Za-z0-9._-]*>/.test(value) ||
    /\bafter inspection\b/i.test(value) ||
    /\be\.g\./i.test(value) ||
    /\bor equivalent\b/i.test(value)
  );
}

function sanitizeExecutableCommand(command) {
  const value = normalizeText(command);
  return isPlaceholderCommand(value) ? '' : value;
}

function buildDefaultVerificationStep(index) {
  return {
    command: 'node --check src/cli.mjs',
    cwd: '.',
    expectedOutputs: ['CLI syntax check passes'],
    filePath: '',
    findText: '',
    id: createStepId(index),
    kind: 'test',
    operation: 'replace',
    reason: 'provider manifest에 검증 step이 없을 때 최소 syntax smoke를 강제로 추가합니다.',
    replaceText: '',
    riskClassification: 'low',
    title: 'CLI syntax smoke',
    verificationTarget: 'src/cli.mjs syntax parse must succeed.',
  };
}

function ensureVerificationSteps(steps) {
  if (steps.some((step) => ['test', 'build'].includes(step.kind))) {
    return steps;
  }
  return [...steps, buildDefaultVerificationStep(steps.length)];
}

function buildFallbackCommandHints({ plannerSteps = [], proposalContent = '' }) {
  const sources = [...plannerSteps, proposalContent];
  const commands = [];

  for (const source of sources) {
    const text = normalizeText(source);
    if (!text) {
      continue;
    }

    const inlineMatches = Array.from(text.matchAll(/`([^`]+)`/g));
    for (const match of inlineMatches) {
      const command = normalizeText(match[1]);
      if (/^(npm|pnpm|yarn|node|git|rg|npx|python3?)\b/.test(command)) {
        commands.push(command);
      }
    }

    const lineMatches = text.split('\n');
    for (const line of lineMatches) {
      const normalizedLine = normalizeText(line.replace(/^[-*]\s*/, ''));
      if (/^(npm|pnpm|yarn|node|git|rg|npx|python3?)\b/.test(normalizedLine)) {
        commands.push(normalizedLine);
      }
    }
  }

  return [...new Set(commands)];
}

function readWorkspacePackageScripts(workspacePath) {
  const packageJsonPath = path.join(workspacePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return {};
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return ensureObject(packageJson.scripts);
  } catch {
    return {};
  }
}

function hasWorkspaceModule(workspacePath, moduleName) {
  const modulePath = normalizeText(moduleName).replaceAll('.', '/');
  if (!modulePath) {
    return false;
  }

  return (
    fs.existsSync(path.join(workspacePath, `${modulePath}.py`)) ||
    fs.existsSync(path.join(workspacePath, modulePath, '__init__.py'))
  );
}

function extractNodeScriptPath(command) {
  const value = normalizeText(command);
  const match = value.match(/^node\s+(?:--check\s+)?([^\s]+)(?:\s|$)/);
  return sanitizeRelativePath(match?.[1] || '');
}

function isRunnableHintedCommand(command, workspacePath) {
  const value = normalizeText(command);
  if (!value) {
    return false;
  }

  if (/^(git|rg)\b/.test(value)) {
    return true;
  }

  const packageScripts = readWorkspacePackageScripts(workspacePath);
  const packageScriptMatch = value.match(/^(npm|pnpm|yarn)\s+run\s+([A-Za-z0-9:_-]+)/);
  if (packageScriptMatch) {
    return Boolean(packageScripts[packageScriptMatch[2]]);
  }

  if (/^node\b/.test(value)) {
    const scriptPath = extractNodeScriptPath(value);
    return scriptPath ? fs.existsSync(path.join(workspacePath, scriptPath)) : false;
  }

  const pythonModuleMatch = value.match(/^python(?:3)?\s+-m\s+([A-Za-z0-9_.]+)/);
  if (pythonModuleMatch) {
    return hasWorkspaceModule(workspacePath, pythonModuleMatch[1]);
  }

  return false;
}

export function getCurrentGitBranch(workspacePath) {
  try {
    return normalizeText(execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: workspacePath, encoding: 'utf8' }));
  } catch {
    return 'unknown';
  }
}

export function hashExecutionManifest(manifest) {
  return crypto.createHash('sha256').update(stableStringify(manifest)).digest('hex');
}

export function normalizeExecutionManifest(input, { workspacePath }) {
  const manifest = ensureObject(input);
  const rawSteps = ensureArray(manifest.steps);
  const summary = normalizeText(manifest.summary, '실행 manifest 요약이 없습니다.');

  const steps = rawSteps
    .map((item, index) => {
      const step = ensureObject(item);
      const command = sanitizeExecutableCommand(step.command);
      const kind = inferVerificationKind(normalizeStepKind(step.kind), command);
      const cwd = sanitizeRelativePath(step.cwd || '.');
      const relativeFilePath = sanitizeRelativePath(step.filePath || step.path || '');
      return {
        command,
        content: typeof step.content === 'string' ? step.content : '',
        cwd,
        expectedOutputs: normalizeStringArray(step.expectedOutputs),
        filePath: relativeFilePath,
        findText: typeof step.findText === 'string' ? step.findText : '',
        id: normalizeText(step.id, createStepId(index)),
        kind,
        operation: normalizeEditOperation(step.operation),
        reason: normalizeText(step.reason, '실행 단계 이유가 제공되지 않았습니다.'),
        replaceText: typeof step.replaceText === 'string' ? step.replaceText : '',
        riskClassification: normalizeText(step.riskClassification, kind === 'edit' ? 'medium' : 'low'),
        title: normalizeText(step.title, `${index + 1}단계 실행`),
        verificationTarget: normalizeText(step.verificationTarget),
      };
    })
    .filter((step) => step.kind === 'edit' ? step.filePath : step.kind === 'artifact' || Boolean(step.command));

  if (!steps.length) {
    return null;
  }

  return {
    source: normalizeText(manifest.source, 'derived'),
    summary,
    steps: ensureVerificationSteps(steps),
    workspacePath,
  };
}

export function buildFallbackExecutionManifest({ mission, workspace, plannerSteps = [], proposalContent = '' }) {
  const hintedCommands = buildFallbackCommandHints({
    plannerSteps,
    proposalContent,
  })
    .filter((command) => isRunnableHintedCommand(command, workspace.path))
    .slice(0, 2);

  const steps = [
    {
      command: 'git status --short',
      cwd: '.',
      expectedOutputs: ['현재 워크트리 변경 상태'],
      id: 'step-01',
      kind: 'inspect',
      reason: '실행 전에 현재 리포 변경 상태를 확인합니다.',
      riskClassification: 'low',
      title: '현재 워크트리 상태 확인',
      verificationTarget: '실행 전 변경 범위를 기록합니다.',
    },
    ...hintedCommands.map((command, index) => ({
      command,
      cwd: '.',
      expectedOutputs: ['provider 또는 planner가 제안한 bounded command'],
      id: `step-${String(index + 2).padStart(2, '0')}`,
      kind: /(test|check|verify|smoke)/i.test(command) ? 'test' : 'command',
      reason: 'planner/executor가 제안한 repo-local command를 검증용으로 실행합니다.',
      riskClassification: 'medium',
      title: `제안된 명령 실행 ${index + 1}`,
      verificationTarget: 'bounded command가 현재 리포 범위에서 성공하는지 확인합니다.',
    })),
  ];

  if (!hintedCommands.some((command) => /node\s+--check\s+src\/cli\.mjs/.test(command))) {
    const verificationStep = buildDefaultVerificationStep(steps.length);
    verificationStep.reason = '최소 syntax smoke를 실행해 현재 리포의 기본 실행면을 검증합니다.';
    steps.push(verificationStep);
  }

  return {
    source: 'fallback',
    summary: `${mission.title} 실행용 기본 manifest`,
    steps,
    workspacePath: workspace.path,
  };
}

export function evaluateExecutionPolicy({ manifest, rootDir, workspacePath }) {
  const blockedItems = [];
  const warningItems = [];
  const allowedItems = [];

  for (const step of ensureArray(manifest?.steps)) {
    const stepLabel = `${step.id} · ${step.title}`;
    const resolvedCwd = path.resolve(workspacePath, step.cwd || '.');

    if (!isInsideRoot(rootDir, resolvedCwd)) {
      blockedItems.push(`${stepLabel}: cwd가 현재 리포 밖을 가리킵니다 (${resolvedCwd}).`);
      continue;
    }

    if (step.kind === 'edit') {
      const targetPath = path.resolve(workspacePath, step.filePath || '');
      if (!isInsideRoot(rootDir, targetPath)) {
        blockedItems.push(`${stepLabel}: 수정 대상 파일이 현재 리포 밖에 있습니다 (${targetPath}).`);
        continue;
      }
      if (!step.filePath) {
        blockedItems.push(`${stepLabel}: edit step에 filePath가 없습니다.`);
        continue;
      }
      allowedItems.push(`${stepLabel}: edit ${step.operation} ${step.filePath}`);
      continue;
    }

    if (step.kind === 'artifact') {
      allowedItems.push(`${stepLabel}: artifact handoff`);
      continue;
    }

    const { blockedReasons, warningReasons } = classifyCommandRisk(step.command);
    if (blockedReasons.length) {
      blockedItems.push(...blockedReasons.map((reason) => `${stepLabel}: ${reason}`));
      continue;
    }
    if (warningReasons.length) {
      warningItems.push(...warningReasons.map((reason) => `${stepLabel}: ${reason}`));
    }
    allowedItems.push(`${stepLabel}: ${step.command}`);
  }

  return {
    allowed: blockedItems.length === 0,
    allowedItems,
    blockedItems,
    warningItems,
  };
}
