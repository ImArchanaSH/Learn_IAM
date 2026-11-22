// Builds /search.json: every topic section with its headings, used by the search box.
import { getCollection, render } from 'astro:content';
import { byFile, getLearningPath } from '../lib/site';

export async function GET() {
  const entries = await getCollection('sections');
  const items = [];
  for (const t of (await getLearningPath()).filter((t) => t.live)) {
    for (const s of t.sections) {
      const entry = byFile(entries, `${t.folder}/${s.key}.md`)!;
      const { headings } = await render(entry);
      items.push({
        topic: t.title,
        section: s.label,
        href: s.href,
        headings: headings.filter((h) => h.depth <= 3 && !/^topic \d+\s*:/i.test(h.text)).map((h) => ({ text: h.text, slug: h.slug })),
      });
    }
  }
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json' } });
}
