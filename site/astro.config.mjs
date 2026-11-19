// Astro settings for the site.
// site + base make the links work on GitHub Pages at https://imarchanash.github.io/Learn_IAM/
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkBlocks from './src/lib/remark-blocks.mjs';

export default defineConfig({
  site: 'https://imarchanash.github.io',
  base: '/Learn_IAM',
  trailingSlash: 'always',
  markdown: {
    // remarkBlocks turns ```quiz, ```stages and ```mermaid blocks in your notes into interactive parts,
    // and removes <!-- comments --> so your writing prompts never reach the live site.
    processor: unified({ remarkPlugins: [remarkBlocks] }),
    syntaxHighlight: false,
  },
  vite: {
    // Mermaid (the diagram library) is large, but it only loads on pages that have a diagram.
    build: { chunkSizeWarningLimit: 3000 },
  },
});
