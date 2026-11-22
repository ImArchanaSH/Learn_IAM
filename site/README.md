# Learn IAM – website

This folder builds the website for the Learn_IAM repo. It doesn't hold any notes. It reads the Markdown and YAML files in the repo root and turns them into a learning hub.

Live site: https://imarchanash.github.io/Learn_IAM/

## Where each part of the site comes from

| Part of the site | File (in the repo root) |
| --- | --- |
| Name, headline, LinkedIn and GitHub buttons, banner text | `profile.yml` |
| Short intro in the Home banner (two or three sentences) | `pages/home.md` |
| Study companions table (Learning path page) | `resources.yml` |
| Learning path order and "soon" topics | `learning-path.yml` |
| Topic title, summary, tag, icon, status, optional `updated` date | `<topic folder>/topic.yml` |
| Featured lab on Home (title, "Type" line, first quote) | top of the newest topic's `labs.md` |
| Notes / Governance / Labs | `<topic folder>/notes.md`, `governance.md`, `labs.md` |
| About page | `pages/about.md` |
| Resume link in the sidebar | appears when `site/public/resume.pdf` exists |

`<!-- comments -->` in the Markdown never appear on the site, so writing prompts can stay in the files.
Topic icons are names from https://lucide.dev/icons (for example `fingerprint`, `key-round`, `shield-check`).

## Features for readers

- **Reading progress** is saved in each reader's own browser (nothing is sent anywhere). It drives the progress rings in the sidebar and on the Learning path. Rings stay hidden until a reader has started, so first-time visitors don't see empty progress.
- **Continue where you left off:** once someone has started reading, Home shows a "Pick up where you left off" strip and the banner button becomes "Continue reading". Topic pages offer "Jump there".
- **Updated dates:** each topic shows when it last changed, from the last git commit to its folder (the deploy workflow fetches full history for this). Set `updated:` in topic.yml to override.
- **Wide reading column:** the "On this page" panel sits on the right only on wide screens; otherwise it folds into a box above the text.
- **On this page** highlights the current heading and ticks the ones already passed.
- **Mark as done** on every section, with Previous / Next buttons.
- **Search** across all topics and headings (press `/`).
- **Light / dark mode** and **text size**, remembered per reader.
- Quiz, component picker and Mermaid diagrams written straight in the Markdown.

## Adding a new topic

1. Create a folder such as `02-identifiers/02-identifiers-proofing/` with `notes.md`, `governance.md`, `labs.md` and a `topic.yml` (copy the one from Topic 1).
2. In `learning-path.yml`, give that topic a `slug` and a `folder`.
3. Merge to `main`. The site rebuilds itself.

## Interactive blocks you can write in Markdown

- ` ```quiz ` – "Check yourself" questions (example in the comment at the end of Topic 1 notes.md).
- ` ```stages ` – the "6 components work together" picker.
- ` ```mermaid ` – diagrams, same as on GitHub.

## How the code is organised

| File | What it does |
| --- | --- |
| `astro.config.mjs` | Site address (`/Learn_IAM`) and the Markdown plugin |
| `src/content.config.ts` | Tells Astro which Markdown files to read |
| `src/lib/site.ts` | Reads the YAML files, works out sections and reading times |
| `src/lib/remark-blocks.mjs` | Turns quiz / stages / mermaid blocks into HTML, removes comments, builds the Labs perspective switch and download links |
| `src/lib/interactive.ts` | Browser code: progress, continue, search, theme, text size, quiz, diagrams |
| `src/layouts/Base.astro` | App frame: sidebar, top bar, footer |
| `src/components/` | Sidebar, Icon (Lucide icons), Logo, MdPage |
| `src/pages/index.astro` | Home: intro, how each topic works, learning path preview, featured lab |
| `src/pages/library/` | Learning path page (`index.astro`, URL stays /library/) and the topic pages (`[topic]/[...section].astro`) |
| `src/pages/library/[topic]/labs/lab-data/[file].ts` | Publishes each topic's `lab-data/` files for download, plus `lab-files.zip` |
| `src/lib/zip.ts` | Makes the "Download all files" zip (no extra package needed) |
| `src/pages/search.json.ts` | Builds the search index |
| `src/styles/global.css` | Colours, fonts, layout (light and dark, mobile) |
| `../.github/workflows/deploy.yml` | Builds and publishes the site when `main` changes |

## Labs pages

- **Two perspectives:** headings written as `## Part A — IAM Analyst perspective` and `## Part B — GRC Analyst perspective` become a switch, so the reader sees one perspective at a time. IAM uses the Notes colour, GRC the Governance colour. On GitHub they read as two normal sections.
- **Lab files:** put a topic's data files in `<topic folder>/lab-data/`. Link them from labs.md as `lab-data/<file>` and they download from the site. A table under `## Lab files` gets a "Download all files (.zip)" button automatically.

## Run it on your computer

Needs Node.js 22.23.4 or newer (24 LTS recommended).

```bash
cd site
npm install
npm run dev      # http://localhost:4321/Learn_IAM/
```
