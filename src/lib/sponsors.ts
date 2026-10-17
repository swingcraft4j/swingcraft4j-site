import { getCollection, type CollectionEntry } from 'astro:content';

type Sponsor = CollectionEntry<'sponsors'>;

/** Sorts dates newest first; `missing` decides where entries without a date go. */
const newestFirst = (a: Date | undefined, b: Date | undefined, missing: number) =>
  (b?.getTime() ?? missing) - (a?.getTime() ?? missing) || 0; // || 0: Infinity - Infinity is NaN
const byLogin = (a: Sponsor, b: Sponsor) => a.data.login.localeCompare(b.data.login);

/** Current sponsors, newest (or returning) first, and past sponsors, most recently ended first. */
export async function getSponsors() {
  const sponsors = await getCollection('sponsors');
  const current = sponsors
    .filter((sponsor) => sponsor.data.status === 'current')
    // No "since" yet = just added by hand, not synced: treat as the newest.
    .sort((a, b) => newestFirst(a.data.since, b.data.since, Infinity) || byLogin(a, b));
  const past = sponsors
    .filter((sponsor) => sponsor.data.status === 'past')
    // No "until" = ended before tracking started: treat as the oldest.
    .sort((a, b) => newestFirst(a.data.until, b.data.until, -Infinity) || byLogin(a, b));
  return { all: sponsors, current, past };
}
