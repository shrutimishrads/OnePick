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

  it('guarantees distinct consensus picks at each refinement step', () => {
    // Step 1: Initial pick
    let constraints: Constraints = {
      viewers,
      watched: [],
    };
    const r1 = rankCandidates(titles, constraints);
    assert.ok(r1.length > 0);
    const pick1 = r1[0];
    assert.strictEqual(pick1.title.id, 't-spider-verse', 'Pick 1 must be Spider-Verse');
    assert.ok(pick1.groupScore >= 80, 'Pick 1 group score should be strong');

    // Step 2: Refinement 1 (Watched Spider-Verse)
    constraints = applyConstraintPatch(constraints, { watched: ['t-spider-verse'] });
    const r2 = rankCandidates(titles, constraints);
    assert.ok(r2.length > 0);
    const pick2 = r2[0];
    assert.notStrictEqual(pick2.title.id, pick1.title.id, 'Pick 2 must differ from Pick 1');
    assert.strictEqual(pick2.title.id, 't-top-gun-maverick', 'Pick 2 must be Top Gun: Maverick');
    assert.ok(pick2.title.minutes > 100, 'Pick 2 runtime must exceed 100 minutes');

    // Step 3: Refinement 2 (Runtime capped at 100m)
    constraints = applyConstraintPatch(constraints, { maxMinutes: 100 });
    const r3 = rankCandidates(titles, constraints);
    assert.ok(r3.length > 0);
    const pick3 = r3[0];
    assert.notStrictEqual(pick3.title.id, pick2.title.id, 'Pick 3 must differ from Pick 2');
    assert.strictEqual(pick3.title.id, 't-fantastic-mr-fox', 'Pick 3 must be Fantastic Mr. Fox');
    assert.ok(pick3.title.minutes <= 100, 'Pick 3 runtime must be <= 100 minutes');
    assert.ok(pick3.minViewerScore >= 60, 'Pick 3 must maintain fair satisfaction across all viewers');
  });
});
