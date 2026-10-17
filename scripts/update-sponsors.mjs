// Syncs src/data/sponsors.json with GitHub Sponsors.
//
//   - Active public sponsors are marked "current" (new ones are added).
//   - A "current" sponsor no longer in the active list becomes "past",
//     with "until" set to today.
//   - A past sponsor who sponsors again becomes "current" again.
//   - Sponsors from before this file existed are added as "past".
//   - Private sponsorships are never fetched, so they never appear.
//
// Env:
//   SPONSORS_TOKEN  GitHub token of the sponsored account (classic PAT with
//                   the read:user scope, or read:org for an organization)
//   SPONSORS_LOGIN  The sponsored user or organization login
//
// Run locally: SPONSORS_TOKEN=... SPONSORS_LOGIN=... node scripts/update-sponsors.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DATA_FILE = new URL('../src/data/sponsors.json', import.meta.url);

const QUERY = `
  query ($login: String!, $activeOnly: Boolean!, $cursor: String) {
    repositoryOwner(login: $login) {
      ... on Sponsorable {
        sponsorshipsAsMaintainer(first: 100, after: $cursor, activeOnly: $activeOnly, includePrivate: false) {
          pageInfo { hasNextPage endCursor }
          nodes {
            createdAt
            privacyLevel
            sponsorEntity {
              __typename
              ... on User { id login name url avatarUrl(size: 128) }
              ... on Organization { id login name url avatarUrl(size: 128) }
            }
          }
        }
      }
    }
  }
`;

async function fetchSponsorships({ token, login, activeOnly }) {
  const sponsorships = [];
  let cursor = null;
  do {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { login, activeOnly, cursor } }),
    });
    if (!response.ok) {
      throw new Error(`GitHub API responded ${response.status}: ${await response.text()}`);
    }
    const { data, errors } = await response.json();
    if (errors?.length) {
      throw new Error(`GitHub API errors: ${errors.map((error) => error.message).join('; ')}`);
    }
    const connection = data?.repositoryOwner?.sponsorshipsAsMaintainer;
    if (!connection) {
      throw new Error(`"${login}" was not found or does not have GitHub Sponsors enabled.`);
    }
    sponsorships.push(...connection.nodes);
    cursor = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
  } while (cursor);

  // Belt and braces: never publish a private sponsorship, or a deleted account.
  return sponsorships.filter((sponsorship) => sponsorship.privacyLevel === 'PUBLIC' && sponsorship.sponsorEntity);
}

const toDay = (isoDateTime) => isoDateTime.slice(0, 10);

function profileOf(sponsorship) {
  const { id, login, name, url, avatarUrl, __typename } = sponsorship.sponsorEntity;
  return { id, login, name: name || null, type: __typename, avatarUrl, url };
}

/**
 * Merges freshly fetched sponsorships into the stored list.
 * Pure function so it can be tested without calling GitHub.
 */
export function mergeSponsors(existing, active, history, today) {
  const byId = new Map(existing.map((sponsor) => [sponsor.id, { ...sponsor }]));
  const activeIds = new Set();

  for (const sponsorship of active) {
    const profile = profileOf(sponsorship);
    activeIds.add(profile.id);
    const previous = byId.get(profile.id);
    const isReturning = previous?.status !== 'current';
    byId.set(profile.id, {
      ...profile,
      status: 'current',
      // Keep the start date of an ongoing sponsorship; a new or returning sponsor starts now.
      since: isReturning ? toDay(sponsorship.createdAt) : (previous.since ?? toDay(sponsorship.createdAt)),
    });
  }

  for (const sponsor of byId.values()) {
    if (sponsor.status === 'current' && !activeIds.has(sponsor.id)) {
      sponsor.status = 'past';
      sponsor.until = today;
    }
  }

  // Sponsorships that ended before this file started tracking them.
  for (const sponsorship of history) {
    const profile = profileOf(sponsorship);
    if (activeIds.has(profile.id)) continue;
    const previous = byId.get(profile.id);
    const since = toDay(sponsorship.createdAt);
    if (!previous) {
      byId.set(profile.id, { ...profile, status: 'past', since });
    } else if (previous.status === 'past') {
      // Refresh profile details (renamed account, new avatar), keep the dates.
      byId.set(profile.id, {
        ...previous,
        ...profile,
        since: previous.since && previous.since < since ? previous.since : since,
      });
    }
  }

  // Stable order and key layout so unchanged data produces an identical file.
  return [...byId.values()]
    .map(({ id, login, name, type, avatarUrl, url, status, since, until }) => ({
      id,
      login,
      name,
      type,
      avatarUrl,
      url,
      status,
      ...(since && { since }),
      ...(until && { until }),
    }))
    .sort((a, b) => a.status.localeCompare(b.status) || a.login.localeCompare(b.login));
}

async function main() {
  const token = process.env.SPONSORS_TOKEN;
  const login = process.env.SPONSORS_LOGIN;
  if (!token || !login) {
    throw new Error('Set the SPONSORS_TOKEN and SPONSORS_LOGIN environment variables.');
  }

  const existing = JSON.parse(await readFile(DATA_FILE, 'utf8'));
  const [active, history] = await Promise.all([
    fetchSponsorships({ token, login, activeOnly: true }),
    fetchSponsorships({ token, login, activeOnly: false }),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const merged = mergeSponsors(existing, active, history, today);

  const before = JSON.stringify(existing, null, 2) + '\n';
  const after = JSON.stringify(merged, null, 2) + '\n';
  if (before === after) {
    console.log(`No changes (${active.length} current sponsors).`);
    return;
  }
  await writeFile(DATA_FILE, after);
  const counts = merged.reduce((acc, sponsor) => ({ ...acc, [sponsor.status]: (acc[sponsor.status] ?? 0) + 1 }), {});
  console.log(`Updated sponsors.json: ${counts.current ?? 0} current, ${counts.past ?? 0} past.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
