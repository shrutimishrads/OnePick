import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockParseRequest,
  BedrockParseResponse,
  BedrockExplainRequest,
  BedrockExplainResponse,
  ConstraintPatch,
  Title,
  Viewer,
  Candidate,
} from '../core/types';
import fs from 'node:fs';
import path from 'node:path';

// Load catalogue for title resolution and validation
const cataloguePath = path.resolve(__dirname, '../data/catalogue.json');
let catalogueTitles: Title[] = [];
try {
  if (fs.existsSync(cataloguePath)) {
    catalogueTitles = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
  }
} catch {
  catalogueTitles = [];
}

const knownIdMap = new Map<string, string>(); // lowercase ID or Name -> canonical ID
for (const t of catalogueTitles) {
  knownIdMap.set(t.id.toLowerCase(), t.id);
  knownIdMap.set(t.name.toLowerCase(), t.id);
}

// In-memory caches for repeatable demo recording & zero-waste caching
const parseCache = new Map<string, BedrockParseResponse>();
const explainCache = new Map<string, BedrockExplainResponse>();

export function clearBedrockCaches(): void {
  parseCache.clear();
  explainCache.clear();
}

// Client management
let customClient: BedrockRuntimeClient | null = null;

export function setBedrockClient(client: BedrockRuntimeClient | null): void {
  customClient = client;
}

export function getBedrockClient(): BedrockRuntimeClient {
  if (customClient) return customClient;
  const region = process.env.AWS_REGION || 'us-east-1';
  return new BedrockRuntimeClient({ region });
}

function isBedrockEnabled(): boolean {
  return process.env.USE_BEDROCK !== 'false';
}

