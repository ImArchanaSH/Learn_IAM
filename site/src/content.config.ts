// Tells Astro where the Markdown lives. Paths are relative to the site/ folder,
// so ".." is the root of the Learn_IAM repo. Nothing is copied into site/.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// notes.md, governance.md and labs.md in every topic folder, e.g. 01-foundations/01-identity/notes.md
const sections = defineCollection({
  loader: glob({ pattern: '[0-9][0-9]-*/[0-9][0-9]-*/{notes,governance,labs}.md', base: '..' }),
});

// Home and About text: pages/home.md, pages/about.md
const pages = defineCollection({
  loader: glob({ pattern: 'pages/*.md', base: '..' }),
});

export const collections = { sections, pages };
