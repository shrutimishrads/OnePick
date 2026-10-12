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
console.log('Step 2: Voice Refinement: "We already watched Spider-Verse together last week"');
console.log('-'.repeat(70));

async function runDemo() {
  const parseRes1 = await parseConstraintsWithBedrock({
    userUtterance: 'We already watched Spider-Verse together last week',
    currentConstraints: constraints,
  });

  console.log(`🤖 Bedrock Parse Result: ${parseRes1.interpretedIntent}`);
  console.log(`   Applied Patch:`, JSON.stringify(parseRes1.patch));

  constraints = applyConstraintPatch(constraints, parseRes1.patch);
  ranked = rankCandidates(titles, constraints);
  topPick = ranked[0];

  console.log(`\n🏆 Consensus Pick #2 (Post-Watched Update): "${topPick.title.name}" (${topPick.title.year})`);
  console.log(`   Runtime: ${topPick.title.minutes} min | Rating: ${topPick.title.rating}`);
  console.log(`   Group Fairness Score: ${topPick.groupScore}%`);
  topPick.perViewer.forEach((pv) => {
    console.log(`     - ${pv.viewerName}: ${pv.score}% (${pv.reasons.join('; ')})`);
  });

  // Step 3: Bedrock Parse - Refinement 2 (Runtime)
  console.log('\n' + '-'.repeat(70));
  console.log('Step 3: Voice Refinement: "Alex has to wake up early tomorrow, keep it under 100 minutes"');
  console.log('-'.repeat(70));

  const parseRes2 = await parseConstraintsWithBedrock({
    userUtterance: 'Alex has to wake up early tomorrow, keep it under 100 minutes',
    currentConstraints: constraints,
  });

  console.log(`🤖 Bedrock Parse Result: ${parseRes2.interpretedIntent}`);
  console.log(`   Applied Patch:`, JSON.stringify(parseRes2.patch));

  constraints = applyConstraintPatch(constraints, parseRes2.patch);
  ranked = rankCandidates(titles, constraints);
  topPick = ranked[0];

  console.log(`\n🏆 Final Consensus Pick: "${topPick.title.name}" (${topPick.title.year})`);
  console.log(`   Runtime: ${topPick.title.minutes} min | Rating: ${topPick.title.rating}`);
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

  console.log(`💬 Concierge Summary:   ${explanation.summary}`);
  console.log(`🤝 Consensus Highlight: ${explanation.consensusHighlight}`);
  console.log(`⚖️  Trade-off Details:   ${explanation.tradeOff}`);
  console.log('\n' + '='.repeat(70));
  console.log(' ✅ Demo completed: Decision reached in under 60 seconds with 0 arguments!');
  console.log('='.repeat(70) + '\n');
}

runDemo();
