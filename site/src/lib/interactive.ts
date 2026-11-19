// Browser code for the whole site.
//  - Reading progress: saved in the reader's own browser (localStorage), nothing is sent anywhere.
//  - "Continue where you left off", "On this page" highlighting, Mark as done
//  - Search, light/dark mode, text size, mobile menu, back to top
//  - Quiz, component picker and Mermaid diagrams written in the Markdown
//  - Labs: the IAM Analyst / GRC Analyst perspective switch

type SectionState = { max: number; done: boolean; heading?: string; headingText?: string };
type Store = {
  sections: Record<string, SectionState>;
  last?: { key: string; href: string; title: string; heading?: string; headingText?: string };
};

const PROGRESS_KEY = 'learn-iam:progress';
const PREFS_KEY = 'learn-iam:prefs';
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));
const base = document.body.dataset.base || '/';

function load<T>(key: string, fallback: T): T {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') };
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or storage full: progress just isn't saved */
  }
}

let store: Store = load<Store>(PROGRESS_KEY, { sections: {} });
const prefs = load<{ theme?: string; text?: string }>(PREFS_KEY, {});

/* ---------- Toast ---------- */
const toastEl = $('.toast');
let toastTimer: number | undefined;
function toast(html: string, ms = 4000) {
  if (!toastEl) return;
  toastEl.innerHTML = html;
  toastEl.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toastEl.hidden = true), ms);
}


/* ---------- Labs: perspective switch ----------
   The Markdown plugin wraps "## Part A — … perspective" sections in .persp-panel.
   Here they become tabs, so the reader sees one perspective at a time.
   Without JavaScript both parts simply show one after the other. */
$$('[data-persp]').forEach((wrap, w) => {
  const panels = $$<HTMLElement>(':scope > .persp-panel', wrap);
  if (panels.length < 2) return;
  const bar = document.createElement('div');
  bar.className = 'persp-tabs';
  bar.setAttribute('role', 'tablist');
  bar.setAttribute('aria-label', 'Choose a perspective');
  const tabs = panels.map((p, i) => {
    p.id ||= `persp-${w}-${i}`;
    p.setAttribute('role', 'tabpanel');
    const b = document.createElement('button');
    b.type = 'button';
    b.id = `${p.id}-tab`;
    b.className = `persp-tab tone-${p.dataset.tone || 'other'}`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', p.id);
    b.innerHTML = `<span class="persp-step">${String.fromCharCode(65 + i)}</span><span>${escapeHtml(p.dataset.label || `Part ${i + 1}`)}</span>`;
    p.setAttribute('aria-labelledby', b.id);
    bar.appendChild(b);
    return b;
  });
  wrap.prepend(bar);

  const show = (i: number, focus = false) => {
    panels.forEach((p, j) => (p.hidden = j !== i));
    tabs.forEach((t, j) => {
      t.setAttribute('aria-selected', String(j === i));
      t.tabIndex = j === i ? 0 : -1;
    });
    if (focus) tabs[i].focus();
    window.dispatchEvent(new Event('scroll'));
  };

  // "Next: GRC Analyst perspective" at the end of each panel except the last
  panels.slice(0, -1).forEach((p, i) => {
    const next = document.createElement('p');
    next.className = 'persp-next';
    next.innerHTML = `<button type="button" class="btn btn-outline sm">Next: ${escapeHtml(panels[i + 1].dataset.label || '')} perspective →</button>`;
    next.querySelector('button')!.addEventListener('click', () => {
      show(i + 1, true);
      bar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    p.appendChild(next);
  });

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(i));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        show((i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length, true);
      }
    });
  });

  // A link to a heading inside a hidden part (e.g. from "On this page" or search) opens that part
  const fromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    const i = target ? panels.findIndex((p) => p.contains(target)) : -1;
    if (i < 0) return false;
    show(i);
    target!.scrollIntoView();
    return true;
  };
  if (!fromHash()) show(0);
  window.addEventListener('hashchange', fromHash);
});
const isHidden = (el: HTMLElement) => !!(el.closest('.persp-panel') as HTMLElement | null)?.hidden;

