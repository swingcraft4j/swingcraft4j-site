<img src="public/logo.svg" alt="" width="64" height="64">

# SwingCraft4J website

Static site built with [Astro](https://astro.build) and deployed to GitHub Pages.
Pages: **Home**, **Projects** and **Sponsors**. All content comes from JSON files in `src/data/`,
two of which are kept up to date automatically by daily GitHub Actions.

## Requirements

- Node.js 24 LTS (at least 22.22.0, see `.nvmrc`)

## Commands

| Command                 | What it does                                          |
| ----------------------- | ----------------------------------------------------- |
| `npm install`           | Install dependencies                                  |
| `npm run dev`           | Start the dev server at http://localhost:4321         |
| `npm run build`         | Type-check, validate JSON and build to `dist/`        |
| `npm run preview`       | Serve the built `dist/` locally                       |
| `npm run sync:projects` | Refresh `projects.json` from GitHub (no token needed) |
| `npm run sync:sponsors` | Refresh `sponsors.json` (needs a token, see below)    |

## Project structure

```
src/
├── data/            JSON content (see below)
├── content.config.ts  Schemas that validate projects.json and sponsors.json
├── lib/             Data helpers: site.json + url(), project/sponsor sorting, plural()
├── layouts/         BaseLayout (page shell, theme script)
├── components/      Header, Footer, ThemeToggle, ProjectCard, SponsorCard, Icon
├── pages/           index, projects, sponsors, 404
└── styles/          global.css (colors for both themes, type scale, buttons, layout)
scripts/             Sync scripts run by the workflows
.github/workflows/   deploy, update-projects, update-sponsors
```

For internal links, use the `url()` helper from `src/lib/site.ts` so they keep working under
the GitHub Pages base path.

## Content

| File            | Used by                    | Updated                                                                         |
| --------------- | -------------------------- | ------------------------------------------------------------------------------- |
| `site.json`     | Every page                 | By hand: title, tagline, description, GitHub and Sponsors links, navigation     |
| `projects.json` | Home and `/projects`       | Daily from GitHub. Add `"featured": true` or `"hidden": true` to an entry by hand |
| `sponsors.json` | Home and `/sponsors`       | Daily from GitHub Sponsors. You can also add a sponsor by hand (see below)      |

If a field is missing or has the wrong type, the build fails and names the file and field.

## Deploying to GitHub Pages (one-time setup)

1. Push this project to a GitHub repository.
2. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. `.github/workflows/deploy.yml` builds and publishes the site.

The site URL and base path (`/<repo-name>`) are detected automatically.

## Projects sync

`update-projects.yml` runs daily at 00:30 UTC (and on demand from the Actions tab). It
refreshes each repo's description, stars, forks, topics, license and latest release from the
`swingcraft4j` organization, adds new public repos (forks are skipped) and removes deleted or
private ones. It uses the built-in `GITHUB_TOKEN`, so there's nothing to set up. To use another
organization, set a repository variable `PROJECTS_ORG`.

This website's own repo, `swingcraft4j-site`, is left out of the list. To leave out other repos,
set a repository variable `PROJECTS_IGNORE` to a comma-separated list of repo names (include
`swingcraft4j-site` in it too, since the variable replaces the default).

## Sponsors sync

`update-sponsors.yml` runs daily at 00:00 UTC (and on demand). It:

- adds new public sponsors as **current** (shown first on the site)
- moves sponsors who stopped to **past**, with the end date
- moves returning sponsors back to **current**
- commits `sponsors.json` and redeploys, only when something changed

Private sponsors are never fetched or shown.

One-time setup:

1. On the sponsored account, create a **classic personal access token**
   (Settings → Developer settings → Personal access tokens → Tokens (classic)) with the
   `read:user` scope (`read:org` too if an organization is sponsored).
2. In this repo, add it under **Settings → Secrets and variables → Actions → Secrets** as `SPONSORS_TOKEN`.
3. Optional: if the sponsored account isn't the repo owner, add a repository **variable** `SPONSORS_LOGIN`.
4. Run **Actions → Update sponsors → Run workflow** once.

To run it on your own computer, `.\scripts\update-sponsors.ps1` (Windows) asks for the token
without saving it.

**Adding a sponsor by hand:** add an entry with `id` (the account's GitHub node ID from
`https://api.github.com/users/<login>` with the header `X-Github-Next-Global-ID: 1`), `login`,
`name`, `type`, `avatarUrl`, `url` and `"status": "current"`. Leave out `since`; the next sync
fills in the real date.
