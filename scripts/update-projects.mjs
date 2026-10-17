// Syncs src/data/projects.json with the organization's public GitHub repos.
//
//   - Refreshes GitHub fields (description, stars, forks, topics, ...).
//   - Adds new public repos (forks and ignored repos are skipped).
//   - Removes repos that were deleted or made private.
//   - Keeps hand-edited fields such as "featured" and "hidden";
//     a "hidden" repo stays in the file so it isn't re-added.
//
// Env:
//   PROJECTS_ORG     GitHub organization (default: swingcraft4j)
//   PROJECTS_IGNORE  Comma-separated repo names to leave out
//                    (default: swingcraft4j-site, this website's own repo)
//   GITHUB_TOKEN     Optional; raises the API rate limit (set automatically in Actions)
//
// Run locally: node scripts/update-projects.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DATA_FILE = new URL('../src/data/projects.json', import.meta.url);
const DEFAULT_IGNORE = 'swingcraft4j-site';

async function github(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub API ${path} responded ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function fetchRepos(org, token, ignored) {
  const repos = [];
  for (let page = 1; ; page++) {
    const batch = await github(`/orgs/${org}/repos?type=public&per_page=100&page=${page}`, token);
    if (!batch) throw new Error(`Organization "${org}" was not found.`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return Promise.all(
    repos
      .filter((repo) => !repo.fork && !repo.private && !ignored.has(repo.name.toLowerCase()))
      .map(async (repo) => {
        // 404 when the repo has no published (non-draft, non-prerelease) release.
        const release = await github(`/repos/${repo.full_name}/releases/latest`, token);
        return { repo, release };
      }),
  );
}

function fromGitHub({ repo, release }) {
  return {
    id: repo.full_name,
    name: repo.name,
    description: repo.description || null,
    url: repo.html_url,
    ...(repo.homepage && { homepage: repo.homepage }),
    language: repo.language || null,
    license: repo.license?.spdx_id ?? null,
    topics: repo.topics ?? [],
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    archived: repo.archived,
    pushedAt: repo.pushed_at,
    ...(release && {
      latestRelease: { tag: release.tag_name, url: release.html_url, publishedAt: release.published_at },
    }),
  };
}

const MANUAL_FIELDS = ['featured', 'hidden'];

/** Merges fetched repos into the stored list. Pure, for testing. */
export function mergeProjects(existing, fetched) {
  const fresh = new Map(fetched.map((item) => [item.repo.full_name.toLowerCase(), fromGitHub(item)]));
  const result = [];

  // Keep the stored order (it's the hand-edited file), refreshing each entry.
  for (const project of existing) {
    const key = project.id.toLowerCase();
    const update = fresh.get(key);
    if (!update) continue; // deleted, renamed away or made private
    fresh.delete(key);
    const manual = Object.fromEntries(MANUAL_FIELDS.filter((field) => field in project).map((field) => [field, project[field]]));
    result.push({ ...update, ...manual });
  }

  // New repos go at the end, newest activity first.
  const added = [...fresh.values()].sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));
  return [...result, ...added];
}

async function main() {
  const org = process.env.PROJECTS_ORG || 'swingcraft4j';
  const token = process.env.GITHUB_TOKEN;
  const ignored = new Set(
    (process.env.PROJECTS_IGNORE || DEFAULT_IGNORE)
      .split(',')
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean),
  );

  const existing = JSON.parse(await readFile(DATA_FILE, 'utf8'));
  const merged = mergeProjects(existing, await fetchRepos(org, token, ignored));

  const before = JSON.stringify(existing, null, 2) + '\n';
  const after = JSON.stringify(merged, null, 2) + '\n';
  if (before === after) {
    console.log(`No changes (${merged.length} projects).`);
    return;
  }
  await writeFile(DATA_FILE, after);
  console.log(`Updated projects.json: ${merged.length} projects.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
