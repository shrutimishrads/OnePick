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

  it('guarantees distinct consensus picks at each refinement step with progressive score elevation for the bottleneck viewer', () => {
    // Step 1: Initial pick
    let constraints: Constraints = {
      viewers,
      watched: [],
    };
    const r1 = rankCandidates(titles, constraints);
    assert.ok(r1.length > 0);
    const pick1 = r1[0];
    assert.strictEqual(pick1.title.id, 't-spider-verse', 'Pick 1 must be Spider-Verse / Cosmic Drift');
    assert.ok(pick1.groupScore >= 70, 'Pick 1 group score should be strong');

    // Shruti has the visibly lowest score on the couch
    const shrutiScore1 = pick1.perViewer.find((v) => v.viewerId === 'v-shruti')!.score;
    assert.strictEqual(shrutiScore1, pick1.minViewerScore, 'Shruti must have the bottleneck score on Pick 1');
    assert.strictEqual(shrutiScore1, 70, 'Shruti score on Pick 1 should be 70%');

    // Step 2: Refinement 1 (Watched Pick 1)
    constraints = applyConstraintPatch(constraints, { watched: [pick1.title.id] });
    const r2 = rankCandidates(titles, constraints);
    assert.ok(r2.length > 0);
    const pick2 = r2[0];
    assert.notStrictEqual(pick2.title.id, pick1.title.id, 'Pick 2 must differ from Pick 1');
    assert.strictEqual(pick2.title.id, 't-spirited-away', 'Pick 2 must be Spirited Away / Spirit Realm Crossing');
    assert.ok(pick2.title.minutes > 100, 'Pick 2 runtime must exceed 100 minutes');

    // Shruti's score must rise from step 1
    const shrutiScore2 = pick2.perViewer.find((v) => v.viewerId === 'v-shruti')!.score;
    assert.ok(shrutiScore2 > shrutiScore1, `Pick 2 must raise Shruti's score (was ${shrutiScore1}, now ${shrutiScore2})`);
    assert.strictEqual(shrutiScore2, 85, 'Shruti score on Pick 2 should rise to 85%');

    // Step 3: Refinement 2 (Runtime capped at 100m)
    constraints = applyConstraintPatch(constraints, { maxMinutes: 100 });
    const r3 = rankCandidates(titles, constraints);
    assert.ok(r3.length > 0);
    const pick3 = r3[0];
    assert.notStrictEqual(pick3.title.id, pick2.title.id, 'Pick 3 must differ from Pick 2');
    assert.strictEqual(pick3.title.id, 't-fantastic-mr-fox', 'Pick 3 must be Fantastic Mr. Fox / The Clever Burrower');
    assert.ok(pick3.title.minutes <= 100, 'Pick 3 runtime must be <= 100 minutes');

    // Shruti's score must rise even further
    const shrutiScore3 = pick3.perViewer.find((v) => v.viewerId === 'v-shruti')!.score;
    assert.ok(shrutiScore3 > shrutiScore2, `Pick 3 must raise Shruti's score further (was ${shrutiScore2}, now ${shrutiScore3})`);
    assert.strictEqual(shrutiScore3, 95, 'Shruti score on Pick 3 should rise to 95%');
  });
});
