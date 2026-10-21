import fs from 'node:fs';
import path from 'node:path';
import { Title } from '../core/types';

const cataloguePath = path.resolve(__dirname, '../data/catalogue.json');
const postersDir = path.resolve(__dirname, '../app/assets/posters');

if (!fs.existsSync(postersDir)) {
  fs.mkdirSync(postersDir, { recursive: true });
}

const titles: Title[] = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));

// Simple deterministic hash from string to seed PRNG
function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

// Linear congruential generator for reproducible deterministic values
function createPrng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Palette {
  bgStart: string;
  bgEnd: string;
  accent1: string;
  accent2: string;
  accent3: string;
}

function getPaletteForTitle(t: Title): Palette {
  const g = t.genres.join(' ').toLowerCase();
  const m = t.moods.join(' ').toLowerCase();

  if (g.includes('sci-fi') || m.includes('mind-bending')) {
    return {
      bgStart: '#080d1a',
      bgEnd: '#1e082b',
      accent1: '#00f2fe',
      accent2: '#9d4edd',
      accent3: '#4cc9f0',
    };
  }
  if (g.includes('horror')) {
    return {
      bgStart: '#0a0a0c',
      bgEnd: '#200508',
      accent1: '#e63946',
      accent2: '#ff0054',
      accent3: '#6a040f',
    };
  }
  if (g.includes('animation') || g.includes('family')) {
    return {
      bgStart: '#0c1329',
      bgEnd: '#2b103b',
      accent1: '#ffb703',
      accent2: '#fb8500',
      accent3: '#f72585',
    };
  }
  if (g.includes('action') || m.includes('thrilling')) {
    return {
      bgStart: '#0f1115',
      bgEnd: '#291207',
      accent1: '#ff6b35',
      accent2: '#f7c59f',
      accent3: '#ef233c',
    };
  }
  if (g.includes('mystery')) {
    return {
      bgStart: '#081214',
      bgEnd: '#0f2427',
      accent1: '#52b788',
      accent2: '#74c69d',
      accent3: '#b7e4c7',
    };
  }
  if (g.includes('comedy')) {
    return {
      bgStart: '#0e1724',
      bgEnd: '#2b1b17',
      accent1: '#f4a261',
      accent2: '#e76f51',
      accent3: '#e9c46a',
    };
  }
  // Default Drama
  return {
    bgStart: '#11141a',
    bgEnd: '#241b21',
    accent1: '#e26d5c',
    accent2: '#c9ada7',
    accent3: '#9a8c98',
  };
}

