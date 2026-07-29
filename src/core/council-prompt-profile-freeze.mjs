import { createHash } from 'node:crypto';

import { buildRequestPrompt } from '../providers/structured-provider-utils.mjs';
import { hashLocalCouncilShadowValue } from './local-council-provider-shadow.mjs';

const seats = ['research', 'implementation', 'verification'];

export const FROZEN_COUNCIL_PROMPT_PROFILES = Object.freeze({
  'seat-scoped-v1': [[1425, '38852075c869f03d6247a1d4eb4e418577df4c815d172693330e2d94bfb9beaf'], [1440, '86d004102a46f8c5f2b87f3b609608e60c3cbcbc998350747ddb35938e0fd7db'], [1417, '32ce02c870ffc8638f3c58abe39f5c2efacff971d8f303b834e55b76c6c6492f'], [1438, '1c98145444bf88bd29f8a543a912d0a2728fdaa42b7beee09a278457aa4601d4'], [1449, '858a4e76b385a8ae7356df1e9b29c9276527d0fadcb0089bdf27dfc1bd9c866b'], [1418, 'dcdd2b4bb7a5ad74ed06ff8cb685b61f64b495f2fb1cffbd6067496f2dc227a3'], [1114, 'fd36393154f8776fdcb4b3c9895a366411f178d7574a1a8487fe1f86b4cdf1ff']],
  'seat-scoped-v2': [[1678, '183061704a2dbdebfdbd86efed011f0fb692884e5226212d7aacf695c088d849'], [1693, '1d20ac00de2217461e4bca6b6d07b91099dc005deba4e2603cc10c9081d5a64b'], [1670, '57361dada0c57f67ceaccc60fd77a85685fbd30de00e7c43e38ff2c3c13838f9'], [1690, '61d5d159688acea5f715c47159fb2e295f73d05397f18528750dd55627c1c1b0'], [1701, '413532ba22323fb7286ae16f98d2ddc042242434b69af9d052838771ece50499'], [1670, '553f83d3ad3202de70faa27ecba30e9d660836054b22513247c55730f630d5c9'], [1114, 'fd36393154f8776fdcb4b3c9895a366411f178d7574a1a8487fe1f86b4cdf1ff']],
  'seat-scoped-v3': [[1531, 'f35171a31057f1958327273efeeee8b8b140b9dbab09185a05a44367db2244dc'], [1546, '750815aa5fff7f8234b382e35b9358e42c7aeb1e5f618ac9b80e68a52c2bb20d'], [1523, '7e94eed44cd9853793417d422e269fbcc2242b480bb36bdeb9a397ad4b32d6ab'], [1546, '34c02f2de13acdb6cb0429f5291125a84f7d64d2716433aa78d945ab85f1a9ef'], [1557, '579e25e3be831b41a3787aa520708d1026d07b3c6a7ee6ef92a9c74edf4b7782'], [1526, 'dbdefed1b8f150dc43a1c217d8fbfead09bdc8500528c1eeb762f51c72553c71'], [1114, 'fd36393154f8776fdcb4b3c9895a366411f178d7574a1a8487fe1f86b4cdf1ff']],
  'seat-scoped-v4': [[1531, 'f35171a31057f1958327273efeeee8b8b140b9dbab09185a05a44367db2244dc'], [1546, '750815aa5fff7f8234b382e35b9358e42c7aeb1e5f618ac9b80e68a52c2bb20d'], [1523, '7e94eed44cd9853793417d422e269fbcc2242b480bb36bdeb9a397ad4b32d6ab'], [1546, '34c02f2de13acdb6cb0429f5291125a84f7d64d2716433aa78d945ab85f1a9ef'], [1557, '579e25e3be831b41a3787aa520708d1026d07b3c6a7ee6ef92a9c74edf4b7782'], [1526, 'dbdefed1b8f150dc43a1c217d8fbfead09bdc8500528c1eeb762f51c72553c71'], [2189, '11a98b41ccdfcc538f1689cd523bdfe6165b2b9372dcd7436124ad43613a7feb']],
  'seat-scoped-v5': [[1421, '9423a53ba0c7858619db41bccd9311a3f6fa672a3db0a2881409e3b01ac7f477'], [1433, '464f8c6f0943aa2730f1caabf3442a13d63dd9a2d919ef85cc4a763f8de6bb51'], [1429, '0e0999a3f9023c447409478bdae024fb0a4ac5acbfb1ea236d856a3441469586'], [1473, '4a46a0fc2264705f15090c9e869debf7ee4d135fe125a66d9282b1e7b268514b'], [1481, '1ab48aadb7cb5b951d0680594bef7282dfcf691b786b7a5bb42ee05166b13620'], [1469, 'b437e4ba8e11e34af1078b2dfb4c51bc82c2403826b670b3c690256f9d96ea14'], [2189, '11a98b41ccdfcc538f1689cd523bdfe6165b2b9372dcd7436124ad43613a7feb']],
});

export function assertFrozenCouncilPromptProfiles() {
  for (const [profile, frozen] of Object.entries(FROZEN_COUNCIL_PROMPT_PROFILES)) {
    const actual = frozenCouncilPromptInputs().map((input) => {
      const prompt = buildRequestPrompt({ ...input, councilPromptProfile: profile }, 'Council Context');
      return [Buffer.byteLength(prompt, 'utf8'), createHash('sha256').update(prompt).digest('hex')];
    });
    if (JSON.stringify(actual) !== JSON.stringify(frozen)) {
      throw new Error(`${profile} prompt bytes or hashes changed.`);
    }
  }
  return { digest: hashLocalCouncilShadowValue(FROZEN_COUNCIL_PROMPT_PROFILES), profiles: Object.keys(FROZEN_COUNCIL_PROMPT_PROFILES), stagesPerProfile: 7 };
}

export function frozenCouncilPromptInputs() {
  const openings = seats.map((councilSeatId) => ({
    councilFrame: { evidenceCatalog: [{ id: 'artifact:bounded-plan' }, { id: 'artifact:verification-record' }] }, councilPhase: 'opening-position', councilSeatId, role: 'specialist',
  }));
  const rebuttals = seats.map((councilSeatId) => ({
    councilBrief: { claims: seats.map((seatId) => ({ id: `${seatId}:claim-1`, seatId })), evidenceRefs: ['artifact:bounded-plan', 'artifact:verification-record'] }, councilPhase: 'rebuttal', councilSeatId, role: 'specialist',
  }));
  return [...openings, ...rebuttals, {
    councilPhase: 'synthesis', councilSeatId: 'chair', role: 'executor',
    councilRuntime: { artifactFileName: 'local-council-shadow-decision.md', artifactTitle: 'Local Council Shadow Decision', nextAction: 'Keep the default profile unchanged pending independent review.' },
    councilSynthesisInput: { brief: { claims: seats.map((seatId) => ({ id: `${seatId}:claim-1`, seatId })), evidenceRefs: ['artifact:bounded-plan', 'artifact:verification-record'] }, rebuttals: seats.map((seatId) => ({ councilStatement: { claims: [{ id: `${seatId}:claim-2` }] } })) },
  }];
}
