// Reads the YAML files in the repo root (learning-path.yml, profile.yml, resources.yml, topic.yml)
// and works out which topic sections exist and how long each takes to read.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { getCollection } from 'astro:content';

// The repo root is one level above site/
export const ROOT = path.resolve(process.cwd(), '..');

export const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
export const url = (p = '') => base + p.replace(/^\//, '');

export const SECTIONS = [
  { key: 'notes', label: 'Notes', icon: 'book-open', blurb: 'How it works' },
  { key: 'governance', label: 'Governance', icon: 'shield-check', blurb: 'What can go wrong and how it is controlled' },
  { key: 'labs', label: 'Labs', icon: 'flask-conical', blurb: 'Scenarios worked through' },
] as const;
export type SectionKey = (typeof SECTIONS)[number]['key'];

export type Section = { key: SectionKey; label: string; icon: string; blurb: string; href: string; minutes: number; progressKey: string };
export type Topic = {
  slug?: string;
  folder?: string;
  number: string;
  title: string;
  summary?: string;
  week?: number;
  tag?: string;
  icon: string;
  status: 'soon' | 'draft' | 'in-progress' | 'complete';
  live: boolean;
  sections: Section[];
  minutes: number;
};

function readYaml(file: string) {
  const full = path.join(ROOT, file);
  return fs.existsSync(full) ? parse(fs.readFileSync(full, 'utf8')) : undefined;
}

// Finds the content entry for a file path like "01-foundations/01-identity/notes.md"
export function byFile<T extends { filePath?: string }>(entries: T[], file: string) {
  const norm = (p?: string) => (p ?? '').replace(/\\/g, '/');
  return entries.find((e) => norm(e.filePath).endsWith(file));
}

// Reading time: words in the text (without comments and code blocks) / 200 words a minute
export function readingMinutes(body = '') {
  const text = body.replace(/<!--[\s\S]*?-->/g, '').replace(/```[\s\S]*?```/g, '');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export const sectionHref = (slug: string, key: string) => url(`library/${slug}/${key === 'notes' ? '' : key + '/'}`);

export async function getLearningPath(): Promise<Topic[]> {
  const entries = await getCollection('sections');
  const list = readYaml('learning-path.yml') || [];
  return list.map((item: any, i: number) => {
    const number = String(i + 1).padStart(2, '0');
    const t = item.folder ? readYaml(path.join(item.folder, 'topic.yml')) : undefined;
    if (!t) return { number, title: item.title, icon: 'lock', status: 'soon', live: false, sections: [], minutes: 0 };
    const sections: Section[] = SECTIONS.flatMap((s) => {
      const entry = byFile(entries, `${item.folder}/${s.key}.md`);
      if (!entry) return [];
      return [{ ...s, href: sectionHref(item.slug, s.key), minutes: readingMinutes(entry.body), progressKey: `${item.slug}/${s.key}` }];
    });
    return {
      slug: item.slug,
      folder: item.folder,
      number: t.number ?? number,
      title: t.title ?? item.slug,
      summary: t.summary,
      week: t.week,
      tag: t.tag,
      icon: t.icon ?? 'book-open',
      status: t.status ?? 'draft',
      live: true,
      sections,
      minutes: sections.reduce((n, s) => n + s.minutes, 0),
    };
  });
}

// How much of the series is built (from each topic.yml status), shown around the profile picture
export function seriesPercent(topics: Topic[]) {
  if (!topics.length) return 0;
  const done = topics.filter((t) => t.status === 'complete').length;
  const half = topics.filter((t) => t.status === 'in-progress').length;
  return Math.round(((done + half * 0.5) / topics.length) * 100);
}

export function getProfile(): Record<string, string | undefined> {
  return readYaml('profile.yml') || {};
}

export function getResources(): { name: string; type?: string; use?: string; url?: string }[] {
  return readYaml('resources.yml') || [];
}

export const hasResume = fs.existsSync(path.join(process.cwd(), 'public', 'resume.pdf'));
