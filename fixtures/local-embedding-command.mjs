import process from 'node:process';

const EMBEDDING_PROTOCOL_VERSION = 'personal-ai-agent-embedding/v1';

const CONCEPTS = [
  {
    strong: ['authentication', 'credential', 'expired', 'expiry', 'renew', 'renewal', 'recovery', 'timeout', 'token'],
    weak: ['login', 'sign-in'],
  },
  {
    strong: ['color', 'font', 'layout', 'page', 'theme', 'typography', 'visual'],
    weak: ['dashboard', 'screen'],
  },
  {
    strong: ['charge', 'payment', 'refund', 'reimbursement', 'reverse', 'reversal'],
    weak: ['purchase'],
  },
  {
    strong: ['analytics', 'chart', 'graph', 'metric', 'report'],
    weak: ['dashboard'],
  },
  {
    strong: ['handoff', 'missed', 'overdue', 'ownership', 'transfer'],
    weak: ['deadline', 'owner'],
  },
  {
    strong: ['calendar', 'holiday', 'meeting', 'office', 'schedule'],
    weak: ['deadline'],
  },
];

function embedText(value) {
  const text = String(value || '').toLowerCase();
  return CONCEPTS.map(({ strong, weak }) => {
    const strongScore = strong.reduce((sum, term) => sum + (text.includes(term) ? 2 : 0), 0);
    const weakScore = weak.reduce((sum, term) => sum + (text.includes(term) ? 0.25 : 0), 0);
    return strongScore + weakScore;
  });
}

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
}

const request = JSON.parse(input);
if (request.schemaVersion !== EMBEDDING_PROTOCOL_VERSION) {
  throw new Error(`Unsupported embedding schema: ${request.schemaVersion}`);
}

const vectors = request.texts.map(embedText);
process.stdout.write(
  JSON.stringify({
    dimensions: CONCEPTS.length,
    modelId: 'fixture-semantic-map-v1',
    schemaVersion: EMBEDDING_PROTOCOL_VERSION,
    vectors,
  }),
);
