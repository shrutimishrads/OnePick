import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { rankCandidates, applyConstraintPatch } from '../core/scoring';
import { parseConstraintsWithBedrock, explainPickWithBedrock, warmupBedrock } from '../api/bedrock';
import { Constraints, Title, Viewer } from '../core/types';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Load fixtures
const titles: Title[] = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../data/catalogue.json'), 'utf8')
);
const defaultViewers: Viewer[] = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../data/viewers.json'), 'utf8')
);

// In-memory session state
let sessionConstraints: Constraints = {
  viewers: [...defaultViewers],
  watched: [],
  maxMinutes: undefined,
};

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  // API Endpoints
  if (url.pathname === '/api/state' && req.method === 'GET') {
    const candidates = rankCandidates(titles, sessionConstraints);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        constraints: sessionConstraints,
        allViewers: defaultViewers,
        candidates,
      })
    );
    return;
  }

  if (url.pathname === '/api/patch' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      let patch: any;
      try {
        patch = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
        return;
      }

      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Expected JSON object body' }));
        return;
      }

      if (patch.maxMinutes !== undefined) {
        if (typeof patch.maxMinutes !== 'number' || isNaN(patch.maxMinutes) || patch.maxMinutes <= 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid "maxMinutes": must be a positive number' }));
          return;
        }
      }

      if (patch.watched !== undefined) {
        if (!Array.isArray(patch.watched) || patch.watched.some((w: any) => typeof w !== 'string')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid "watched": must be an array of title IDs' }));
          return;
        }
      }

      if (patch.addedExcludes !== undefined) {
        if (!Array.isArray(patch.addedExcludes)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid "addedExcludes": must be an array' }));
          return;
        }
        for (const item of patch.addedExcludes) {
          if (!item || typeof item !== 'object' || typeof item.exclude !== 'string' || !item.exclude.trim()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid item in "addedExcludes": expected { exclude: string }' }));
            return;
          }
          if (item.viewerId !== undefined) {
            if (typeof item.viewerId !== 'string' || !defaultViewers.some((v) => v.id === item.viewerId)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: `Unknown viewer id in addedExcludes: "${item.viewerId}"` }));
              return;
            }
          }
        }
      }

      sessionConstraints = applyConstraintPatch(sessionConstraints, patch);
      const candidates = rankCandidates(titles, sessionConstraints);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          constraints: sessionConstraints,
          candidates,
        })
      );
    });
    return;
  }

  if (url.pathname === '/api/toggle-viewer' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      let parsed: any;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
        return;
      }

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Expected JSON object body' }));
        return;
      }

      const { viewerId } = parsed;
      if (typeof viewerId !== 'string' || !viewerId.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing or invalid "viewerId" field' }));
        return;
      }

      const knownViewer = defaultViewers.find((item) => item.id === viewerId);
      if (!knownViewer) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Unknown viewer id: "${viewerId}"` }));
        return;
      }

      const exists = sessionConstraints.viewers.some((v) => v.id === viewerId);
      if (exists) {
        sessionConstraints.viewers = sessionConstraints.viewers.filter((v) => v.id !== viewerId);
      } else {
        sessionConstraints.viewers.push(knownViewer);
      }
      const candidates = rankCandidates(titles, sessionConstraints);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ constraints: sessionConstraints, candidates }));
    });
    return;
  }

  if (url.pathname === '/api/voice-refine' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      let parsedBody: any;
      try {
        parsedBody = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
        return;
      }

      if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Expected JSON object body' }));
        return;
      }

      const { utterance } = parsedBody;
      if (typeof utterance !== 'string' || !utterance.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing or empty "utterance" field' }));
        return;
      }

      try {
        const parsed = await parseConstraintsWithBedrock({
          userUtterance: utterance,
          currentConstraints: sessionConstraints,
        });

        sessionConstraints = applyConstraintPatch(sessionConstraints, parsed.patch);
        const candidates = rankCandidates(titles, sessionConstraints);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            parsed,
            constraints: sessionConstraints,
            candidates,
          })
        );
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/explain' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { candidate } = JSON.parse(body);
        const explanation = await explainPickWithBedrock({
          candidate,
          viewers: sessionConstraints.viewers,
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(explanation));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/reset' && req.method === 'POST') {
    sessionConstraints = {
      viewers: [...defaultViewers],
      watched: [],
      maxMinutes: undefined,
    };
    const candidates = rankCandidates(titles, sessionConstraints);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ constraints: sessionConstraints, allViewers: defaultViewers, candidates }));
    return;
  }

  // Serve self-hosted fonts for offline TV display
  if (url.pathname.startsWith('/fonts/')) {
    const fontName = path.basename(url.pathname);
    const fontPath = path.resolve(__dirname, './fonts', fontName);
    if (fs.existsSync(fontPath)) {
      res.writeHead(200, {
        'Content-Type': 'font/woff2',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      res.end(fs.readFileSync(fontPath));
      return;
    }
  }

  // Serve local offline image and artwork assets (including posters subdirectory)
  if (url.pathname.startsWith('/assets/')) {
    const relPath = path.normalize(url.pathname.slice('/assets/'.length)).replace(/^(\.\.[\/\\])+/, '');
    const assetPath = path.join(__dirname, './assets', relPath);
    if (fs.existsSync(assetPath)) {
      const ext = path.extname(assetPath).toLowerCase();
      const contentType =
        ext === '.svg'
          ? 'image/svg+xml'
          : ext === '.png'
          ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      res.end(fs.readFileSync(assetPath));
      return;
    }
  }

  // Serve static HTML for the TV Simulator Frontend
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const htmlPath = path.resolve(__dirname, './index.html');
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(htmlPath));
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

export function resetSessionConstraints(): void {
  sessionConstraints = {
    viewers: [...defaultViewers],
    watched: [],
    maxMinutes: undefined,
  };
}

export { server };

if (process.argv[1] && process.argv[1].endsWith('server.ts') && !process.argv.some(a => a.includes('test'))) {
  server.listen(PORT, () => {
    console.log(`\n============================================================`);
    console.log(` 📺 OnePick Fire TV Simulator running at http://localhost:${PORT}`);
    console.log(`============================================================\n`);

    // Non-blocking warm-up call to initialize TLS connection and credentials
    warmupBedrock().catch(() => {});
  });
}
