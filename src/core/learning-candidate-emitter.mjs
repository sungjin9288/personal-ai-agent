import { createId } from './id.mjs';
import {
  buildLearningCandidate,
  formatLearningCandidateArtifactContent,
} from './learning-candidate-service.mjs';

/**
 * Learning-candidate emit chain (creation half of the learning-candidate flow).
 *
 * Instantiated once inside createMissionService near the sibling store-factory
 * blocks. Owns `emitLearningCandidate` — the dedupe-then-persist path that turns
 * a completed session into a learning candidate plus its reviewer artifact.
 *
 * The candidate builder and artifact formatter live in
 * `learning-candidate-service.mjs` (imported here directly, exactly as
 * mission-service imports them). The shared writers/summaries that other closure
 * functions also depend on are INJECTED so they stay defined in mission-service:
 *   - `writeArtifact` (harness.writeArtifact — reused by every artifact writer)
 *   - `getSessionProviderFailureSummary` (fan-in > 1)
 *   - `writeUpdatedLearningCandidateArtifact` (five call sites in mission-service)
 */
export function createLearningCandidateEmitter({
  store,
  now,
  writeArtifact,
  getSessionProviderFailureSummary,
  writeUpdatedLearningCandidateArtifact,
}) {
  function emitLearningCandidate({
    mission,
    missionStatus = '',
    outcomeReason = '',
    providerFallback = null,
    providerId = '',
    reviewerVerdict = '',
    session,
    workspace,
  }) {
    const currentSession = store.getSession(session.id);
    const existingCandidate = store.listLearningCandidates({ sessionId: currentSession.id }).at(-1);

    if (existingCandidate) {
      return existingCandidate;
    }

    const candidate = store.saveLearningCandidate(
      buildLearningCandidate({
        agentRuns: store.listAgentRunsBySession(currentSession.id),
        artifacts: store.listArtifactsBySession(currentSession.id),
        at: now(),
        id: createId('learningcandidate'),
        mission,
        missionStatus: missionStatus || mission.status,
        outcomeReason,
        providerFallback,
        providerFailure: getSessionProviderFailureSummary(currentSession.id),
        providerId,
        reviewerVerdict,
        session: currentSession,
        workspace,
      }),
    );
    const artifact = writeArtifact({
      missionId: mission.id,
      sessionId: currentSession.id,
      role: 'reviewer',
      kind: 'learning-candidate',
      fileName: 'learning-candidate.json',
      title: 'Learning Candidate',
      content: formatLearningCandidateArtifactContent(candidate),
    });
    const updatedCandidate = store.updateLearningCandidate(candidate.id, (current) => ({
      ...current,
      artifactId: artifact.id,
      artifactPath: artifact.path,
      updatedAt: now(),
    }));

    writeUpdatedLearningCandidateArtifact(updatedCandidate);
    return updatedCandidate;
  }

  return {
    emitLearningCandidate,
  };
}
