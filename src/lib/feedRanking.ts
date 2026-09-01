import { Recipe } from '../types/recipe';

// A Reddit-style "hot" ranking: log10(popularity) minus a linear time
// penalty. Using the log of popularity (rather than dividing by age, like
// Hacker News does) matters here because it keeps one viral outlier from
// permanently burying everything else — going from 10 likes to 100 counts
// for as much as going from 100 to 1000, so ordinary variation in how liked
// a home-cooked recipe is doesn't swing the ranking wildly. Comments and "I
// made this!" posts count for more than a like since they take more effort
// and are harder to fake, so they're stronger signals of a recipe actually
// being good.
const HOURS_PER_DECADE = 48; // how many hours of age costs a recipe one order of magnitude of popularity
const LIKE_WEIGHT = 1;
const COMMENT_WEIGHT = 2;
const MADE_THIS_WEIGHT = 3;

function popularityScore(recipe: Recipe): number {
  return (
    recipe.likeCount * LIKE_WEIGHT +
    recipe.commentCount * COMMENT_WEIGHT +
    recipe.madeThisPosts.length * MADE_THIS_WEIGHT
  );
}

// log10(popularity + 1) means a brand new recipe with zero engagement scores
// ~0 rather than being undefined or driven negative, so it still ranks by
// recency alone until it starts picking up likes/comments.
function hotScore(recipe: Recipe, now: number): number {
  const ageHours = Math.max(0, (now - new Date(recipe.createdAt).getTime()) / (60 * 60 * 1000));
  return Math.log10(popularityScore(recipe) + 1) - ageHours / HOURS_PER_DECADE;
}

export function rankByHot(recipes: Recipe[]): Recipe[] {
  const now = Date.now();
  return [...recipes].sort((a, b) => hotScore(b, now) - hotScore(a, now));
}
