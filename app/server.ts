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
      try {
        const patch = JSON.parse(body);
        sessionConstraints = applyConstraintPatch(sessionConstraints, patch);
        const candidates = rankCandidates(titles, sessionConstraints);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
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

  if (url.pathname === '/api/toggle-viewer' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { viewerId } = JSON.parse(body);
        const exists = sessionConstraints.viewers.some((v) => v.id === viewerId);
        if (exists) {
          sessionConstraints.viewers = sessionConstraints.viewers.filter((v) => v.id !== viewerId);
        } else {
          const v = defaultViewers.find((item) => item.id === viewerId);
          if (v) sessionConstraints.viewers.push(v);
        }
        const candidates = rankCandidates(titles, sessionConstraints);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ constraints: sessionConstraints, candidates }));
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/voice-refine' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { utterance } = JSON.parse(body);
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
        res.writeHead(500, { 'Content-Type': 'application/json' });
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
    res.end(JSON.stringify({ constraints: sessionConstraints, candidates }));
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

server.listen(PORT, () => {
  console.log(`\n============================================================`);
  console.log(` 📺 OnePick Fire TV Simulator running at http://localhost:${PORT}`);
  console.log(`============================================================\n`);

  // Non-blocking warm-up call to initialize TLS connection and credentials
  warmupBedrock().catch(() => {});
});
