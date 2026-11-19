// Publishes the files in a topic's lab-data/ folder so readers can download them from the Labs page:
//   /library/01-identity/labs/lab-data/workday_employees.csv
//   /library/01-identity/labs/lab-data/lab-files.zip   (all of them in one zip)
// The same relative links (lab-data/...) also work when labs.md is read on GitHub.
import fs from 'node:fs';
import path from 'node:path';
import type { APIRoute } from 'astro';
import { ROOT, getLearningPath } from '../../../../../lib/site';
import { makeZip } from '../../../../../lib/zip';

export async function getStaticPaths() {
  const topics = (await getLearningPath()).filter((t) => t.live && t.folder && t.sections.some((s) => s.key === 'labs'));
  return topics.flatMap((t) => {
    const dir = path.join(ROOT, t.folder!, 'lab-data');
    if (!fs.existsSync(dir)) return [];
    const files = fs
      .readdirSync(dir)
      .filter((f) => !f.startsWith('.') && f !== 'lab-files.zip' && fs.statSync(path.join(dir, f)).isFile())
      .sort();
    return [
      ...files.map((f) => ({ params: { topic: t.slug, file: f }, props: { dir, files: [f], zip: false, slug: t.slug } })),
      { params: { topic: t.slug, file: 'lab-files.zip' }, props: { dir, files, zip: true, slug: t.slug } },
    ];
  });
}

export const GET: APIRoute = ({ props }) => {
  const { dir, files, zip, slug } = props as { dir: string; files: string[]; zip: boolean; slug: string };
  if (!zip) return new Response(fs.readFileSync(path.join(dir, files[0])));
  const body = makeZip(
    files.map((f) => ({
      name: `${slug}-lab-files/${f}`,
      data: new Uint8Array(fs.readFileSync(path.join(dir, f))),
      date: fs.statSync(path.join(dir, f)).mtime,
    })),
  );
  return new Response(body, { headers: { 'Content-Type': 'application/zip' } });
};