// Split title into lines that fit inside 540px width (safe margin x: 30..570)
function wrapTitleText(title: string, maxCharsPerLine = 16): string[] {
  const words = title.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const w of words) {
    if ((current + ' ' + w).trim().length <= maxCharsPerLine) {
      current = (current + ' ' + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function generateSvgForTitle(t: Title): string {
  const prng = createPrng(hashString(t.id));
  const pal = getPaletteForTitle(t);

  const gradAngle = Math.floor(prng() * 360);
  const titleLines = wrapTitleText(t.name);
  const tagline = t.tagline || '';

  // Calculate vertical placement inside safe area (y: 45 to 855)
  // Geometric composition sits in upper/mid area: y ~ 120..580
  // Title & tagline sit in lower area: y ~ 620..810

  const shapes: string[] = [];
  const shapeCount = 4 + Math.floor(prng() * 3);

  for (let i = 0; i < shapeCount; i++) {
    const type = prng();
    const cx = 100 + Math.floor(prng() * 400);
    const cy = 180 + Math.floor(prng() * 360);
    const col = i % 3 === 0 ? pal.accent1 : i % 3 === 1 ? pal.accent2 : pal.accent3;
    const opacity = (0.25 + prng() * 0.45).toFixed(2);

    if (type < 0.35) {
      // Concentric or orbital ring
      const r = 50 + Math.floor(prng() * 120);
      const strokeW = 2 + Math.floor(prng() * 8);
      shapes.push(
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="${strokeW}" opacity="${opacity}" />`
      );
    } else if (type < 0.7) {
      // Rotated abstract polygon / diamond / rectangle
      const w = 80 + Math.floor(prng() * 180);
      const h = 80 + Math.floor(prng() * 180);
      const rot = Math.floor(prng() * 90) - 45;
      shapes.push(
        `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="16" transform="rotate(${rot} ${cx} ${cy})" fill="${col}" opacity="${opacity}" />`
      );
    } else {
      // Atmospheric glowing soft orb
      const r = 90 + Math.floor(prng() * 140);
      shapes.push(
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" opacity="${(parseFloat(opacity) * 0.5).toFixed(2)}" filter="url(#glow-${t.id})" />`
      );
    }
  }

  // Top header metadata inside safe margin (y: 65)
  const metaText = `${t.year} • ${t.rating} • ${t.minutes} MIN`.toUpperCase();
  const genreText = t.genres.slice(0, 3).join(' • ').toUpperCase();

  // Title typography
  const titleFontSize = titleLines.length > 2 ? 38 : titleLines.length === 2 ? 44 : 50;
  const titleLineHeight = titleFontSize * 1.15;
  const startY = 660 - (titleLines.length - 1) * (titleLineHeight / 2);

  const titleSvgSpans = titleLines
    .map((line, idx) => `<tspan x="300" y="${Math.round(startY + idx * titleLineHeight)}">${line}</tspan>`)
    .join('');

  const taglineY = Math.min(825, Math.round(startY + titleLines.length * titleLineHeight + 24));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="100%" height="100%">
  <defs>
    <linearGradient id="bg-${t.id}" gradientTransform="rotate(${gradAngle})">
      <stop offset="0%" stop-color="${pal.bgStart}" />
      <stop offset="100%" stop-color="${pal.bgEnd}" />
    </linearGradient>
    <linearGradient id="overlay-${t.id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.3" />
      <stop offset="55%" stop-color="#000000" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.85" />
    </linearGradient>
    <filter id="glow-${t.id}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="40" result="blur" />
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="600" height="900" fill="url(#bg-${t.id})" />

  <!-- Deterministic Abstract Geometric Layer -->
  <g id="geometry-${t.id}">
    ${shapes.join('\n    ')}
  </g>

  <!-- Gradient Vignette Overlay -->
  <rect width="600" height="900" fill="url(#overlay-${t.id})" />

  <!-- 5% Safe Margin Content (x: 30..570, y: 45..855) -->

  <!-- Top Metadata Header -->
  <text x="300" y="70" text-anchor="middle" fill="${pal.accent1}" font-family="'Sora', sans-serif" font-size="14" font-weight="700" letter-spacing="4">
    ${metaText}
  </text>
  <text x="300" y="92" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-family="'Sora', sans-serif" font-size="12" font-weight="600" letter-spacing="2">
    ${genreText}
  </text>

  <!-- Decorative Minimal Grid Crosses -->
  <path d="M 45 60 L 55 60 M 50 55 L 50 65" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
  <path d="M 545 60 L 555 60 M 550 55 L 550 65" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
  <path d="M 45 845 L 55 845 M 50 840 L 50 850" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
  <path d="M 545 845 L 555 845 M 550 840 L 550 850" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />

  <!-- Title Heading -->
  <text text-anchor="middle" fill="#ffffff" font-family="'Syne', 'Sora', sans-serif" font-size="${titleFontSize}" font-weight="800" letter-spacing="-0.5">
    ${titleSvgSpans}
  </text>

  <!-- Title Accent Dash -->
  <line x1="260" y1="${Math.round(startY + titleLines.length * titleLineHeight)}" x2="340" y2="${Math.round(startY + titleLines.length * titleLineHeight)}" stroke="${pal.accent2}" stroke-width="3" stroke-linecap="round" />

  <!-- Tagline Text -->
  <text x="300" y="${taglineY}" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="'Sora', sans-serif" font-size="15" font-weight="400" font-style="italic">
    "${tagline}"
  </text>
</svg>
`;
}

function main() {
  console.log(`Generating 2:3 deterministic portrait SVG posters for ${titles.length} titles...`);
  for (const t of titles) {
    const svg = generateSvgForTitle(t);
    const outFile = path.join(postersDir, `${t.id}.svg`);
    fs.writeFileSync(outFile, svg, 'utf8');
  }
  console.log(`✅ Successfully generated ${titles.length} posters into app/assets/posters/`);
}

main();