/* ---------- Progress maths ---------- */
const sectionPct = (key: string) => {
  const s = store.sections[key];
  if (!s) return 0;
  return s.done ? 100 : Math.min(99, Math.round(s.max * 100));
};
const topicPct = (slug: string, keys: string) => {
  const list = keys.split(',').filter(Boolean);
  if (!list.length) return 0;
  return Math.round(list.reduce((n, k) => n + sectionPct(`${slug}/${k}`), 0) / list.length);
};

function paint() {
  $$('[data-topic-ring]').forEach((el) => el.style.setProperty('--p', String(topicPct(el.dataset.topicRing!, el.dataset.sections || ''))));
  $$('[data-topic-bar]').forEach((el) => (el.style.width = topicPct(el.dataset.topicBar!, el.dataset.sections || '') + '%'));
  $$('[data-topic-pct]').forEach((el) => (el.textContent = topicPct(el.dataset.topicPct!, el.dataset.sections || '') + '%'));
  $$('[data-ring]').forEach((el) => el.style.setProperty('--p', String(sectionPct(el.dataset.ring!))));
  $$('[data-bar]').forEach((el) => (el.style.height = Math.max(4, sectionPct(el.dataset.bar!)) + '%'));
  $$('[data-pct]').forEach((el) => (el.textContent = sectionPct(el.dataset.pct!) + '%'));
  $$('[data-done-mark]').forEach((el) => (el.hidden = !store.sections[el.dataset.doneMark!]?.done));
  $$('[data-status]').forEach((el) => {
    if (!el.dataset.minutes) el.dataset.minutes = (el.textContent || '').split('·').pop()!.trim();
    const p = sectionPct(el.dataset.status!);
    el.textContent = p >= 100 ? 'Done ✓' : p > 0 ? `${p}% read · ${el.dataset.minutes}` : `Not started · ${el.dataset.minutes}`;
    el.classList.toggle('is-done', p >= 100);
  });
  $$('[data-overall]').forEach((el) => {
    const keys = (el.dataset.overall || '').split(',').filter(Boolean);
    const p = keys.length ? Math.round(keys.reduce((n, k) => n + sectionPct(k), 0) / keys.length) : 0;
    el.style.setProperty('--p', String(p));
    const b = el.querySelector('b');
    if (b) b.textContent = p + '%';
  });
  const pageKey = document.body.dataset.pageKey;
  if (pageKey) {
    const ring = $('[data-ring-page]');
    if (ring) {
      ring.style.setProperty('--p', String(sectionPct(pageKey)));
      ring.querySelector('b')!.textContent = sectionPct(pageKey) + '%';
    }
    const btn = $<HTMLButtonElement>('[data-mark-done]');
    if (btn) {
      const done = !!store.sections[pageKey]?.done;
      btn.classList.toggle('is-done', done);
      btn.querySelector('span')!.textContent = done ? 'Done ✓ (undo)' : 'Mark as done';
      btn.setAttribute('aria-pressed', String(done));
    }
  }
}

/* ---------- Topic pages: track reading ---------- */
const pageKey = document.body.dataset.pageKey;
const article = $('[data-article]');
const readingBar = $('.reading-bar span');

