import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  parseConstraintsWithBedrock,
  explainPickWithBedrock,
  setBedrockClient,
  clearBedrockCaches,
  sanitizeConstraintPatch,
  getBedrockTimeoutMs,
} from './bedrock';
import { Candidate, Constraints } from '../core/types';

describe('AWS Bedrock Client Integration & Validation', () => {
  beforeEach(() => {
    clearBedrockCaches();
    delete process.env.USE_BEDROCK;
  });

  it('strictly sanitizes constraint patches: bounds maxMinutes, drops non-catalogue titles and unknown keys', () => {
    const raw = {
      maxMinutes: 95.8,
      watched: ['Spider-Man: Into the Spider-Verse', 'non-existent-movie-xyz'],
      addedExcludes: [{ exclude: 'Horror' }, { exclude: 123 }],
      unknownHackerKey: 'drop_me',
      negativeMinutes: -40,
    };

    const sanitized = sanitizeConstraintPatch(raw);
    assert.strictEqual(sanitized.maxMinutes, 96);
    assert.deepStrictEqual(sanitized.watched, ['t-spider-verse']);
    assert.strictEqual(sanitized.addedExcludes?.length, 1);
    assert.strictEqual(sanitized.addedExcludes[0].exclude, 'Horror');
    assert.strictEqual((sanitized as any).unknownHackerKey, undefined);
  });

  it('handles mocked Bedrock Converse success for parse and explain', async () => {
    const mockClient = {
      send: async () => ({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  maxMinutes: 90,
                  watched: ['t-spider-verse'],
                }),
              },
            ],
          },
        },
      }),
    };

    setBedrockClient(mockClient as any);

    const parseRes = await parseConstraintsWithBedrock({
      userUtterance: 'Keep under 90 mins and skip Spider-Verse',
      currentConstraints: { viewers: [], watched: [] },
    });

    assert.strictEqual(parseRes.source, 'bedrock');
    assert.strictEqual(parseRes.patch.maxMinutes, 90);
    assert.deepStrictEqual(parseRes.patch.watched, ['t-spider-verse']);

    // Mock explain response
    const mockExplainClient = {
      send: async () => ({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  summary: 'Palm Springs is the group pick.',
                  consensusHighlight: 'Balances Maya and Alex.',
                  tradeOff: '90 minutes runtime.',
                }),
              },
            ],
          },
        },
      }),
    };
    setBedrockClient(mockExplainClient as any);

    const mockCandidate: Candidate = {
      title: {
        id: 't-palm-springs',
        name: 'Palm Springs',
        genres: ['Comedy', 'Sci-Fi'],
        moods: ['Breezy'],
        minutes: 90,
        rating: 'R',
        year: 2020,
        art: 'art.jpg',
      },
      groupScore: 75,
      minViewerScore: 70,
      perViewer: [
        { viewerId: 'v-maya', viewerName: 'Maya', score: 80, reasons: ['Sci-Fi'] },
      ],
    };

    const explainRes = await explainPickWithBedrock({
      candidate: mockCandidate,
      viewers: [],
    });

    assert.strictEqual(explainRes.source, 'bedrock');
    assert.strictEqual(explainRes.summary, 'Palm Springs is the group pick.');
  });

  it('falls back to deterministic logic on malformed JSON without throwing', async () => {
    const mockClient = {
      send: async () => ({
        output: {
          message: {
            content: [{ text: 'Here is your JSON: { invalid json...' }],
          },
        },
      }),
    };

    setBedrockClient(mockClient as any);

    const parseRes = await parseConstraintsWithBedrock({
      userUtterance: 'keep it under 85 minutes',
      currentConstraints: { viewers: [], watched: [] },
    });

    assert.strictEqual(parseRes.source, 'fallback');
    assert.strictEqual(parseRes.patch.maxMinutes, 85);
  });

  it('falls back to deterministic logic on timeout without throwing', async () => {
    const mockClient = {
      send: async () => {
        const error = new Error('The operation was aborted');
        error.name = 'TimeoutError';
        throw error;
      },
    };

    setBedrockClient(mockClient as any);

    const parseRes = await parseConstraintsWithBedrock({
      userUtterance: 'no horror movies please',
      currentConstraints: { viewers: [], watched: [] },
    });

    assert.strictEqual(parseRes.source, 'fallback');
    assert.deepStrictEqual(parseRes.patch.addedExcludes, [{ exclude: 'Horror' }]);
  });

  it('serves repeatable cached response on cache hit', async () => {
    let callCount = 0;
    const mockClient = {
      send: async () => {
        callCount++;
        return {
          output: {
            message: {
              content: [
                {
                  text: JSON.stringify({ maxMinutes: 100 }),
                },
              ],
            },
          },
        };
      },
    };

    setBedrockClient(mockClient as any);

    const req = {
      userUtterance: 'under 100 minutes',
      currentConstraints: { viewers: [], watched: [] },
    };

    const res1 = await parseConstraintsWithBedrock(req);
    const res2 = await parseConstraintsWithBedrock(req);

    assert.strictEqual(callCount, 1, 'Second invocation should be served from memory cache');
    assert.deepStrictEqual(res1, res2);
  });

  it('does NOT cache failed Bedrock calls so subsequent retries can succeed', async () => {
    let callCount = 0;
    const mockClient = {
      send: async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Transient TLS / network failure');
        }
        return {
          output: {
            message: {
              content: [{ text: JSON.stringify({ maxMinutes: 75 }) }],
            },
          },
        };
      },
    };

    setBedrockClient(mockClient as any);

    const req = {
      userUtterance: 'under 75 minutes',
      currentConstraints: { viewers: [], watched: [] },
    };

    // First call fails -> should return fallback, but NOT cache it
    const res1 = await parseConstraintsWithBedrock(req);
    assert.strictEqual(res1.source, 'fallback');

    // Second call succeeds -> should return bedrock result
    const res2 = await parseConstraintsWithBedrock(req);
    assert.strictEqual(res2.source, 'bedrock');
    assert.strictEqual(res2.patch.maxMinutes, 75);
    assert.strictEqual(callCount, 2);
  });

  it('respects BEDROCK_TIMEOUT_MS environment variable', () => {
    assert.strictEqual(getBedrockTimeoutMs(), 3000);

    process.env.BEDROCK_TIMEOUT_MS = '1500';
    assert.strictEqual(getBedrockTimeoutMs(), 1500);

    delete process.env.BEDROCK_TIMEOUT_MS;
    assert.strictEqual(getBedrockTimeoutMs(), 3000);
  });

  it('falls back if explain output does not name the correct title or contradicts groupScore', async () => {
    const mockCandidate: Candidate = {
      title: {
        id: 't-spider-verse',
        name: 'Spider-Man: Into the Spider-Verse',
        genres: ['Animation', 'Action'],
        moods: ['Exhilarating'],
        minutes: 117,
        rating: 'PG',
        year: 2018,
        art: 'art.jpg',
      },
      groupScore: 86,
      minViewerScore: 85,
      perViewer: [
        { viewerId: 'v-maya', viewerName: 'Maya', score: 85, reasons: ['Animation'] },
      ],
    };

    // 1. Hallucinated wrong title name
    setBedrockClient({
      send: async () => ({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  summary: 'Arrival is your household pick with 86% score.',
                  consensusHighlight: 'Everyone likes it.',
                }),
              },
            ],
          },
        },
      }),
    } as any);

    const explain1 = await explainPickWithBedrock({ candidate: mockCandidate, viewers: [] });
    assert.strictEqual(explain1.source, 'fallback', 'Must fall back if wrong title is named');

    // 2. Contradicted groupScore percentage (claims 50% instead of 86%)
    clearBedrockCaches();
    setBedrockClient({
      send: async () => ({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  summary: 'Spider-Man: Into the Spider-Verse is your pick with 50% group score.',
                  consensusHighlight: 'Balances preferences.',
                }),
              },
            ],
          },
        },
      }),
    } as any);

    const explain2 = await explainPickWithBedrock({ candidate: mockCandidate, viewers: [] });
    assert.strictEqual(explain2.source, 'fallback', 'Must fall back if percentage contradicts groupScore');
  });
});