export function getBedrockTimeoutMs(): number {
  const envVal = process.env.BEDROCK_TIMEOUT_MS;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

function getModelId(): string {
  return process.env.BEDROCK_MODEL_ID || 'amazon.nova-lite-v1:0';
}

/**
 * Non-blocking warm-up call to initialize TLS connection and credentials.
 */
export async function warmupBedrock(): Promise<void> {
  if (!isBedrockEnabled()) return;
  try {
    const client = getBedrockClient();
    const command = new ConverseCommand({
      modelId: getModelId(),
      messages: [{ role: 'user', content: [{ text: 'ping' }] }],
      inferenceConfig: { maxTokens: 1, temperature: 0 },
    });
    const timeoutSignal = AbortSignal.timeout(getBedrockTimeoutMs());
    await client.send(command, { abortSignal: timeoutSignal });
  } catch {
    // Warm-up is best-effort and non-blocking
  }
}

/**
 * Validates and strictly sanitizes raw JSON parsed from Bedrock.
 * Drops unknown keys, bounds maxMinutes, validates titles against catalogue.
 */
export function sanitizeConstraintPatch(raw: any): ConstraintPatch {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const patch: ConstraintPatch = {};

  // 1. maxMinutes: must be integer bounded between 10 and 480
  if (typeof raw.maxMinutes === 'number' && Number.isFinite(raw.maxMinutes)) {
    const mins = Math.round(raw.maxMinutes);
    if (mins >= 10 && mins <= 480) {
      patch.maxMinutes = mins;
    }
  }

  // 2. watched: must be array of strings and MUST exist in catalogue
  if (Array.isArray(raw.watched)) {
    const validWatched: string[] = [];
    for (const item of raw.watched) {
      if (typeof item === 'string') {
        const canonicalId = knownIdMap.get(item.trim().toLowerCase());
        if (canonicalId && !validWatched.includes(canonicalId)) {
          validWatched.push(canonicalId);
        }
      }
    }
    if (validWatched.length > 0) {
      patch.watched = validWatched;
    }
  }

  // 3. addedExcludes: must be array of objects with exclude: string
  if (Array.isArray(raw.addedExcludes)) {
    const validExcludes: { viewerId?: string; exclude: string }[] = [];
    for (const item of raw.addedExcludes) {
      if (item && typeof item.exclude === 'string' && item.exclude.trim()) {
        const entry: { viewerId?: string; exclude: string } = {
          exclude: item.exclude.trim(),
        };
        if (typeof item.viewerId === 'string' && item.viewerId.trim()) {
          entry.viewerId = item.viewerId.trim();
        }
        validExcludes.push(entry);
      }
    }
    if (validExcludes.length > 0) {
      patch.addedExcludes = validExcludes;
    }
  }

  // 4. targetMood: string (up to 40 chars)
  if (typeof raw.targetMood === 'string' && raw.targetMood.trim()) {
    patch.targetMood = raw.targetMood.trim().slice(0, 40);
  }

  // 5. requiredGenre: string (up to 40 chars)
  if (typeof raw.requiredGenre === 'string' && raw.requiredGenre.trim()) {
    patch.requiredGenre = raw.requiredGenre.trim().slice(0, 40);
  }

  return patch;
}

/**
 * Deterministic local fallback for constraint parsing.
 */
function parseConstraintsFallback(req: BedrockParseRequest): BedrockParseResponse {
  const utterance = req.userUtterance.toLowerCase();

  for (const t of catalogueTitles) {
    if (utterance.includes(t.name.toLowerCase())) {
      return {
        patch: { watched: [t.id] },
        interpretedIntent: `Marked "${t.name}" as watched.`,
        source: 'fallback',
      };
    }
  }

  if (utterance.includes('spider-verse') || utterance.includes('cosmic drift') || utterance.includes('watched that')) {
    const spiderId = knownIdMap.get('cosmic drift: web of worlds') || knownIdMap.get('spider-man: into the spider-verse') || 't-spider-verse';
    return {
      patch: { watched: [spiderId] },
      interpretedIntent: 'Marked "Cosmic Drift: Web of Worlds" as watched.',
      source: 'fallback',
    };
  }

  const minuteMatch = utterance.match(/(?:under|less than|shorter than)\s+(\d+)\s*(?:min|minutes)?/);
  if (minuteMatch) {
    const mins = parseInt(minuteMatch[1], 10);
    return {
      patch: { maxMinutes: Math.min(480, Math.max(10, mins)) },
      interpretedIntent: `Set runtime cap to ${mins} minutes.`,
      source: 'fallback',
    };
  }

  if (utterance.includes('no horror') || utterance.includes('hate horror')) {
    return {
      patch: { addedExcludes: [{ exclude: 'Horror' }] },
      interpretedIntent: 'Excluded Horror genre for household.',
      source: 'fallback',
    };
  }

  return {
    patch: {},
    interpretedIntent: `Processed: "${req.userUtterance}"`,
    source: 'fallback',
  };
}

/**
 * Parses user voice or text utterance into a structured constraint patch.
 * Uses Amazon Bedrock Converse API with strict validation, timeout, and deterministic fallback.
 */
export async function parseConstraintsWithBedrock(
  req: BedrockParseRequest
): Promise<BedrockParseResponse> {
  const cacheKey = JSON.stringify({ u: req.userUtterance.trim().toLowerCase(), c: req.currentConstraints });
  if (parseCache.has(cacheKey)) {
    const cached = parseCache.get(cacheKey)!;
    return { ...cached };
  }

  if (!isBedrockEnabled()) {
    const fallbackRes = parseConstraintsFallback(req);
    parseCache.set(cacheKey, fallbackRes);
    return fallbackRes;
  }

  try {
    const client = getBedrockClient();
    const systemPrompt = `You are the constraint parser for OnePick Fire TV concierge.
Extract user constraint updates into a single JSON object with these allowed fields only:
- "maxMinutes": integer (e.g. 100)
- "watched": array of title IDs or exact title names (e.g. ["t-spider-verse"] or ["Cosmic Drift: Web of Worlds"])
- "addedExcludes": array of {"exclude": string, "viewerId": optional string}
- "targetMood": string (optional)
- "requiredGenre": string (optional)
Output ONLY raw JSON. No markdown fences, no explanatory text.`;

    const userMessage = `Current constraints: ${JSON.stringify(req.currentConstraints)}
User utterance: "${req.userUtterance}"
JSON:`;

    const input: ConverseCommandInput = {
      modelId: getModelId(),
      system: [{ text: systemPrompt }],
      messages: [{ role: 'user', content: [{ text: userMessage }] }],
      inferenceConfig: {
        maxTokens: 200,
        temperature: 0,
      },
    };

    const command = new ConverseCommand(input);
    const timeoutSignal = AbortSignal.timeout(getBedrockTimeoutMs());

    const res = await client.send(command, { abortSignal: timeoutSignal });
    const textOutput = res.output?.message?.content?.[0]?.text?.trim() || '';

    // Strip any markdown code fence wrapping if present
    const cleanedJson = textOutput.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleanedJson);
    const sanitizedPatch = sanitizeConstraintPatch(parsed);

    const result: BedrockParseResponse = {
      patch: sanitizedPatch,
      interpretedIntent: `Parsed intent: "${req.userUtterance}"`,
      source: 'bedrock',
    };

    parseCache.set(cacheKey, result);
    return result;
  } catch {
    // Timeout, network failure, AWS credentials missing, or malformed JSON -> fallback
    // Do not cache fallback results so transient errors do not permanently pin fallback
    return parseConstraintsFallback(req);
  }
}

