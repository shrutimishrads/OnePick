import {
  parseConstraintsWithBedrock,
  explainPickWithBedrock,
  clearBedrockCaches,
  getModelId,
  getLastBedrockError,
} from '../api/bedrock';
import { rankCandidates } from '../core/scoring';
import catalogueData from '../data/catalogue.json';
import viewersData from '../data/viewers.json';
import { Title, Viewer } from '../core/types';

function getErrorClass(err: Error | null): string {
  if (!err) return 'none';
  return err.name || err.constructor?.name || 'Error';
}

async function runBedrockCheck(): Promise<void> {
  console.log('=== Amazon Bedrock Diagnostic Check ===');
  console.log(`Target Model ID: ${getModelId()}`);
  console.log(`Region: ${process.env.AWS_REGION || 'us-east-1 (default)'}`);

  // Report credential presence safely without printing secret values
  const hasAccessKey = Boolean(process.env.AWS_ACCESS_KEY_ID);
  const hasSecretKey = Boolean(process.env.AWS_SECRET_ACCESS_KEY);
  const hasSessionToken = Boolean(process.env.AWS_SESSION_TOKEN);
  console.log(
    `Credentials Configured: AWS_ACCESS_KEY_ID=${hasAccessKey ? 'true' : 'false'}, ` +
    `AWS_SECRET_ACCESS_KEY=${hasSecretKey ? 'true' : 'false'}, ` +
    `AWS_SESSION_TOKEN=${hasSessionToken ? 'true' : 'false'}`
  );
  console.log('----------------------------------------');

  // Clear in-memory caches to guarantee live execution
  clearBedrockCaches();

  // 1. Live Parse Call
  const parseUtterance = 'keep it under 90 minutes and skip horror';
  const parseRes = await parseConstraintsWithBedrock({
    userUtterance: parseUtterance,
    currentConstraints: { viewers: [], watched: [] },
  });
  const parseError = getLastBedrockError().parse;
  console.log(`Parse Call: source=${parseRes.source} errorClass=${getErrorClass(parseError)}`);

  // 2. Live Explain Call
  const catalogue = catalogueData as Title[];
  const viewers = viewersData as Viewer[];
  const candidates = rankCandidates(catalogue, { viewers, watched: [] });
  const topCandidate = candidates[0];

  const explainRes = await explainPickWithBedrock({
    candidate: topCandidate,
    viewers,
  });
  const explainError = getLastBedrockError().explain;
  console.log(`Explain Call: source=${explainRes.source} errorClass=${getErrorClass(explainError)}`);
  console.log('----------------------------------------');
  console.log('Bedrock diagnostic check completed.');
}

runBedrockCheck().catch((err) => {
  console.error('Diagnostic script error:', err);
  process.exit(1);
});
