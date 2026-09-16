// Single namespace for temporary GitHub repos created by Q8iDevAI tests.
// Bulk cleanup relies on this prefix being unmistakable — never reuse `q8idevai-`
// (collides with real repos like `q8idevai`, `q8idevai-website`).
export const TEMP_GITHUB_REPO_PREFIX = "q8idevaitmp-";

export function createTempGithubRepoName(category: string): string {
  const rand = Math.random().toString(16).slice(2, 8);
  return `${TEMP_GITHUB_REPO_PREFIX}${category}-${Date.now()}-${rand}`;
}
