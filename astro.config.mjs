// @ts-check
import { defineConfig } from 'astro/config';

// SITE_URL and BASE_PATH are supplied by the GitHub Pages workflow
// (.github/workflows/deploy.yml), so the same config works for
// https://<user>.github.io/<repo>/ and for a custom domain.
// Locally they are unset and the site is served from "/".
export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  base: process.env.BASE_PATH || '/',
});
