import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const docs = {
  caseStudy: readDoc('case-study.md'),
  interviewStory: readDoc('interview-story.md'),
  projectCard: readDoc('project-card.md'),
  resumeBullets: readDoc('resume-bullets.md'),
};

assert.equal(
  packageJson.scripts['smoke:portfolio-docs-claim-boundary'],
  'node scripts/smoke-portfolio-docs-claim-boundary.mjs',
);

const combined = Object.entries(docs)
  .map(([name, text]) => `# ${name}\n${text}`)
  .join('\n\n');

for (const placeholder of ['확인 필요', '추가 필요']) {
  assert.equal(combined.includes(placeholder), false, `portfolio docs still contain placeholder: ${placeholder}`);
}

for (const term of [
  'provider-scoped pilot',
  'production-ready',
  'Representative Demo: Release Readiness Evidence Walkthrough',
  'evidence/cli-logs/representative-release-demo-replay.log',
  'evidence/screenshots/representative-release-demo-release-status.png',
  'evidence/screenshots/operator-surface-mission-run.png',
  'evidence/screenshots/operator-surface-provider-readiness.png',
  'evidence/screenshots/operator-surface-action-inbox.png',
  'evidence/output-artifacts/operator-surface-demo-browser-report.json',
  'npm run evidence:operator-surface-demo',
]) {
  assertContains(combined, term, `portfolio docs missing ${term}`);
}

assertContains(docs.projectCard, 'public hosted demo 없음', 'project card must not imply hosted demo exists');
assertContains(docs.projectCard, '저장소 기준 설명 범위', 'project card must scope contribution wording to repository evidence');
assertContains(docs.projectCard, 'operator surface browser screenshots', 'project card must reflect completed operator surface screenshots');
assertContains(docs.caseStudy, 'representative demo evidence smoke', 'case study must mention representative evidence verification');
assertContains(docs.caseStudy, 'operator surface screenshot', 'case study must reflect completed browser evidence');
assertContains(docs.interviewStory, 'Portfolio Overview', 'interview story must reflect README overview improvement');
assertContains(docs.interviewStory, 'operator surface browser screenshots', 'interview story must reflect completed browser evidence');
assertContains(docs.resumeBullets, '최근 보완 완료', 'resume bullets must reflect completed portfolio improvements');
assertContains(docs.resumeBullets, 'operator surface browser screenshots/report', 'resume bullets must reflect completed operator surface browser evidence');

for (const stale of [
  'mission run flow, provider readiness/status, action inbox는 추가 screenshot을 보강하면 좋다',
  'demo deployment, portfolio screenshots',
]) {
  assert.equal(combined.includes(stale), false, `portfolio docs contain stale future-evidence wording: ${stale}`);
}

for (const risky of [
  '현재 상태: Production-ready',
  'Hosted SaaS service 완성 상태',
  '모든 LLM provider live validation 완료 상태',
  'all-provider readiness matrix 구축 완료',
]) {
  assert.equal(combined.includes(risky), false, `portfolio docs contain risky unscoped claim: ${risky}`);
}

console.log(
  JSON.stringify(
    {
      mode: 'portfolio-docs-claim-boundary-smoke',
      ok: true,
      checkedDocs: Object.keys(docs),
    },
    null,
    2,
  ),
);

function readDoc(fileName) {
  return fs.readFileSync(path.join(repoDir, 'docs', fileName), 'utf8');
}

function assertContains(text, needle, message) {
  assert.ok(String(text || '').includes(needle), message);
}