if (pageKey && article) {
  const state = (store.sections[pageKey] ||= { max: 0, done: false });
  const tocLinks = $$<HTMLAnchorElement>('[data-toc]');
  const heads = tocLinks.map((a) => document.getElementById(a.dataset.toc!)).filter(Boolean) as HTMLElement[];
  const sectionTitle = $('.seg [aria-current="page"] span')?.textContent || 'this section';

  let ticking = false;
  let dirty = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const rect = article.getBoundingClientRect();
      const seen = (window.innerHeight - rect.top) / rect.height;
      const p = Math.max(0, Math.min(1, seen));
      if (readingBar) readingBar.style.width = p * 100 + '%';
      if (p > state.max) {
        state.max = p;
        if (p >= 0.98) state.done = true;
        dirty = true;
      }
      // "On this page": highlight the heading you're in, tick the ones above it
      let current = -1;
      heads.forEach((h, i) => {
        if (!isHidden(h) && h.getBoundingClientRect().top < window.innerHeight * 0.3) current = i;
      });
      tocLinks.forEach((a, i) => {
        a.classList.toggle('active', i === current);
        a.classList.toggle('passed', i < current);
      });
      if (current >= 0 && heads[current].id !== state.heading) {
        state.heading = heads[current].id;
        state.headingText = heads[current].textContent || '';
        dirty = true;
      }
      if (dirty) {
        store.last = {
          key: pageKey,
          href: location.pathname,
          title: `${document.title.split('·')[0].trim()}`,
          heading: state.heading,
          headingText: state.headingText,
        };
        paint();
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.setInterval(() => {
    if (dirty) {
      save(PROGRESS_KEY, store);
      dirty = false;
    }
  }, 1500);
  window.addEventListener('pagehide', () => save(PROGRESS_KEY, store));
  onScroll();

  // Offer to jump back to where the reader stopped last time
  if (!location.hash && state.heading && state.max > 0.05 && !state.done) {
    const target = document.getElementById(state.heading);
    if (target && (isHidden(target) || target.getBoundingClientRect().top > window.innerHeight)) {
      toast(
        `<span>Pick up where you left off: <b>${escapeHtml(state.headingText || '')}</b></span><button type="button" class="btn btn-primary sm" data-jump>Jump there</button>`,
        12000,
      );
      $('[data-jump]')?.addEventListener('click', () => {
        if (isHidden(target)) location.hash = target.id;
        else target.scrollIntoView({ behavior: 'smooth' });
        toastEl!.hidden = true;
      });
    }
  }

  $('[data-mark-done]')?.addEventListener('click', () => {
    state.done = !state.done;
    if (state.done) state.max = 1;
    save(PROGRESS_KEY, store);
    paint();
    const next = $<HTMLAnchorElement>('.pager-link.next');
    toast(
      state.done
        ? `<span>Nice work, <b>${escapeHtml(sectionTitle)}</b> is done.</span>${next ? `<a class="btn btn-primary sm" href="${next.href}">Next section</a>` : ''}`
        : `<span>${escapeHtml(sectionTitle)} is back to in progress.</span>`,
    );
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/* ---------- Home: continue + greeting ---------- */
const cont = $<HTMLAnchorElement>('[data-continue]');
if (cont && store.last) {
  cont.href = store.last.href + (store.last.heading ? '#' + store.last.heading : '');
  const label = $('[data-continue-label]');
  if (label) label.textContent = `Continue: ${store.last.title.replace(/^.*–\s*/, '')}`;
  const note = $('[data-continue-note]');
  if (note && store.last.headingText) {
    note.textContent = `Last read: ${store.last.title} · “${store.last.headingText}”`;
    note.hidden = false;
  }
}
const greet = $('[data-greeting]');
if (greet) {
  const h = new Date().getHours();
  greet.textContent = h < 12 ? 'Good morning 👋' : h < 18 ? 'Good afternoon 👋' : 'Good evening 👋';
}

$('[data-reset-progress]')?.addEventListener('click', () => {
  if (!confirm('Clear your saved reading progress on this browser?')) return;
  store = { sections: {} };
  save(PROGRESS_KEY, store);
  paint();
  toast('Your reading progress was cleared.');
});

/* ---------- Topic row scroller ---------- */
const scroller = $('[data-scroller]');
$$<HTMLButtonElement>('[data-scroll]').forEach((b) =>
  b.addEventListener('click', () => scroller?.scrollBy({ left: Number(b.dataset.scroll) * (scroller.clientWidth * 0.8), behavior: 'smooth' })),
);

/* ---------- Mobile menu ---------- */
const openDrawer = (open: boolean) => {
  document.body.classList.toggle('drawer-open', open);
  if (open) $<HTMLElement>('#sidebar a')?.focus();
};
$$('[data-open-drawer]').forEach((b) => b.addEventListener('click', () => openDrawer(true)));
$$('[data-close-drawer]').forEach((b) => b.addEventListener('click', () => openDrawer(false)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') openDrawer(false);
});

/* ---------- Theme and text size ---------- */
$('[data-theme-toggle]')?.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  prefs.theme = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = prefs.theme;
  save(PREFS_KEY, prefs);
});
const sizes = ['', 'lg', 'xl'];
const sizeNames: Record<string, string> = { '': 'Normal', lg: 'Large', xl: 'Extra large' };
$('[data-text-size]')?.addEventListener('click', () => {
  const now = document.documentElement.dataset.text || '';
  const next = sizes[(sizes.indexOf(now) + 1) % sizes.length];
  if (next) document.documentElement.dataset.text = next;
  else delete document.documentElement.dataset.text;
  prefs.text = next;
  save(PREFS_KEY, prefs);
  toast(`Text size: <b>${sizeNames[next]}</b>`, 1800);
});

/* ---------- Back to top + page reading bar on other pages ---------- */
const toTop = $<HTMLButtonElement>('.to-top');
window.addEventListener(
  'scroll',
  () => {
    if (toTop) toTop.hidden = window.scrollY < 600;
    if (!article && readingBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      readingBar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    }
  },
  { passive: true },
);
toTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ---------- Search ---------- */
type SearchItem = { topic: string; section: string; href: string; headings: { text: string; slug: string }[] };
const input = $<HTMLInputElement>('#search');
const results = $('#search-results');
let index: SearchItem[] | null = null;
let active = -1;

async function getIndex() {
  if (!index) {
    try {
      index = await (await fetch(base + 'search.json')).json();
    } catch {
      index = [];
    }
  }
  return index!;
}
async function runSearch() {
  if (!input || !results) return;
  const q = input.value.trim().toLowerCase();
  if (q.length < 2) {
    results.hidden = true;
    return;
  }
  const hits: { label: string; sub: string; href: string }[] = [];
  for (const item of await getIndex()) {
    if (`${item.topic} ${item.section}`.toLowerCase().includes(q)) hits.push({ label: item.section, sub: item.topic, href: item.href });
    for (const h of item.headings) {
      if (h.text.toLowerCase().includes(q)) hits.push({ label: h.text, sub: `${item.topic} · ${item.section}`, href: `${item.href}#${h.slug}` });
    }
  }
  active = -1;
  results.innerHTML = hits.length
    ? hits
        .slice(0, 8)
        .map((h) => `<a role="option" href="${h.href}"><b>${escapeHtml(h.label)}</b><small>${escapeHtml(h.sub)}</small></a>`)
        .join('')
    : `<p class="empty">No matches for “${escapeHtml(input.value)}”</p>`;
  results.hidden = false;
}
input?.addEventListener('input', runSearch);
input?.addEventListener('focus', () => {
  getIndex();
  if (input.value.trim().length >= 2) runSearch();
});
input?.addEventListener('keydown', (e) => {
  const links = $$<HTMLAnchorElement>('a', results!);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    active = (active + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
    links.forEach((l, i) => l.classList.toggle('active', i === active));
  } else if (e.key === 'Enter' && links[Math.max(0, active)]) {
    location.href = links[Math.max(0, active)].href;
  } else if (e.key === 'Escape') {
    results!.hidden = true;
    input.blur();
  }
});
document.addEventListener('click', (e) => {
  if (results && !(e.target as Element).closest('.search')) results.hidden = true;
});
document.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement).tagName;
  if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
    e.preventDefault();
    input?.focus();
  }
});