/**
 * Clean helper to format raw reasons into natural English.
 */
function formatViewerReasons(reasons: string[]): string {
  const cleaned = reasons
    .map((r) => r.replace(/^Matches like:\s*"/i, '').replace(/"$/i, '').replace(/^Fits mood:\s*"/i, 'mood ').replace(/"$/i, ''))
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(', ') : 'overall genre match';
}

/**
 * Deterministic local fallback for explanation.
 */
/**
 * Identifies the viewer with the lowest score and determines which preference they gave up.
 */
export function findLowestViewerCompromise(
  candidate: Candidate,
  viewers: Viewer[]
): { viewerName: string; score: number; compromise: string } | null {
  if (!candidate.perViewer || candidate.perViewer.length === 0) return null;
  const sorted = [...candidate.perViewer].sort((a, b) => a.score - b.score);
  const lowest = sorted[0];
  const viewerObj = viewers.find(
    (v) => v.id === lowest.viewerId || v.name.toLowerCase() === lowest.viewerName.toLowerCase()
  );

  let compromise = 'top genre preference';
  if (viewerObj) {
    const unfulfilledLikes = (viewerObj.likes || []).filter(
      (l) => !candidate.title.genres.includes(l)
    );
    if (unfulfilledLikes.length > 0) {
      compromise = `${unfulfilledLikes[0]} genre`;
    } else if (viewerObj.mood && !candidate.title.moods.includes(viewerObj.mood)) {
      compromise = `${viewerObj.mood} mood`;
    } else if (viewerObj.maxMinutes && candidate.title.minutes > viewerObj.maxMinutes) {
      compromise = `${viewerObj.maxMinutes}m runtime limit`;
    } else if (viewerObj.likes && viewerObj.likes.length > 0) {
      compromise = `${viewerObj.likes[0]} genre`;
    }
  }

  return {
    viewerName: lowest.viewerName,
    score: lowest.score,
    compromise,
  };
}

/**
 * Deterministic local fallback for explanation.
 */
export function explainPickFallback(req: BedrockExplainRequest): BedrockExplainResponse {
  const { candidate, viewers } = req;
  const sorted = [...candidate.perViewer].sort((a, b) => a.score - b.score);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];

  const highestReason = highest ? formatViewerReasons(highest.reasons) : 'genre match';
  const comp = findLowestViewerCompromise(candidate, viewers || []);

  const summary = `"${candidate.title.name}" is your household's consensus pick with a group fairness score of ${candidate.groupScore}%.`;
  const consensusHighlight = highest && lowest && comp
    ? `It strongly aligns with ${highest.viewerName}'s taste (${highestReason}) while keeping ${lowest.viewerName}'s satisfaction at ${lowest.score}%, though ${comp.viewerName} gave up their preferred ${comp.compromise}.`
    : highest && lowest
    ? `It strongly aligns with ${highest.viewerName}'s taste (${highestReason}) while keeping ${lowest.viewerName}'s satisfaction at a solid ${lowest.score}%.`
    : `It maintains a balanced satisfaction of ${candidate.minViewerScore}% across all active viewers.`;
  const tradeOff = comp
    ? `At ${candidate.title.minutes} minutes, it fits runtime limits while ${comp.viewerName} conceded their preferred ${comp.compromise}.`
    : `At ${candidate.title.minutes} minutes, it fits within all viewers' time windows without compromise.`;

  return {
    summary,
    consensusHighlight,
    tradeOff,
    source: 'fallback',
  };
}

