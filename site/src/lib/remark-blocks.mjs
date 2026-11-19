// A small Markdown plugin.
// 1. Removes HTML comments (your writing prompts) from the page.
// 2. Turns fenced code blocks into interactive parts:
//      ```quiz     -> "Check yourself" questions
//      ```stages   -> the "6 components work together" picker
//      ```mermaid  -> a diagram (drawn in the browser)
// 3. Labs pages:
//      "## Part A — IAM Analyst perspective" / "## Part B — GRC Analyst perspective"
//        -> grouped into a switch so the reader sees one perspective at a time
//      links to lab-data/... -> download links, plus a "Download all files" button
//        after the table under "## Lab files"
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

function icon(name, size = 16) {
  const file = path.join(process.cwd(), 'node_modules/lucide-static/icons', `${name}.svg`);
  if (!fs.existsSync(file)) return '';
  return fs
    .readFileSync(file, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<svg[^>]*>/, (tag) =>
      tag
        .replace(/\s(width|height|class)="[^"]*"/g, '')
        .replace('<svg', `<svg width="${size}" height="${size}" class="icon" aria-hidden="true" focusable="false"`),
    )
    .trim();
}

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const COMPONENTS = [
  { n: 1, name: 'Identity store', q: 'Who exists?' },
  { n: 2, name: 'Lifecycle', q: 'When does access start, change, stop?' },
  { n: 3, name: 'Authentication', q: 'Are you who you claim?' },
  { n: 4, name: 'Authorisation', q: 'What can you do?' },
  { n: 5, name: 'Privileged access', q: 'Who holds powerful access?' },
  { n: 6, name: 'Governance', q: 'Is it still right? What happened?' },
];

function errorBox(kind, err) {
  return `<div class="block-error"><b>This ${kind} block couldn't be read.</b> Check the indentation. (${esc(err.message)})</div>`;
}

function quizHtml(src) {
  const items = parse(src);
  if (!Array.isArray(items)) throw new Error('a quiz must be a list of questions');
  const qs = items
    .map((item, i) => {
      const answer = Number(item.answer);
      const opts = (item.options || [])
        .map((o, j) => `<button type="button"${j + 1 === answer ? ' data-ok="1"' : ''}>${esc(o)}</button>`)
        .join('');
      return `<div class="q"><p>${i + 1}. ${esc(item.q)}</p><div class="opts">${opts}</div><div class="why" hidden>${esc(item.why)}</div></div>`;
    })
    .join('');
  return `<div class="widget quiz">${qs}</div>`;
}

function stagesHtml(src) {
  const data = parse(src) || {};
  const stages = data.stages || [];
  const buttons = stages
    .map(
      (s, i) =>
        `<button type="button" aria-pressed="${i === 0}" data-on="${esc((s.on || []).join(','))}" data-text="${esc(s.text)}">${esc(s.name)}</button>`,
    )
    .join('');
  const comps = COMPONENTS.map(
    (c) => `<div class="comp" data-c="${c.n}" style="--cc:var(--c${c.n})"><b>${c.n} ${esc(c.name)}</b><small>${esc(c.q)}</small></div>`,
  ).join('');
  return `<div class="widget stages-widget">
<h3 class="widget-title">${esc(data.title || 'See the components work together')}</h3>
${data.lead ? `<p class="lead">${esc(data.lead)}</p>` : ''}
<div class="stages" role="group" aria-label="Stages">${buttons}</div>
<div class="comps">${comps}</div>
<div class="stage-text" aria-live="polite"></div>
</div>`;
}

const textOf = (node) =>
  node.type === 'text' || node.type === 'inlineCode' ? node.value : (node.children || []).map(textOf).join('');

// "Part A — IAM Analyst perspective" -> { label: "IAM Analyst", tone: "iam" }
function perspective(node) {
  if (node.type !== 'heading' || node.depth !== 2) return null;
  const m = textOf(node).trim().match(/^Part\s+[A-Z]\s*[—–-]\s*(.+?)\s+perspective$/i);
  if (!m) return null;
  const label = m[1].trim();
  const tone = /\bIAM\b/i.test(label) ? 'iam' : /\bGRC\b/i.test(label) ? 'grc' : 'other';
  return { label, tone };
}

function wrapPerspectives(tree) {
  const out = [];
  const kids = tree.children;
  let i = 0;
  while (i < kids.length) {
    if (!perspective(kids[i])) {
      out.push(kids[i++]);
      continue;
    }
    out.push({ type: 'html', value: '<div class="persp" data-persp>' });
    while (i < kids.length && perspective(kids[i])) {
      const p = perspective(kids[i]);
      out.push({ type: 'html', value: `<section class="persp-panel tone-${p.tone}" data-label="${esc(p.label)}" data-tone="${p.tone}">` });
      out.push(kids[i++]);
      // The panel runs until the next level-2 heading (a thematic break before it is dropped)
      while (i < kids.length && !(kids[i].type === 'heading' && kids[i].depth <= 2)) {
        if (kids[i].type === 'thematicBreak' && kids[i + 1]?.type === 'heading' && kids[i + 1].depth <= 2) {
          i++;
          continue;
        }
        out.push(kids[i++]);
      }
      out.push({ type: 'html', value: '</section>' });
    }
    out.push({ type: 'html', value: '</div>' });
  }
  tree.children = out;
}

// Links to lab-data/... become download links. After the first table under "## Lab files",
// add a button that downloads all the lab files as one zip.
function labFiles(tree) {
  const mark = (node) => {
    if (node.type === 'link' && /^(\.\/)?lab-data\/[^/]+$/.test(node.url)) {
      node.data = { ...(node.data || {}), hProperties: { download: '', className: ['dl-link'] } };
      node.children.unshift({ type: 'html', value: icon('download', 15) });
    }
    (node.children || []).forEach(mark);
  };
  mark(tree);
  const kids = tree.children;
  const h = kids.findIndex((n) => n.type === 'heading' && n.depth === 2 && /^lab files$/i.test(textOf(n).trim()));
  if (h < 0) return;
  for (let j = h + 1; j < kids.length && !(kids[j].type === 'heading' && kids[j].depth <= 2); j++) {
    if (kids[j].type === 'table') {
      kids.splice(j + 1, 0, {
        type: 'html',
        value: `<p class="dl-all"><a class="btn btn-outline sm" href="lab-data/lab-files.zip" download>${icon('folder-down', 18)}<span>Download all files (.zip)</span></a></p>`,
      });
      return;
    }
  }
}

function transform(node) {
  if (!node.children) return;
  node.children = node.children.flatMap((child) => {
    // Drop <!-- comments -->
    if (child.type === 'html' && /^\s*<!--[\s\S]*-->\s*$/.test(child.value)) return [];
    if (child.type === 'code') {
      try {
        if (child.lang === 'quiz') return [{ type: 'html', value: quizHtml(child.value) }];
        if (child.lang === 'stages') return [{ type: 'html', value: stagesHtml(child.value) }];
      } catch (err) {
        return [{ type: 'html', value: errorBox(child.lang, err) }];
      }
      if (child.lang === 'mermaid') return [{ type: 'html', value: `<pre class="mermaid">${esc(child.value)}</pre>` }];
    }
    transform(child);
    return [child];
  });
}

export default function remarkBlocks() {
  return (tree) => {
    transform(tree);
    labFiles(tree);
    wrapPerspectives(tree);
  };
}
