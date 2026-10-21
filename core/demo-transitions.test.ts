import { describe, it } from 'node:test';
import assert from 'node:assert';
import { rankCandidates, applyConstraintPatch } from './scoring';
import { Title, Viewer, Constraints } from './types';
import fs from 'node:fs';
import path from 'node:path';

describe('Demo Pick Progression & Refinements', () => {
  const cataloguePath = path.resolve(__dirname, '../data/catalogue.json');
  const viewersPath = path.resolve(__dirname, '../data/viewers.json');

  const titles: Title[] = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
  const viewers: Viewer[] = JSON.parse(fs.readFileSync(viewersPath, 'utf8'));

  it('guarantees distinct consensus picks at each refinement step with non-falling lowest score', () => {
    // Step 1: Initial pick
    let constraints: Constraints = {
      viewers,
      watched: [],
    };
    const r1 = rankCandidates(titles, constraints);
    assert.ok(r1.length > 0);
    const pick1 = r1[0];
    assert.strictEqual(pick1.title.id, 't-ember-tide');
    assert.ok(pick1.groupScore >= 65, 'Pick 1 group score should be strong');

    // Harshit has the lowest score on the couch
    const harshitScore1 = pick1.perViewer.find((v) => v.viewerId === 'v-harshit')!.score;
    assert.strictEqual(harshitScore1, pick1.minViewerScore, 'Harshit must have the bottleneck score on Pick 1');
    assert.strictEqual(harshitScore1, 65, 'Harshit score on Pick 1 should be 65%');

    // Step 2: Refinement 1 (Watched Pick 1)
    constraints = applyConstraintPatch(constraints, { watched: [pick1.title.id] });
    const r2 = rankCandidates(titles, constraints);
    assert.ok(r2.length > 0);
    const pick2 = r2[0];
    assert.notStrictEqual(pick2.title.id, pick1.title.id, 'Pick 2 must differ from Pick 1');
    assert.strictEqual(pick2.title.id, 't-clockwork-haven');
    assert.ok(pick2.title.minutes > 100, 'Pick 2 runtime must exceed 100 minutes');

    // Lowest viewer score must NOT fall between steps
    assert.ok(
      pick2.minViewerScore >= pick1.minViewerScore,
      `Lowest viewer score must not fall (was ${pick1.minViewerScore}, now ${pick2.minViewerScore})`
    );
    assert.strictEqual(pick2.minViewerScore, 65, 'Lowest score on Pick 2 must be at least 65%');

    // Harshit's score must rise from step 1
    const harshitScore2 = pick2.perViewer.find((v) => v.viewerId === 'v-harshit')!.score;
    assert.ok(harshitScore2 > harshitScore1, `Pick 2 must raise Harshit's score (was ${harshitScore1}, now ${harshitScore2})`);
    assert.strictEqual(harshitScore2, 80, 'Harshit score on Pick 2 should rise to 80%');

    // Step 3: Refinement 2 (Runtime capped at 100m)
    constraints = applyConstraintPatch(constraints, { maxMinutes: 100 });
    const r3 = rankCandidates(titles, constraints);
    assert.ok(r3.length > 0);
    const pick3 = r3[0];
    assert.notStrictEqual(pick3.title.id, pick2.title.id, 'Pick 3 must differ from Pick 2');
    assert.strictEqual(pick3.title.id, 't-bramble-quest');
    assert.ok(pick3.title.minutes <= 100, 'Pick 3 runtime must be <= 100 minutes');

    // Lowest viewer score must NOT fall between steps
    assert.ok(
      pick3.minViewerScore >= pick2.minViewerScore,
      `Lowest viewer score must not fall in Step 3 (was ${pick2.minViewerScore}, now ${pick3.minViewerScore})`
    );
    assert.strictEqual(pick3.minViewerScore, 65, 'Lowest score on Pick 3 must be at least 65%');

    // Shruti's score must rise
    const shrutiScore2 = pick2.perViewer.find((v) => v.viewerId === 'v-shruti')!.score;
    const shrutiScore3 = pick3.perViewer.find((v) => v.viewerId === 'v-shruti')!.score;
    assert.ok(shrutiScore3 > shrutiScore2, `Pick 3 must raise Shruti's score (was ${shrutiScore2}, now ${shrutiScore3})`);
    assert.strictEqual(shrutiScore3, 80, 'Shruti score on Pick 3 should rise to 80%');
  });
});
