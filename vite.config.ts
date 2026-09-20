import { defineConfig } from "vite";

// GitHub Pages deploys the site under /meet-the-ottomans/ (project pages),
// so absolute asset URLs like "/world/…" and "/environment-map.png" must be
// rewritten to relative ones or they 404 on gh-pages.
export default defineConfig({
  base: "./",
});