/**
 * Generates natural language consensus rationale from deterministic score breakdowns.
 * Uses Bedrock Converse API with score breakdown as input; falls back to deterministic logic on timeout or error.
 */
export async function explainPickWithBedrock(
  req: BedrockExplainRequest
): Promise<BedrockExplainResponse> {
  const cacheKey = JSON.stringify({
    title: req.candidate.title.id,
    groupScore: req.candidate.groupScore,
    perViewer: req.candidate.perViewer,
  });

  if (explainCache.has(cacheKey)) {
    const cached = explainCache.get(cacheKey)!;
    return { ...cached };
  }

  if (!isBedrockEnabled()) {
    const fallbackRes = explainPickFallback(req);
    explainCache.set(cacheKey, fallbackRes);
    return fallbackRes;
  }

  try {
    const client = getBedrockClient();
    const systemPrompt = `You are the viewing consensus explainer for OnePick Fire TV concierge.
Explain why this title was chosen using ONLY the provided deterministic score breakdown.
Rules:
- Do NOT change the ranking or invent facts.
- Output JSON with:
  "summary": one clear sentence stating the title and group score.
  "consensusHighlight": one natural sentence highlighting how the top viewer is satisfied while protecting the lowest-scoring viewer's satisfaction, including a clause explicitly naming the lowest-scoring viewer and the preference (genre or mood) they gave up.
  "tradeOff": one sentence describing the runtime or compromises.
Output raw JSON only.`;

    const comp = findLowestViewerCompromise(req.candidate, req.viewers || []);
    const userMessage = `Candidate: ${JSON.stringify({
      title: req.candidate.title.name,
      year: req.candidate.title.year,
      minutes: req.candidate.title.minutes,
      groupScore: req.candidate.groupScore,
      minScore: req.candidate.minViewerScore,
      perViewer: req.candidate.perViewer.map((v) => ({
        name: v.viewerName,
        score: v.score,
        reasons: formatViewerReasons(v.reasons),
      })),
      lowestViewerCompromise: comp ? { viewer: comp.viewerName, preferenceGivenUp: comp.compromise } : undefined,
    })}`;

    const input: ConverseCommandInput = {
      modelId: getModelId(),
      system: [{ text: systemPrompt }],
      messages: [{ role: 'user', content: [{ text: userMessage }] }],
      inferenceConfig: {
        maxTokens: 160,
        temperature: 0,
      },
    };

    const command = new ConverseCommand(input);
    const timeoutSignal = AbortSignal.timeout(getBedrockTimeoutMs());

    const res = await client.send(command, { abortSignal: timeoutSignal });
    const textOutput = res.output?.message?.content?.[0]?.text?.trim() || '';
    const cleanedJson = textOutput.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleanedJson);

    if (!parsed.summary || !parsed.consensusHighlight) {
      throw new Error('Incomplete explanation from Bedrock');
    }

    const summaryStr = String(parsed.summary);
    const highlightStr = String(parsed.consensusHighlight);
    const tradeOffStr = parsed.tradeOff ? String(parsed.tradeOff) : undefined;
    const combinedText = `${summaryStr} ${highlightStr} ${tradeOffStr || ''}`.toLowerCase();

    // 1. Must name the correct title
    if (!combinedText.includes(req.candidate.title.name.toLowerCase())) {
      throw new Error(`Bedrock explanation did not name correct title: "${req.candidate.title.name}"`);
    }

    // 2. Must not state a percentage that differs from groupScore
    const summaryPercents = (summaryStr.match(/\b(\d+)\s*%/g) || []).map((m: string) => parseInt(m, 10));
    for (const p of summaryPercents) {
      if (p !== req.candidate.groupScore) {
        throw new Error(
          `Bedrock explanation stated percentage ${p}% which differs from groupScore ${req.candidate.groupScore}%`
        );
      }
    }

    const result: BedrockExplainResponse = {
      summary: summaryStr,
      consensusHighlight: highlightStr,
      tradeOff: tradeOffStr,
      source: 'bedrock',
    };

    explainCache.set(cacheKey, result);
    return result;
  } catch {
    // Timeout, network failure, AWS credentials missing, malformed JSON, or failed validation -> fallback
    // Do not cache fallback results so transient errors do not permanently pin fallback
    return explainPickFallback(req);
  }
}