/* ---------- Blocks written in Markdown ---------- */
$$('.quiz .q').forEach((q) => {
  const buttons = $$<HTMLButtonElement>('.opts button', q);
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      buttons.forEach((o) => o.classList.remove('right', 'wrong'));
      b.classList.add(b.dataset.ok ? 'right' : 'wrong');
      q.querySelector('[data-ok]')?.classList.add('right');
      const why = q.querySelector<HTMLElement>('.why');
      if (why && why.textContent?.trim()) why.hidden = false;
    }),
  );
});

$$('.stages-widget').forEach((w) => {
  const buttons = $$<HTMLButtonElement>('.stages button', w);
  const comps = $$('.comp', w);
  const text = $('.stage-text', w);
  const show = (btn: HTMLButtonElement) => {
    const on = (btn.dataset.on || '').split(',').map(Number);
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    comps.forEach((c) => c.classList.toggle('on', on.includes(Number(c.dataset.c))));
    if (text) text.textContent = btn.dataset.text || '';
  };
  buttons.forEach((b) => b.addEventListener('click', () => show(b)));
  if (buttons[0]) show(buttons[0]);
});

const diagrams = $$('pre.mermaid');
if (diagrams.length) {
  import('mermaid').then(({ default: mermaid }) => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'neutral', securityLevel: 'strict' });
    mermaid.run({ nodes: diagrams });
  });
}

paint();
