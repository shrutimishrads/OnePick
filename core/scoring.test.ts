import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Title, Viewer, Constraints } from './types';
import { filterHardConstraints, scoreViewerTitle, rankCandidates, applyConstraintPatch } from './scoring';

const mockTitles: Title[] = [
  {
    id: 't-solar-sailors',
    name: 'Sunfall Regatta',
    genres: ['Animation', 'Action', 'Sci-Fi'],
    moods: ['Exhilarating', 'Fun'],
    minutes: 111,
    rating: 'PG',
    year: 2020,
  },
  {
    id: 't-alpine-forge',
    name: 'Alpine Ironworks',
    genres: ['Comedy', 'Adventure'],
    moods: ['Quirky', 'Witty'],
    minutes: 104,
    rating: 'R',
    year: 2019,
  },
  {
    id: 't-iron-quarantine',
    name: 'Iron Quarantine',
    genres: ['Horror', 'Sci-Fi'],
    moods: ['Suspenseful'],
    minutes: 96,
    rating: 'PG-13',
    year: 2021,
  },
  {
    id: 't-rift-valley-freight',
    name: 'The Magma Rift',
    genres: ['Sci-Fi', 'Action'],
    moods: ['Epic'],
    minutes: 158,
    rating: 'PG-13',
    year: 2024,
  },
];

const mockViewers: Viewer[] = [
  {
    id: 'v-maya',
    name: 'Maya',
    likes: ['Sci-Fi', 'Action'],
    mood: 'Epic',
    maxMinutes: 120,
    excludes: ['Horror'],
  },
  {
    id: 'v-alex',
    name: 'Alex',
    likes: ['Comedy', 'Animation'],
    mood: 'Fun',
    maxMinutes: 120,
    excludes: ['Horror'],
  },
];

describe('OnePick Core Scoring Engine', () => {
  it('hard filters out horror due to viewer dealbreaker', () => {
    const constraints: Constraints = { viewers: mockViewers, watched: [] };
    const filtered = filterHardConstraints(mockTitles, constraints);
    const hasHorror = filtered.some((t) => t.genres.includes('Horror'));
    assert.strictEqual(hasHorror, false, 'Horror titles should be excluded');
  });

  it('hard filters out titles exceeding runtime constraint', () => {
    const constraints: Constraints = { viewers: mockViewers, watched: [], maxMinutes: 120 };
    const filtered = filterHardConstraints(mockTitles, constraints);
    const hasLong = filtered.some((t) => t.minutes > 120);
    assert.strictEqual(hasLong, false, 'Titles > 120 mins must be excluded');
  });

  it('hard filters out already watched titles', () => {
    const constraints: Constraints = {
      viewers: mockViewers,
      watched: ['t-solar-sailors'],
    };
    const filtered = filterHardConstraints(mockTitles, constraints);
    const hasWatched = filtered.some((t) => t.id === 't-solar-sailors');
    assert.strictEqual(hasWatched, false, 'Watched titles must be excluded');
  });

  it('scores individual viewers accurately', () => {
    const score = scoreViewerTitle(mockViewers[0], mockTitles[0]);
    assert.ok(score.score >= 50, 'Score should reflect base plus genre matches');
    assert.ok(score.reasons.length > 0, 'Reasons should be populated');
  });

  it('applies Rawlsian max-min fairness ranking', () => {
    const constraints: Constraints = { viewers: mockViewers, watched: [] };
    const ranked = rankCandidates(mockTitles, constraints);
    assert.ok(ranked.length > 0);
    assert.ok(ranked[0].groupScore >= ranked[ranked.length - 1].groupScore);
  });

  it('applies constraint patches dynamically', () => {
    const initial: Constraints = { viewers: mockViewers, watched: [] };
    const patched = applyConstraintPatch(initial, {
      maxMinutes: 100,
      watched: ['t-solar-sailors'],
    });

    assert.strictEqual(patched.maxMinutes, 100);
    assert.deepStrictEqual(patched.watched, ['t-solar-sailors']);
  });

  it('incorporates targetMood into viewer scores and candidate ranking', () => {
    const baseConstraints: Constraints = { viewers: mockViewers, watched: [] };
    const moodConstraints: Constraints = { viewers: mockViewers, watched: [], targetMood: 'Quirky' };

    const baseRanked = rankCandidates(mockTitles, baseConstraints);
    const moodRanked = rankCandidates(mockTitles, moodConstraints);

    const alpineBase = baseRanked.find((c) => c.title.id === 't-alpine-forge')!;
    const alpineMood = moodRanked.find((c) => c.title.id === 't-alpine-forge')!;

    assert.ok(
      alpineMood.groupScore > alpineBase.groupScore,
      'Title matching targetMood should receive a higher group score'
    );
  });

  it('returns an empty array when zero viewers are selected without throwing', () => {
    const constraints: Constraints = { viewers: [], watched: [] };
    const ranked = rankCandidates(mockTitles, constraints);
    assert.deepStrictEqual(ranked, [], 'Should return [] when no viewers on couch');
  });

  it('returns an empty array when catalogue is empty without throwing', () => {
    const constraints: Constraints = { viewers: mockViewers, watched: [] };
    const ranked = rankCandidates([], constraints);
    assert.deepStrictEqual(ranked, [], 'Should return [] on empty catalogue');
  });

  it('returns an empty array when all titles are vetoed by constraints without throwing', () => {
    const strictViewers: Viewer[] = [
      {
        id: 'v-strict',
        name: 'Vetoer',
        likes: ['Animation'],
        mood: 'Clever',
        maxMinutes: 10, // All catalogue titles exceed 10m
        excludes: ['Animation', 'Comedy', 'Horror', 'Sci-Fi'],
      },
    ];
    const constraints: Constraints = { viewers: strictViewers, watched: [] };
    const ranked = rankCandidates(mockTitles, constraints);
    assert.deepStrictEqual(ranked, [], 'Should return [] when all titles are vetoed');
  });
});
