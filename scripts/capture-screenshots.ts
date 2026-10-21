import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const OUT_DIR = path.resolve('docs', 'screenshots');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

class CDPClient {
  private ws!: WebSocket;
  private id = 1;
  private callbacks = new Map<number, (res: any) => void>();

  async connect(wsUrl: string) {
    this.ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.id && this.callbacks.has(msg.id)) {
        const cb = this.callbacks.get(msg.id)!;
        this.callbacks.delete(msg.id);
        cb(msg);
      }
    };
  }

  send(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve) => {
      const callId = this.id++;
      this.callbacks.set(callId, resolve);
      this.ws.send(JSON.stringify({ id: callId, method, params }));
    });
  }

  async eval(expr: string) {
    const res = await this.send('Runtime.evaluate', { expression: expr, awaitPromise: true });
    return res.result?.result?.value;
  }

  async captureScreenshot(outputPath: string) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(res.result.data, 'base64');
    fs.writeFileSync(outputPath, buf);
    console.log(`Saved screenshot: ${path.basename(outputPath)} (${buf.length} bytes)`);
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  // Start server in-process if not already running on port 3000
  try {
    const res = await fetch('http://127.0.0.1:3000/api/state');
    if (!res.ok) throw new Error('Not ok');
  } catch {
    console.log('Starting local OnePick server in-process on port 3000...');
    await import('../app/server');
    await sleep(800);
  }

  console.log('Launching headless browser at 1920x1080...');
  const port = 9333;
  const proc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1920,1080',
    'http://127.0.0.1:3000',
  ]);

  try {
    let pageWsUrl = '';
    for (let i = 0; i < 30; i++) {
      await sleep(300);
      try {
        const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
        const targets = await listRes.json();
        const page = targets.find((t: any) => t.type === 'page' && t.webSocketDebuggerUrl);
        if (page) {
          pageWsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch {}
    }

    if (!pageWsUrl) throw new Error('Could not find page target in browser CDP list');
    console.log('Connected to Page CDP at', pageWsUrl);

    const client = new CDPClient();
    await client.connect(pageWsUrl);

    await client.send('Page.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Reset session state to default viewers and no patches
    await fetch('http://127.0.0.1:3000/api/reset', { method: 'POST' });
    await client.eval(`(async () => { await loadState(); setScreen('viewers'); })()`);

    // Wait until viewers cards are rendered
    for (let i = 0; i < 30; i++) {
      await sleep(200);
      const ready = await client.eval(`
        Boolean(state && state.candidates && state.candidates.length > 0 && document.querySelectorAll('.viewer-card').length === 3)
      `);
      if (ready) break;
    }
    await sleep(400);

    // 1. Viewer Select Screenshot: Dedicated viewer selection screen with focus on first viewer card
    console.log('Capturing: viewer select screen...');
    await client.eval(`
      setScreen('viewers');
      const cards = document.querySelectorAll('.viewer-card');
      if (cards.length > 0) {
        cards.forEach(c => c.classList.remove('focused'));
        cards[0].classList.add('focused');
        cards[0].focus();
      }
    `);
    await sleep(400);
    await client.captureScreenshot(path.join(OUT_DIR, '01-viewer-select.png'));

    // 2. First Pick Screenshot: Transition to consensus screen, focus on primary 'Play' button
    console.log('Capturing: first pick screen...');
    await client.eval(`
      setScreen('consensus');
      document.querySelectorAll('.focused').forEach(e => e.classList.remove('focused'));
      const btnPlay = document.getElementById('btnPlay');
      if (btnPlay) {
        btnPlay.classList.add('focused');
        btnPlay.focus();
      }
    `);
    await sleep(600);
    await client.captureScreenshot(path.join(OUT_DIR, '02-first-pick.png'));

    // 3. After a Refinement: Mark Ember Tide as watched, get next consensus pick (The Clockwork Haven)
    console.log('Capturing: after refinement...');
    await client.eval(`(async () => { await applyPatch({ watched: ['t-ember-tide'] }); })()`);
    await sleep(800);
    await client.eval(`
      document.querySelectorAll('.focused').forEach(e => e.classList.remove('focused'));
      const btnWhy = document.getElementById('btnWhy');
      if (btnWhy) {
        btnWhy.classList.add('focused');
        btnWhy.focus();
      }
    `);
    await sleep(400);
    await client.captureScreenshot(path.join(OUT_DIR, '03-after-refinement.png'));

    // 4. Explanation Modal: Open Why This Pick dialog with WCAG contrast
    console.log('Capturing: explanation modal...');
    await client.eval(`openExplain()`);
    // Wait for explanation content to arrive
    for (let i = 0; i < 40; i++) {
      await sleep(250);
      const isReady = await client.eval(`
        document.getElementById('explainModal').classList.contains('visible') &&
        !document.getElementById('explainContent').textContent.includes('Evaluating') &&
        !document.getElementById('explainContent').textContent.includes('Loading')
      `);
      if (isReady) break;
    }
    await sleep(500);
    await client.captureScreenshot(path.join(OUT_DIR, '04-explanation-modal.png'));

    client.close();
    console.log('✅ All 4 screenshots captured successfully!');
  } finally {
    proc.kill();
  }
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error taking screenshots:', err);
    process.exit(1);
  });
