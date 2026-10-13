import { Title, Viewer, Constraints, Candidate, ViewerScoreDetail, ConstraintPatch } from './types';

/**
 * Filter out titles that violate hard constraints.
 */
export function filterHardConstraints(titles: Title[], constraints: Constraints): Title[] {
  const watchedSet = new Set(constraints.watched.map((w) => w.toLowerCase()));

  // Find effective global max minutes
  let effectiveMaxMinutes = constraints.maxMinutes ?? Infinity;
  for (const v of constraints.viewers) {
    if (v.maxMinutes && v.maxMinutes < effectiveMaxMinutes) {
      effectiveMaxMinutes = v.maxMinutes;
    }
  }

  // Combined set of dealbreakers across all viewers
  const globalExcludes = new Set<string>();
  for (const v of constraints.viewers) {
    for (const ex of v.excludes) {
      globalExcludes.add(ex.toLowerCase());
    }
  }

  return titles.filter((title) => {
    // 1. Not in watched history
    if (watchedSet.has(title.id.toLowerCase()) || watchedSet.has(title.name.toLowerCase())) {
      return false;
    }

    // 2. Runtime limit
    if (title.minutes > effectiveMaxMinutes) {
      return false;
    }

    // 3. Hard genre / dealbreaker excludes
    const titleGenres = title.genres.map((g) => g.toLowerCase());
    for (const tg of titleGenres) {
      if (globalExcludes.has(tg)) {
        return false;
      }
    }

    // 4. Required genre if specified
    if (constraints.requiredGenre) {
      const req = constraints.requiredGenre.toLowerCase();
      if (!titleGenres.includes(req)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculate soft score (0 to 100) for a single viewer against a title.
 */
export function scoreViewerTitle(
  viewer: Viewer,
  title: Title,
  targetMood?: string
): ViewerScoreDetail {
  let score = 50; // base score for a valid contender
  const reasons: string[] = [];

  const titleGenres = new Set(title.genres.map((g) => g.toLowerCase()));
  const titleMoods = new Set(title.moods.map((m) => m.toLowerCase()));

  // 1. Check genre/theme likes (up to +35 pts)
  let likeMatches = 0;
  for (const like of viewer.likes) {
    const lk = like.toLowerCase();
    if (titleGenres.has(lk)) {
      likeMatches++;
      reasons.push(`Matches like: "${like}"`);
    }
  }
  score += Math.min(35, likeMatches * 15);

  // 2. Check individual mood match (up to +15 pts)
  if (viewer.mood) {
    const vm = viewer.mood.toLowerCase();
    if (titleMoods.has(vm)) {
      score += 15;
      reasons.push(`Fits mood: "${viewer.mood}"`);
    } else {
      // Partial credit for compatible mood terms
      for (const m of titleMoods) {
        if (m.includes(vm) || vm.includes(m)) {
          score += 10;
          reasons.push(`Complements mood: "${m}"`);
          break;
        }
      }
    }
  }

  // 3. Check shared household target mood if specified (up to +10 pts)
  if (targetMood) {
    const tm = targetMood.toLowerCase();
    if (titleMoods.has(tm)) {
      score += 10;
      reasons.push(`Matches target mood: "${targetMood}"`);
    } else {
      for (const m of titleMoods) {
        if (m.includes(tm) || tm.includes(m)) {
          score += 5;
          reasons.push(`Complements target mood: "${m}"`);
          break;
        }
      }
    }
  }

  // 4. Runtime comfort
  if (viewer.maxMinutes && title.minutes <= viewer.maxMinutes) {
    const margin = viewer.maxMinutes - title.minutes;
    if (margin >= 0 && margin <= 20) {
      score += 5;
      reasons.push(`Fits right into ${viewer.maxMinutes}m window`);
    }
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  if (reasons.length === 0) {
    reasons.push('Neutral match with no direct conflicts');
  }

  return {
    viewerId: viewer.id,
    viewerName: viewer.name,
    score: finalScore,
    reasons,
  };
}

/**
 * Ranks all titles against given constraints using a Rawlsian / max-min fairness criterion.
 * GroupScore = 0.6 * min(viewerScores) + 0.4 * avg(viewerScores)
 * This guarantees no single viewer gets steamrolled by a majority pick.
 */
export function rankCandidates(titles: Title[], constraints: Constraints): Candidate[] {
  if (constraints.viewers.length === 0) {
    return [];
  }

  const validTitles = filterHardConstraints(titles, constraints);

  const candidates: Candidate[] = validTitles.map((title) => {
    const perViewer = constraints.viewers.map((viewer) =>
      scoreViewerTitle(viewer, title, constraints.targetMood)
    );
    const scores = perViewer.map((v) => v.score);

    const minViewerScore = Math.min(...scores);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    // Fairness formula: prioritize lifting the minimum satisfaction
    const groupScore = Math.round(0.6 * minViewerScore + 0.4 * avgScore);

    return {
      title,
      groupScore,
      minViewerScore,
      perViewer,
    };
  });

  // Sort descending by groupScore, then by minViewerScore, then newest year
  candidates.sort((a, b) => {
    if (b.groupScore !== a.groupScore) return b.groupScore - a.groupScore;
    if (b.minViewerScore !== a.minViewerScore) return b.minViewerScore - a.minViewerScore;
    return b.title.year - a.title.year;
  });

  return candidates;
}

/**
 * Apply a patch to constraints deterministically.
 */
export function applyConstraintPatch(current: Constraints, patch: ConstraintPatch): Constraints {
  const updated: Constraints = {
    ...current,
    viewers: current.viewers.map((v) => ({ ...v, excludes: [...v.excludes], likes: [...v.likes] })),
    watched: [...current.watched],
  };

  if (patch.maxMinutes !== undefined) {
    updated.maxMinutes = patch.maxMinutes;
  }

  if (patch.watched && patch.watched.length > 0) {
    for (const w of patch.watched) {
      if (!updated.watched.includes(w)) {
        updated.watched.push(w);
      }
    }
  }

  if (patch.targetMood) {
    updated.targetMood = patch.targetMood;
  }

  if (patch.requiredGenre) {
    updated.requiredGenre = patch.requiredGenre;
  }

  if (patch.addedExcludes) {
    for (const item of patch.addedExcludes) {
      if (item.viewerId) {
        const viewer = updated.viewers.find((v) => v.id === item.viewerId);
        if (viewer && !viewer.excludes.includes(item.exclude)) {
          viewer.excludes.push(item.exclude);
        }
      } else {
        // Global exclude: add to all viewers
        for (const viewer of updated.viewers) {
          if (!viewer.excludes.includes(item.exclude)) {
            viewer.excludes.push(item.exclude);
          }
        }
      }
    }
  }

  return updated;
}
