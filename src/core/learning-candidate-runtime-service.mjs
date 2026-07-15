import {
  buildProviderFallbackLearningEvidence,
  formatLearningCandidateArtifactContent,
  formatProviderFallbackLearningSummary,
  hasProviderFallbackProviderFailure,
} from './learning-candidate-service.mjs';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function getLatestItem(items, fieldName = 'createdAt') {
  if (!items.length) {
    return null;
  }

  return [...items].sort((left, right) =>
    String(left[fieldName] || '').localeCompare(String(right[fieldName] || '')),
  ).at(-1);
}

export function createLearningCandidateRuntimeService({ fileSystem, now, store }) {
  function writeUpdatedLearningCandidateArtifact(candidate) {
    if (!candidate?.artifactPath) {
      return;
    }

    fileSystem.writeFileSync(candidate.artifactPath, formatLearningCandidateArtifactContent(candidate), 'utf8');
  }

  function attachProviderFallbackToLearningCandidate(candidate, providerFallback) {
    if (!candidate || !providerFallback) {
      return candidate || null;
    }

    const fallbackEvidence = buildProviderFallbackLearningEvidence(providerFallback);
    const shouldPromoteAsProviderLesson = hasProviderFallbackProviderFailure(providerFallback);
    const fallbackSummary = formatProviderFallbackLearningSummary(providerFallback);
    const updatedCandidate = store.updateLearningCandidate(candidate.id, (current) => ({
      ...current,
      evidence: {
        ...current.evidence,
        ...fallbackEvidence,
      },
      proposal: shouldPromoteAsProviderLesson
        ? {
            ...current.proposal,
            target: 'provider-policy',
          }
        : current.proposal,
      recordType: shouldPromoteAsProviderLesson ? 'provider-lesson' : current.recordType,
      summary: shouldPromoteAsProviderLesson && fallbackSummary ? fallbackSummary : current.summary,
      title: shouldPromoteAsProviderLesson
        ? `provider-lesson candidate for ${current.title.replace(/^.* candidate for /, '')}`
        : current.title,
      updatedAt: now(),
    }));

    writeUpdatedLearningCandidateArtifact(updatedCandidate);
    return updatedCandidate;
  }

  function attachProviderFallbackSummary(result, providerFallback) {
    const updatedCandidates = new Map();
    for (const attempt of ensureArray(providerFallback?.attempts)) {
      const attemptCandidate = getLatestItem(store.listLearningCandidates({ sessionId: attempt.sessionId }), 'createdAt');
      if (attemptCandidate) {
        const updatedCandidate = attachProviderFallbackToLearningCandidate(attemptCandidate, providerFallback);
        updatedCandidates.set(updatedCandidate.id, updatedCandidate);
      }
    }
    const resultCandidate = result?.learningCandidate?.id
      ? updatedCandidates.get(result.learningCandidate.id) ||
        attachProviderFallbackToLearningCandidate(result.learningCandidate, providerFallback)
      : null;

    return {
      ...result,
      learningCandidate: resultCandidate,
      providerFallback,
    };
  }

  return {
    attachProviderFallbackSummary,
    writeUpdatedLearningCandidateArtifact,
  };
}
