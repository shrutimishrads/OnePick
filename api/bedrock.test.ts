import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  parseConstraintsWithBedrock,
  explainPickWithBedrock,
  setBedrockClient,
  clearBedrockCaches,
  sanitizeConstraintPatch,
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
});
