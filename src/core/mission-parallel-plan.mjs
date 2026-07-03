import { MAX_PARALLEL_SPECIALISTS, SPECIALIST_KINDS } from './constants.mjs';
import { resolveOrchestrationProfile } from './orchestration-profiles.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeStringList(items) {
  return ensureArray(items).map((item) => normalizeText(item)).filter(Boolean);
}

function normalizeAgentRunStatus(value) {
  const normalized = normalizeText(value);
  if (normalized === 'executing') {
    return 'running';
  }
  return normalized;
}

export function parseMissionConstraintDirectives(mission) {
  const directives = {
    orchestrationProfileId: '',
    parallelSpecialists: [],
    specialistAbandonKinds: [],
    specialistBlockKinds: [],
    specialistFailKinds: [],
  };

  for (const constraint of ensureArray(mission?.constraints)) {
    const normalized = normalizeText(constraint);
    if (!normalized) {
      continue;
    }

    const [rawKey, rawValue = ''] = normalized.split(':');
    const key = normalizeText(rawKey).toLowerCase();
    const values = rawValue
      .split(',')
      .map((item) => normalizeText(item).toLowerCase())
      .filter((item) => SPECIALIST_KINDS.includes(item));

    if (key === 'orchestration-profile') {
      directives.orchestrationProfileId = normalizeText(rawValue).toLowerCase();
    } else if (key === 'parallel-specialists') {
      directives.parallelSpecialists = values;
    } else if (key === 'parallel-fail') {
      directives.specialistFailKinds = values;
    } else if (key === 'parallel-block') {
      directives.specialistBlockKinds = values;
    } else if (key === 'parallel-abandon') {
      directives.specialistAbandonKinds = values;
    }
  }

  return directives;
}

function createOrchestrationProfileMetadata(profile, { effectiveKinds = [], source = '' } = {}) {
  if (!profile) {
    return null;
  }

  return {
    ...profile,
    source: normalizeText(source) || null,
  };
}

export function resolveMissionParallelPlan(mission) {
  const directives = parseMissionConstraintDirectives(mission);
  const explicitKinds = [...new Set(directives.parallelSpecialists)].slice(0, MAX_PARALLEL_SPECIALISTS);
  const profile = directives.orchestrationProfileId
    ? resolveOrchestrationProfile({
        deliverableType: mission?.deliverableType,
        mode: mission?.mode,
        profileId: directives.orchestrationProfileId,
      })
    : null;
  const effectiveKinds = [...new Set(explicitKinds.length ? explicitKinds : profile?.parallelSpecialistKinds || [])]
    .slice(0, MAX_PARALLEL_SPECIALISTS);
  const source = explicitKinds.length
    ? profile
      ? 'profile-with-explicit-specialists'
      : 'explicit-specialists'
    : profile
      ? 'orchestration-profile'
      : 'none';

  return {
    directives,
    effectiveKinds,
    orchestrationProfile: createOrchestrationProfileMetadata(profile, {
      effectiveKinds,
      source,
    }),
    source,
  };
}

export function getOrchestrationQualityGateRequiredKinds(profile, requiredKinds = []) {
  const qualityGate = normalizeText(profile?.qualityGate);
  const availableKinds = normalizeStringList(
    requiredKinds.length ? requiredKinds : profile?.parallelSpecialistKinds || [],
  ).filter((kind) => SPECIALIST_KINDS.includes(kind));

  if (qualityGate === 'verification-signal-required') {
    return availableKinds.filter((kind) => kind === 'verification');
  }

  if (qualityGate === 'research-and-verification-signal-required') {
    return availableKinds.filter((kind) => ['research', 'verification'].includes(kind));
  }

  return [];
}

export function evaluateParallelQualityGate({ latestByKind, orchestrationProfile, requiredKinds = [] }) {
  const profile = orchestrationProfile || null;
  const qualityGate = normalizeText(profile?.qualityGate);

  if (!profile || !qualityGate) {
    return {
      latestViolation: null,
      qualityGate: null,
      requiredKinds: [],
      rerunKinds: [],
      status: 'none',
      violationCount: 0,
      violations: [],
    };
  }

  const gateKinds = getOrchestrationQualityGateRequiredKinds(profile, requiredKinds);
  if (qualityGate === 'manager-merge-ready' || !gateKinds.length) {
    return {
      latestViolation: null,
      qualityGate,
      requiredKinds: gateKinds,
      rerunKinds: [],
      status: 'passed',
      violationCount: 0,
      violations: [],
    };
  }

  const violations = gateKinds
    .map((specialistKind) => {
      const run = latestByKind.get(specialistKind) || null;
      const actualStatus = run ? normalizeAgentRunStatus(run.status) : 'missing';
      if (actualStatus === 'completed') {
        return null;
      }

      const profileLabel = normalizeText(profile.displayName, profile.id || 'selected profile');
      return {
        actualStatus,
        at: normalizeText(run?.endedAt || run?.startedAt || ''),
        detail: `${profileLabel} requires a completed ${specialistKind} specialist signal before merge. Latest status=${actualStatus}.`,
        parallelGroupId: normalizeText(run?.parallelGroupId) || null,
        requiredStatus: 'completed',
        runId: normalizeText(run?.id) || null,
        sessionId: normalizeText(run?.sessionId) || null,
        sourceRun: run,
        specialistKind,
        status: actualStatus === 'failed' ? 'failed' : 'blocked',
      };
    })
    .filter(Boolean)
    .sort((left, right) => String(left.at || '').localeCompare(String(right.at || '')));

  return {
    latestViolation: violations.at(-1) || null,
    qualityGate,
    requiredKinds: gateKinds,
    rerunKinds: [...new Set(violations.map((item) => item.specialistKind))],
    status: violations.length ? 'blocked' : 'passed',
    violationCount: violations.length,
    violations,
  };
}
