/**
 * Build-time static blog generator. Reads content/blog/*.md (simple
 * `key: value` frontmatter between --- fences), renders markdown with
 * `marked`, and writes fully static, crawlable pages:
 *
 *   dist/blog/index.html          — post index (served at /blog)
 *   dist/blog/<slug>/index.html   — one page per post
 *   dist/sitemap-blog.xml         — referenced by the /sitemap index function
 *
 * Static assets win over the SPA catch-all in _redirects, so no routing
 * changes are needed. Runs from `npm run build` after inject-head.js.
 */
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { renderArticle, renderIndex, ORIGIN } = require('./lib/blog-template');

const contentDir = path.join(__dirname, '..', 'content', 'blog');
const distDir = path.join(__dirname, '..', 'dist');
const blogDir = path.join(distDir, 'blog');

if (!fs.existsSync(distDir)) {
  console.error('dist/ not found. Run expo export first.');
  process.exit(1);
}

function parseFrontmatter(raw, file) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`${file}: missing frontmatter`);
  const meta = {};
  for (const line of match[1].split('\n')) {
    const kv = /^(\w+):\s*(.*)$/.exec(line.trim());
    if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  for (const key of ['title', 'description', 'date']) {
    if (!meta[key]) throw new Error(`${file}: frontmatter missing "${key}"`);
  }
  return { meta, body: match[2] };
}

const posts = [];
const files = fs.existsSync(contentDir)
  ? fs.readdirSync(contentDir).filter((f) => f.endsWith('.md'))
  : [];

for (const file of files) {
  const raw = fs.readFileSync(path.join(contentDir, file), 'utf8');
  const { meta, body } = parseFrontmatter(raw, file);
  if (meta.draft === 'true') continue;
  meta.slug = file.replace(/\.md$/, '');
  const html = renderArticle(meta, marked.parse(body));
  const outDir = path.join(blogDir, meta.slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  posts.push(meta);
}

posts.sort((a, b) => (a.date < b.date ? 1 : -1));

fs.mkdirSync(blogDir, { recursive: true });
fs.writeFileSync(path.join(blogDir, 'index.html'), renderIndex(posts), 'utf8');

const urls = [
  `  <url><loc>${ORIGIN}/blog/</loc></url>`,
  ...posts.map(
    (p) =>
      `  <url><loc>${ORIGIN}/blog/${p.slug}/</loc><lastmod>${p.updated || p.date}</lastmod></url>`
  ),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
fs.writeFileSync(path.join(distDir, 'sitemap-blog.xml'), sitemap, 'utf8');

console.log(`Built ${posts.length} blog post(s) + index + sitemap-blog.xml`);
