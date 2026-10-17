import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

// Each collection loads one JSON file from src/data/.
// Every entry needs a unique "id". If a field is missing or has the
// wrong type, `npm run build` fails and names the file and field.

// Written by scripts/update-sponsors.mjs (run daily by the
// "Update sponsors" workflow). "id" is GitHub's stable node id, so a
// sponsor who renames their account stays the same entry.
const sponsors = defineCollection({
  loader: file('src/data/sponsors.json'),
  schema: z.object({
    login: z.string(),
    name: z.string().nullable().optional(),
    type: z.enum(['User', 'Organization']),
    avatarUrl: z.url(),
    url: z.url(),
    status: z.enum(['current', 'past']),
    since: z.coerce.date().optional(),
    until: z.coerce.date().optional(),
  }),
});

// Repositories of the GitHub organization. GitHub fields (stars, forks,
// description, ...) are refreshed daily by scripts/update-projects.mjs.
// Hand-edited fields are kept: "featured" pins a project first,
// "hidden" removes it from the page (and stops the script re-adding it).
const projects = defineCollection({
  loader: file('src/data/projects.json'),
  schema: z.object({
    name: z.string(),
    description: z.string().nullable().optional(),
    url: z.url(),
    homepage: z.url().optional(),
    language: z.string().nullable().optional(),
    license: z.string().nullable().optional(),
    topics: z.array(z.string()).default([]),
    stars: z.number().int().nonnegative(),
    forks: z.number().int().nonnegative(),
    archived: z.boolean().default(false),
    pushedAt: z.coerce.date(),
    latestRelease: z
      .object({
        tag: z.string(),
        url: z.url(),
        publishedAt: z.coerce.date(),
      })
      .optional(),
    featured: z.boolean().optional(),
    hidden: z.boolean().optional(),
  }),
});

export const collections = { sponsors, projects };
