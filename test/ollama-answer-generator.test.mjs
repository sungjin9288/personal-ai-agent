import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';

import {
  createOllamaAnswerGenerator,
  LOCAL_ANSWER_PROMPT_VERSION,
} from '../src/core/ollama-answer-generator.mjs';

test('Ollama answer generator uses bounded loopback evidence and returns hash-only observation', async () => {
  let requestBody;
  const server = http.createServer(async (request, response) => {
    requestBody = JSON.parse(await readBody(request));
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({
      model: 'qwen2.5:3b',
      response: JSON.stringify({
        citedSourceKeys: ['memory:workspace/fact'],
        text: 'Prompt normalization resolved provider drift for reviewer confirmation.',
      }),
    }));
  });
  await listen(server);
  try {
    const generator = createOllamaAnswerGenerator({
      endpoint: endpointFor(server),
      model: 'qwen2.5:3b',
    });
    const result = await generator.generate({
      objective: 'Explain the verified recovery.',
      retrievedItems: [{
        snippet: 'Prompt normalization resolved provider drift.',
        sourceLabel: 'workspace/fact',
        sourceType: 'memory',
      }],
    });

    assert.equal(result.answer.text.includes('provider drift'), true);
    assert.deepEqual(result.answer.citedSourceKeys, ['memory:workspace/fact']);
    assert.equal(result.observation.promptVersion, LOCAL_ANSWER_PROMPT_VERSION);
    assert.match(result.observation.inputHash, /^[a-f0-9]{64}$/);
    assert.match(result.observation.responseHash, /^[a-f0-9]{64}$/);
    assert.equal(result.observation.outputBytes > 0, true);
    assert.equal(JSON.stringify(result.observation).includes('provider drift'), false);
    assert.equal(requestBody.model, 'qwen2.5:3b');
    assert.equal(requestBody.options.temperature, 0);
    assert.equal(requestBody.options.seed, 42);
    assert.match(requestBody.system, /untrusted data/);
    assert.match(requestBody.prompt, /UNTRUSTED_INPUT_JSON/);
  } finally {
    await close(server);
  }
});

test('Ollama answer generator rejects remote endpoints, duplicate sources, and invalid output', async () => {
  const remote = createOllamaAnswerGenerator({
    endpoint: 'http://example.com',
    model: 'qwen2.5:3b',
  });
  await assert.rejects(
    () => remote.generate({
      objective: 'Explain the evidence.',
      retrievedItems: [{ sourceKey: 'memory:fact', snippet: 'Evidence.' }],
    }),
    /loopback HTTP origin/,
  );

  const duplicateServer = http.createServer((request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ response: '{}' }));
  });
  await listen(duplicateServer);
  try {
    const generator = createOllamaAnswerGenerator({
      endpoint: endpointFor(duplicateServer),
      model: 'qwen2.5:3b',
    });
    await assert.rejects(
      () => generator.generate({
        objective: 'Explain the evidence.',
        retrievedItems: [
          { sourceKey: 'memory:fact', snippet: 'First.' },
          { sourceKey: 'memory:fact', snippet: 'Second.' },
        ],
      }),
      /source keys must be unique/,
    );
    await assert.rejects(
      () => generator.generate({
        objective: 'Explain the evidence.',
        retrievedItems: [{ sourceKey: 'memory:fact', snippet: 'Evidence.' }],
      }),
      /invalid answer contract/,
    );
  } finally {
    await close(duplicateServer);
  }
});

function endpointFor(server) {
  return `http://127.0.0.1:${server.address().port}`;
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
}

function close(server) {
  return new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}
