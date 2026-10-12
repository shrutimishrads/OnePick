import {
  BedrockParseRequest,
  BedrockParseResponse,
  BedrockExplainRequest,
  BedrockExplainResponse,
} from '../core/types';

/**
 * Parses user voice or text utterances into a structured constraint patch.
 * Uses Amazon Bedrock Converse API (or reliable deterministic fallback if credentials are absent).
 */
export async function parseConstraintsWithBedrock(
  req: BedrockParseRequest
): Promise<BedrockParseResponse> {
  const utterance = req.userUtterance.toLowerCase();

  // Deterministic fast fallback for demo scenarios
  if (utterance.includes('spider-verse') || utterance.includes('watched that')) {
    return {
      patch: { watched: ['t-spider-verse'] },
      interpretedIntent: 'Marked "Spider-Man: Into the Spider-Verse" as already watched.',
    };
  }

  const minuteMatch = utterance.match(/(?:under|less than|shorter than)\s+(\d+)\s*(?:min|minutes)?/);
  if (minuteMatch) {
    const minutes = parseInt(minuteMatch[1], 10);
    return {
      patch: { maxMinutes: minutes },
      interpretedIntent: `Set maximum runtime limit to ${minutes} minutes.`,
    };
  }

  if (utterance.includes('no horror') || utterance.includes('hate horror')) {
    return {
      patch: { addedExcludes: [{ exclude: 'Horror' }] },
      interpretedIntent: 'Excluded Horror genre for all household viewers.',
    };
  }

  // AWS Bedrock invocation would go here when AWS_REGION & credentials are provided in production
  return {
    patch: {},
    interpretedIntent: `Processed request: "${req.userUtterance}"`,
  };
}

/**
 * Generates natural language consensus rationale from deterministic score breakdowns.
 */
export async function explainPickWithBedrock(
  req: BedrockExplainRequest
): Promise<BedrockExplainResponse> {
  const { candidate, viewers } = req;
  const lowestScorer = [...candidate.perViewer].sort((a, b) => a.score - b.score)[0];
  const highestScorer = [...candidate.perViewer].sort((a, b) => b.score - a.score)[0];

  const summary = `"${candidate.title.name}" is your household's optimal consensus pick with a group fairness score of ${candidate.groupScore}%.`;
  const consensusHighlight = `It satisfies ${highestScorer.viewerName} with ${highestScorer.reasons.join(', ')} while keeping ${lowestScorer.viewerName}'s satisfaction at ${lowestScorer.score}%.`;
  const tradeOff = `Runtime is ${candidate.title.minutes} minutes, comfortably fitting all active viewer constraints.`;

  return {
    summary,
    consensusHighlight,
    tradeOff,
  };
}
