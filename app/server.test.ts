import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { server, resetSessionConstraints } from './server';

let testPort = 0;
let baseUrl = '';

function post(path: string, body: any, isRaw = false): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const payload = isRaw ? body : JSON.stringify(body);
    const req = http.request(
      `${baseUrl}${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let text = '';
        res.on('data', (c) => (text += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, data: JSON.parse(text) });
          } catch {
            resolve({ status: res.statusCode || 0, data: text });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

describe('Server Request Validation & Error Handling', () => {
  before(async () => {
    process.env.USE_BEDROCK = 'false';
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr) {
          testPort = addr.port;
          baseUrl = `http://localhost:${testPort}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    delete process.env.USE_BEDROCK;
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(() => {
    resetSessionConstraints();
  });

  describe('/api/toggle-viewer', () => {
    it('rejects malformed non-JSON body with 400', async () => {
      const res = await post('/api/toggle-viewer', '{ broken json...', true);
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error.includes('Malformed JSON'));
    });

    it('rejects non-object body with 400', async () => {
      const res = await post('/api/toggle-viewer', '"just-a-string"', true);
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error.includes('Expected JSON object body'));
    });

    it('rejects missing or empty viewerId with 400', async () => {
      const res = await post('/api/toggle-viewer', {});
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error.includes('viewerId'));
    });

    it('rejects unknown viewer ID with 400 and clear error message', async () => {
      const res = await post('/api/toggle-viewer', { viewerId: 'v-nonexistent-user' });
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error.includes('Unknown viewer id'));
    });

    it('accepts valid viewer ID and toggles viewer status', async () => {
      const res = await post('/api/toggle-viewer', { viewerId: 'v-areeba' });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data.candidates));
    });
  });

  describe('/api/patch', () => {
    it('rejects malformed non-JSON body with 400', async () => {
      const res = await post('/api/patch', 'not json', true);
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error.includes('Malformed JSON'));
    });

    it('rejects array body with 400', async () => {
      const res = await post('/api/patch', [1, 2, 3]);
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error.includes('Expected JSON object body'));
    });

    it('rejects invalid maxMinutes (negative number) with 400', async () => {
      const res = await post('/api/patch', { maxMinutes: -20 });
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error.includes('maxMinutes'));
    });

    it('rejects invalid watched (non-array) with 400', async () => {
      const res = await post('/api/patch', { watched: 'not-an-array' });
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error.includes('watched'));
    });

    it('rejects unknown viewer id in addedExcludes with 400', async () => {
      const res = await post('/api/patch', {
        addedExcludes: [{ viewerId: 'v-phantom-viewer', exclude: 'Horror' }],
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error.includes('Unknown viewer id in addedExcludes'));
    });

    it('accepts valid patch with 200', async () => {
      const res = await post('/api/patch', { maxMinutes: 100 });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.constraints.maxMinutes, 100);
    });
  });

  describe('/api/voice-refine', () => {
    it('rejects malformed non-JSON body with 400', async () => {
      const res = await post('/api/voice-refine', 'not json', true);
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error.includes('Malformed JSON'));
    });

    it('rejects missing utterance with 400', async () => {
      const res = await post('/api/voice-refine', {});
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error.includes('utterance'));
    });

    it('rejects empty whitespace utterance with 400', async () => {
      const res = await post('/api/voice-refine', { utterance: '   ' });
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error.includes('utterance'));
    });

    it('accepts valid utterance with 200 and returns parsed patch', async () => {
      const res = await post('/api/voice-refine', { utterance: 'under 90 minutes' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.parsed.patch.maxMinutes, 90);
    });
  });
});
