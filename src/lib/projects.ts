import { getCollection } from 'astro:content';

/** Visible projects: featured first, archived last, then most stars, then most recently updated. */
export async function getProjects() {
  const projects = await getCollection('projects');
  return projects
    .filter((project) => !project.data.hidden)
    .sort(
      (a, b) =>
        Number(b.data.featured ?? false) - Number(a.data.featured ?? false) ||
        Number(a.data.archived) - Number(b.data.archived) ||
        b.data.stars - a.data.stars ||
        b.data.pushedAt.getTime() - a.data.pushedAt.getTime(),
    );
}
