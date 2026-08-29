/**
 * HTML templates for the static blog (scripts/build-blog.js).
 * Design tokens copied from public/platform/index.html — the blog and the
 * /city/* function pages share the same standalone-page aesthetic.
 */

const ORIGIN = 'https://findlocal.community';
const GA_ID = 'G-SK3E86M5F8';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonLdScript(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

const SHARED_CSS = `
  :root{--bg:#fff;--bg-elev:#F9FAFB;--border:#E5E7EB;--teal:#006565;--teal-soft:#E6F7F5;--orange:#EC7C35;
    --text:#111827;--text-2:#4B5563;--text-3:#9CA3AF;--maxw:760px;
    --sans:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    --head:'Epilogue',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);font-size:17px;line-height:1.7;-webkit-font-smoothing:antialiased}
  h1,h2,h3{font-family:var(--head);letter-spacing:-.03em;line-height:1.2}
  a{color:var(--teal)}
  img{max-width:100%;border-radius:12px}
  .wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px}
  header.site{border-bottom:1px solid var(--border)}
  header.site .wrap{display:flex;align-items:center;gap:24px;height:64px}
  header.site .brand{font-family:var(--head);font-weight:800;font-size:20px;color:var(--text);text-decoration:none}
  header.site nav{display:flex;gap:20px;margin-left:auto}
  header.site nav a{color:var(--text-2);text-decoration:none;font-weight:600;font-size:15px}
  main{padding:40px 0 64px}
  footer.site{border-top:1px solid var(--border);padding:32px 0 48px;color:var(--text-2);font-size:14px}
  footer.site .links{display:flex;gap:16px;flex-wrap:wrap}
  footer.site a{color:var(--text-2);text-decoration:none}
`;

function pageShell({ headExtra, bodyHtml, title, description, canonical, noindex, image }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${canonical}" />
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}" />
<meta name="theme-color" content="#006565" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Find Local" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${canonical}" />
${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ''}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
<link rel="icon" href="/favicon.ico" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
${headExtra}
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${GA_ID}');</script>
<style>${SHARED_CSS}</style>
</head>
<body>
<header class="site"><div class="wrap">
  <a class="brand" href="/">Find Local</a>
  <nav><a href="/">Discover</a><a href="/venues">Venues</a><a href="/blog">Blog</a><a href="/about">About</a></nav>
</div></header>
${bodyHtml}
<footer class="site"><div class="wrap">
  <div class="links"><a href="/">Discover events</a><a href="/venues">Venues</a><a href="/platform">Platform</a><a href="/about">About</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div>
</div></footer>
</body>
</html>`;
}

/** meta: parsed frontmatter (+ slug); bodyHtml: rendered markdown. */
function renderArticle(meta, bodyHtml) {
  const canonical = `${ORIGIN}/blog/${meta.slug}/`;
  const published = meta.date;
  const modified = meta.updated || meta.date;
  const author = meta.author || 'Find Local';
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: meta.title,
    description: meta.description,
    datePublished: published,
    dateModified: modified,
    author: { '@type': author === 'Find Local' ? 'Organization' : 'Person', name: author },
    publisher: { '@type': 'Organization', name: 'Find Local', url: ORIGIN },
    mainEntityOfPage: canonical,
    ...(meta.image && { image: meta.image }),
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${ORIGIN}/blog/` },
      { '@type': 'ListItem', position: 3, name: meta.title, item: canonical },
    ],
  };
  const dateLabel = new Date(`${published}T12:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const body = `<main class="wrap">
  <article>
    <p style="margin:0 0 8px"><a href="/blog/" style="font-weight:600;text-decoration:none">← Blog</a></p>
    <h1 style="font-size:clamp(28px,5vw,40px);margin:0 0 8px">${escapeHtml(meta.title)}</h1>
    <p style="color:var(--text-3);margin:0 0 32px;font-size:15px">${escapeHtml(dateLabel)} · ${escapeHtml(author)}</p>
    ${bodyHtml}
  </article>
</main>`;

  return pageShell({
    headExtra: `${jsonLdScript(articleLd)}\n${jsonLdScript(breadcrumbLd)}`,
    bodyHtml: body,
    title: `${meta.title} | Find Local Blog`,
    description: meta.description,
    canonical,
    image: meta.image,
  });
}

/** posts: [{slug, title, description, date}] sorted newest first. */
function renderIndex(posts) {
  const canonical = `${ORIGIN}/blog/`;
  const items = posts
    .map((p) => {
      const dateLabel = new Date(`${p.date}T12:00:00`).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      return `<li style="margin:0 0 28px;list-style:none">
  <a href="/blog/${p.slug}/" style="font-family:var(--head);font-weight:700;font-size:22px;text-decoration:none">${escapeHtml(p.title)}</a>
  <p style="margin:4px 0 0;color:var(--text-2)">${escapeHtml(p.description)}</p>
  <p style="margin:4px 0 0;color:var(--text-3);font-size:14px">${escapeHtml(dateLabel)}</p>
</li>`;
    })
    .join('\n');

  const body = `<main class="wrap">
  <h1 style="font-size:clamp(28px,5vw,40px);margin:0 0 8px">Find Local Blog</h1>
  <p style="color:var(--text-2);margin:0 0 40px">Guides and notes on local events, venues, and how Find Local works.</p>
  <ul style="margin:0;padding:0">${items}</ul>
</main>`;

  return pageShell({
    headExtra: jsonLdScript({
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Find Local Blog',
      url: canonical,
    }),
    bodyHtml: body,
    title: 'Blog | Find Local',
    description: 'Guides and notes on local events, venues, and event discovery from Find Local.',
    canonical,
  });
}

module.exports = { renderArticle, renderIndex, escapeHtml, ORIGIN };
