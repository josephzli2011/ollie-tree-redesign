// @ts-check
import { defineConfig } from 'astro/config';

// Preview lives on GitHub Pages under /ollie-tree-redesign.
// To move to the real domain, set site: 'https://www.ollietree.org' and base: '/'.
export default defineConfig({
  site: 'https://josephzli2011.github.io',
  base: '/ollie-tree-redesign',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
