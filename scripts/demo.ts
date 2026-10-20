import { rankCandidates, applyConstraintPatch } from '../core/scoring';
import { parseConstraintsWithBedrock, explainPickWithBedrock } from '../api/bedrock';
import { Title, Viewer, Constraints } from '../core/types';
import fs from 'node:fs';
import path from 'node:path';

// Load fixture data
const cataloguePath = path.resolve(__dirname, '../data/catalogue.json');
const viewersPath = path.resolve(__dirname, '../data/viewers.json');

const titles: Title[] = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
const viewers: Viewer[] = JSON.parse(fs.readFileSync(viewersPath, 'utf8'));

console.log('='.repeat(70));
console.log(' 📺 OnePick: AI Household Viewing Concierge (Live Demo Simulation)');
console.log('='.repeat(70));
console.log(`\nLoaded ${titles.length} titles from catalogue.`);
console.log('Active household viewers on the couch:');
viewers.forEach((v) => {
  console.log(`  ${v.avatar || '👤'} ${v.name}: Likes [${v.likes.join(', ')}], Excludes [${v.excludes.join(', ')}], Max ${v.maxMinutes || '∞'}m, Mood: "${v.mood || 'Any'}"`);
});

let constraints: Constraints = {
  viewers,
  watched: [],
  maxMinutes: undefined,
};

async function runDemo() {
  // Step 1: Initial Consensus
  console.log('\n' + '-'.repeat(70));
  console.log('Step 1: Computing Initial Consensus via Rawlsian Max-Min Fairness...');
  console.log('-'.repeat(70));

  let ranked = rankCandidates(titles, constraints);
  let topPick = ranked[0];

  console.log(`\n🏆 Consensus Pick #1: "${topPick.title.name}" (${topPick.title.year})`);
  console.log(`   Runtime: ${topPick.title.minutes} min | Rating: ${topPick.title.rating} | Genres: ${topPick.title.genres.join(', ')}`);
  console.log(`   Group Fairness Score: ${topPick.groupScore}% (Min satisfaction: ${topPick.minViewerScore}%)`);
  console.log('   Individual breakdown:');
  topPick.perViewer.forEach((pv) => {
    console.log(`     - ${pv.viewerName}: ${pv.score}% (${pv.reasons.join('; ')})`);
  });

  // Step 2: Bedrock Parse - Refinement 1
  console.log('\n' + '-'.repeat(70));
  console.log('Step 2: Voice-style Refinement: "We already watched Cosmic Drift together last week"');
  console.log('-'.repeat(70));

  const parseRes1 = await parseConstraintsWithBedrock({
    userUtterance: 'We already watched Cosmic Drift together last week',
    currentConstraints: constraints,
  });

  console.log(`🤖 Bedrock Parse Result [Source: ${parseRes1.source}]: ${parseRes1.interpretedIntent}`);
  console.log(`   Applied Patch:`, JSON.stringify(parseRes1.patch));

  constraints = applyConstraintPatch(constraints, parseRes1.patch);
  ranked = rankCandidates(titles, constraints);
  topPick = ranked[0];

  console.log(`\n🏆 Consensus Pick #2 (Post-Watched Update): "${topPick.title.name}" (${topPick.title.year})`);
  console.log(`   Runtime: ${topPick.title.minutes} min | Rating: ${topPick.title.rating} | Genres: ${topPick.title.genres.join(', ')}`);
  console.log(`   Group Fairness Score: ${topPick.groupScore}% (Min satisfaction: ${topPick.minViewerScore}%)`);
  topPick.perViewer.forEach((pv) => {
    console.log(`     - ${pv.viewerName}: ${pv.score}% (${pv.reasons.join('; ')})`);
  });

  // Step 3: Bedrock Parse - Refinement 2 (Runtime)
  console.log('\n' + '-'.repeat(70));
  console.log('Step 3: Voice-style Refinement: "Shruti has to wake up early tomorrow, keep it under 100 minutes"');
  console.log('-'.repeat(70));

  const parseRes2 = await parseConstraintsWithBedrock({
    userUtterance: 'Shruti has to wake up early tomorrow, keep it under 100 minutes',
    currentConstraints: constraints,
  });

  console.log(`🤖 Bedrock Parse Result [Source: ${parseRes2.source}]: ${parseRes2.interpretedIntent}`);
  console.log(`   Applied Patch:`, JSON.stringify(parseRes2.patch));

  constraints = applyConstraintPatch(constraints, parseRes2.patch);
  ranked = rankCandidates(titles, constraints);
  topPick = ranked[0];

  console.log(`\n🏆 Final Consensus Pick: "${topPick.title.name}" (${topPick.title.year})`);
  console.log(`   Runtime: ${topPick.title.minutes} min | Rating: ${topPick.title.rating} | Genres: ${topPick.title.genres.join(', ')}`);
  console.log(`   Group Fairness Score: ${topPick.groupScore}% (Min satisfaction: ${topPick.minViewerScore}%)`);
  topPick.perViewer.forEach((pv) => {
    console.log(`     - ${pv.viewerName}: ${pv.score}% (${pv.reasons.join('; ')})`);
  });

  // Step 4: Bedrock Explain
  console.log('\n' + '-'.repeat(70));
  console.log('Step 4: AI Concierge Explanation ("Why this pick?")');
  console.log('-'.repeat(70));

  const explanation = await explainPickWithBedrock({
    candidate: topPick,
    viewers,
  });

  console.log(`💬 Concierge Summary [Source: ${explanation.source}]:   ${explanation.summary}`);
  console.log(`🤝 Consensus Highlight: ${explanation.consensusHighlight}`);
  if (explanation.tradeOff) {
    console.log(`⚖️  Trade-off Details:   ${explanation.tradeOff}`);
  }
  console.log('\n' + '='.repeat(70));
  console.log(' ✅ Demo completed: Distinct pick progression demonstrated across all refinements!');
  console.log('='.repeat(70) + '\n');
}

runDemo();
