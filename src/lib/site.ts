import { z } from 'astro/zod';
import siteJson from '../data/site.json';

// site.json is a single object rather than a list, so it is imported
// directly and validated here instead of being a content collection.
const siteSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  description: z.string(),
  /** The person sponsors support (sponsorships go to them, not only this project). */
  maintainer: z.string(),
  githubUrl: z.url(),
  sponsorsUrl: z.url().optional(),
  nav: z.array(z.object({ label: z.string(), href: z.string() })),
});

export const site = siteSchema.parse(siteJson);

/** Prefixes an internal path with the base path (needed on GitHub Pages project sites). */
export function url(path = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}
