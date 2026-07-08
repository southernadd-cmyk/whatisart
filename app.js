async function loadHtml(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.text();
}

const COMIC_ORDER = [
  "Stephanie Dinkins","Eric Cantona","Albrecht Dürer","Tyler the Creator",
  "Slavoj Žižek","Yoko Ono","Michelangelo","Niyi Olagunju","Vivienne Westwood",
  "Stanley Kubrick","Claes Oldenburg","Judy Chicago","Muhammad Ali","Sofia Isella",
  "Gerhard Richter","Gwen John","Enheduanna","Sherrie Levine","Plato",
  "Randy Mario Poffo","Grayson Perry","George Bernard Shaw","Friedrich Nietzsche",
  "Bob Ross","David Choe","Frida Kahlo","Alberto Giacometti","Kurt Vonnegut Jr.",
  "Rick Rubin","Jim Dine","James Baldwin","Henry Ward Beecher","Ansel Adams",
  "Kara Walker","David Bowie","Wassily Kandinsky","Kurt Cobain","Henri Matisse",
  "René Magritte","David Hockney","David Salle","Akira Toriyama","King Robbo",
  "Keith Haring","Henry Ossawa Tanner","Hito Steyerl","J. M. W. Turner",
  "Francis Bacon","Joseph Beuys","Leonardo da Vinci","William Blake","Molière",
  "Ai Weiwei","Amoako Boafo","David Szauder","Jeff Koons","Bob Dylan",
  "Odilon Redon","Rafael Lozano-Hemmer","Tino Sehgal","Leo Tolstoy","Fiona Rae",
  "Linder","Joseph Kosuth","Artemisia Gentileschi","Christine de Pizan",
  "M. C. Escher","Damien Hirst","Lawrence Weiner","Alan Moore",
  "James Abbott Whistler","Martin Kippenberger","Blek le Rat","Hunter S. Thompson",
  "Cindy Sherman","Erykah Badu","MF DOOM","Edgar Degas","Georgia O'Keeffe",
  "Veronica Ryan","Sol LeWitt","Salvador Dalí","Donald Judd","Paul Cézanne",
  "Tracey Emin","Vincent van Gogh","Pablo Picasso","Jean-Michel Basquiat",
  "Banksy","Jackson Pollock","Barbara Kruger","Andy Warhol","Marcel Duchamp",
];

// ─── Image path helpers ────────────────────────────────────────────────────
function toOptimisedPath(src) {
  const clean = (src || '').replace(/^\.?\//, '');
  const lastSlash = clean.lastIndexOf('/');
  const dir  = clean.substring(0, lastSlash);
  const file = clean.substring(lastSlash + 1);
  const stem = file.replace(/\.[^.]+$/, '');
  return `./${dir}/${stem}-opt.webp`;
}
function toOriginalPath(src) {
  return './' + (src || '').replace(/^\.?\//, '');
}

// ─── Utilities ────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function slugify(text) {
  return (text || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ')
    .replace(/\s+/g,' ').trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}
function cleanupLine(line) { return line.replace(/\u00a0/g,' ').trim(); }
function hashtagToDisplay(t) {
  return t.replace(/^#+/,'').replace(/([a-z])([A-Z])/g,'$1 $2')
    .replace(/([A-Za-z])(\d)/g,'$1 $2').replace(/(\d)([A-Za-z])/g,'$1 $2')
    .replace(/_/g,' ').trim();
}
function isMetaLine(line) {
  const l = line.toLowerCase();
  return !line || line==='.' || l==='#whatisart' || line.startsWith('@') || line.startsWith('#');
}
function inferArtist(lines) {
  const clean = lines.map(cleanupLine).filter(Boolean);
  const n = clean.find(l => !isMetaLine(l));
  if (n) return n;
  const t = clean.find(l => l.startsWith('#') && l.toLowerCase()!=='#whatisart');
  if (t) return hashtagToDisplay(t);
  const h = clean.find(l => l.startsWith('@'));
  if (h) return h.replace(/^@+/,'').replace(/[._-]+/g,' ');
  return clean[0] || 'unknown-artist';
}
function extractHaiku(lines, artist) {
  const filtered = lines.map(cleanupLine).filter(Boolean)
    .filter(l => !l.startsWith('#')).filter(l => !l.startsWith('@')).filter(l => l !== '.');
  const al = artist.toLowerCase().replace(/[._-]/g,'');
  if (!filtered.some(l => l.toLowerCase().replace(/\s+/g,'').includes(al))) filtered.unshift(artist);
  return filtered.join('\n');
}
function normalizeCompare(text) {
  return (text||'').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
}
function resolveCanonicalArtist(captionLines, fallback='unknown-artist') {
  const caption = normalizeCompare(captionLines.join(' '));
  function wordMatch(hay, needle) {
    return new RegExp(`(?<![a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?![a-z0-9])`).test(hay);
  }
  let bestName=fallback, bestScore=-1;
  for (const c of COMIC_ORDER) {
    const cn = normalizeCompare(c);
    const tokens = cn.split(' ').filter(t=>t.length>2);
    if (!tokens.length) continue;
    let score=0;
    if (wordMatch(caption,cn)) score+=10;
    score += tokens.filter(t=>wordMatch(caption,t)).length;
    const ft = tokens[tokens.length-1];
    if (ft && wordMatch(caption,ft)) score+=2;
    if (score>bestScore) { bestScore=score; bestName=c; }
  }
  return bestScore<2 ? fallback : bestName;
}
function parsePosts(html) {
  const doc = new DOMParser().parseFromString(html,'text/html');
  return Array.from(doc.querySelectorAll('main .uiBoxWhite.noborder')).map(card => {
    const captionText  = card.querySelector('h2')?.textContent || '';
    const captionLines = captionText.split('\n').map(cleanupLine).filter(Boolean);
    const imageUrls    = Array.from(card.querySelectorAll('a[href*="media/posts/"] img'))
                              .map(img => img.getAttribute('src'));
    const date = card.querySelector('._a6-o')?.textContent?.trim() || '';
    if (imageUrls.length < 4) return null;
    const inferred = inferArtist(captionLines);
    const artist   = resolveCanonicalArtist(captionLines, inferred);
    return { artist, slug: slugify(artist), captionLines,
             haiku: extractHaiku(captionLines,''), panels: imageUrls.slice(0,4), date };
  }).filter(Boolean);
}
function parseReel(html) {
  const doc = new DOMParser().parseFromString(html,'text/html');
  const v   = doc.querySelector('video');
  return { src: v?.getAttribute('src') || '' };
}
function countPostCards(html) { return (html.match(/uiBoxWhite noborder/g)||[]).length; }
async function getData() {
  const [postsHtml, reelsHtml] = await Promise.all([
    loadHtml('./your_instagram_activity/media/posts_1.html'),
    loadHtml('./your_instagram_activity/media/reels.html'),
  ]);
  return { posts: parsePosts(postsHtml), postCount: countPostCards(postsHtml), reel: parseReel(reelsHtml) };
}
function buildArtistEntries(posts, mode='latest') {
  const buckets = new Map();
  for (const post of posts) {
    if (!buckets.has(post.slug)) buckets.set(post.slug,[]);
    buckets.get(post.slug).push(post);
  }
  const entries = Array.from(buckets.values()).map(list =>
    mode==='oldest' ? list[list.length-1] : list[0]);
  const bySlug  = new Map(entries.map(e=>[e.slug,e]));
  const ordered = [];
  for (const name of COMIC_ORDER) {
    const slug = slugify(name);
    const m = bySlug.get(slug);
    if (m) { ordered.push(m); bySlug.delete(slug); }
  }
  const rest = Array.from(bySlug.values())
    .sort((a,b)=>a.artist.localeCompare(b.artist,undefined,{sensitivity:'base'}));
  return [...ordered,...rest];
}

// ─── Reel backdrop ────────────────────────────────────────────────────────
function setupReelBackdrop(video) {
  if (!video) return;
  video.muted=true; video.defaultMuted=true; video.loop=true; video.playsInline=true;
  video.setAttribute('playsinline',''); video.setAttribute('webkit-playsinline',''); video.setAttribute('muted','');
  const play = () => { const p=video.play(); if(p) p.catch(()=>{}); };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.pause(); video.removeAttribute('autoplay');
    document.body.classList.add('reel-backdrop--static'); return;
  }
  play();
  video.addEventListener('loadeddata', play, {once:true});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) play(); }, {passive:true});
  const btn = document.getElementById('reelSoundBtn');
  if (!btn) return;
  btn.hidden = false;
  const syncLabel = () => {
    const on = !video.muted;
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? 'Mute reel' : 'Sound on';
    btn.setAttribute('aria-label', on ? 'Mute the background reel' : 'Turn sound on for the background reel');
  };
  syncLabel();
  btn.addEventListener('click', () => { video.muted=!video.muted; play(); syncLabel(); });
}
function renderReelBackdrop() {
  const el  = document.getElementById('reelBackdrop');
  const btn = document.getElementById('reelSoundBtn');

  if (!el) return;

  const src = 'https://southernadd-cmyk.github.io/whatisart/media/reels/dance.webm';

  el.innerHTML = `
    <video
      class="reel-backdrop__video"
      src="${src}"
      autoplay
      loop
      muted
      playsinline
      preload="auto">
    </video>
    <div class="reel-backdrop__scrim" aria-hidden="true"></div>
  `;

  setupReelBackdrop(el.querySelector('video'));
  document.body.classList.add('has-reel-bg');
}

// ─── Hi-res modal ─────────────────────────────────────────────────────────
function createModal() {
  if (document.getElementById('hiresModal')) return;
  const overlay = document.createElement('div');
  overlay.id = 'hiresModal';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','High-resolution image');
  overlay.innerHTML = `
    <div class="hires-modal__backdrop"></div>
    <div class="hires-modal__shell">
      <button class="hires-modal__close" aria-label="Close" type="button">✕</button>
      <div class="hires-modal__stage">
        <img class="hires-modal__img" src="" alt="" />
        <div class="hires-modal__loader">
          <span class="hires-modal__spinner"></span>
          <span>Loading hi-res…</span>
        </div>
      </div>
      <p class="hires-modal__caption"></p>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => {
    overlay.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    overlay.querySelector('.hires-modal__img').src = '';
  };
  overlay.querySelector('.hires-modal__backdrop').addEventListener('click', close);
  overlay.querySelector('.hires-modal__close').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key==='Escape') close(); });
}
function openHiresModal(originalSrc, altText) {
  const overlay = document.getElementById('hiresModal');
  if (!overlay) return;
  const img    = overlay.querySelector('.hires-modal__img');
  const loader = overlay.querySelector('.hires-modal__loader');
  const cap    = overlay.querySelector('.hires-modal__caption');
  const src    = toOriginalPath(originalSrc);
  img.src = ''; img.alt = altText;
  cap.textContent = altText;
  loader.style.display = 'flex';
  img.style.opacity   = '0';
  overlay.classList.add('is-open');
  document.body.classList.add('modal-open');
  const tmp = new Image();
  tmp.onload  = () => { img.src=src; loader.style.display='none'; img.style.opacity='1'; };
  tmp.onerror = () => { loader.style.display='none'; cap.textContent=`${altText} — hi-res not found`; };
  tmp.src = src;
}

// ─── Strip builder ────────────────────────────────────────────────────────
function buildStripHtml(panels) {
  return panels.map(p =>
    `<figure class="panel">` +
      `<button class="panel__hires-trigger" type="button"` +
              ` aria-label="View hi-res: ${escapeHtml(p.alt)}"` +
              ` data-original="${escapeHtml(p.original)}"` +
              ` data-alt="${escapeHtml(p.alt)}">` +
        `<img loading="lazy" src="${escapeHtml(p.optimised)}"` +
             ` alt="${escapeHtml(p.alt)}"` +
             ` onerror="this.src='${escapeHtml(p.original)}'" />` +
        `<span class="panel__hires-badge" aria-hidden="true">HI-RES</span>` +
      `</button>` +
    `</figure>`
  ).join('');
}
function bindStripHiRes(container) {
  container.querySelectorAll('.panel__hires-trigger').forEach(btn => {
    btn.addEventListener('click', () => openHiresModal(btn.dataset.original, btn.dataset.alt));
  });
}

// ─── Page transition ─────────────────────────────────────────────────────
// Uses the View Transitions API when available (Chrome 111+, Safari 18+).
// Falls back to a simple instant navigate on older browsers.
// Direction is stored so the incoming page knows which way to slide in.
let navigating = false;

function flipToArtist(href, direction) {
  if (navigating) return;
  navigating = true;
  sessionStorage.setItem('flipDirection', direction);

  if (!document.startViewTransition) {
    window.location.href = href;
    return;
  }

  // Set a data-attr on <html> so the CSS can pick the right keyframes
  document.documentElement.dataset.flipDir = direction;

  document.startViewTransition(() => {
    window.location.href = href;
  });
}

// ─── Intro page renderer ──────────────────────────────────────────────────
function setEntryCount(n) {
  const el = document.getElementById('entryCount');
  if (el) el.textContent = `${n} ENTRIES`;
}
function renderIntro({ posts, postCount }) {
  const artistList = document.getElementById('artistList');
  const entries    = buildArtistEntries(posts, 'latest');
  setEntryCount(postCount);
  artistList.innerHTML = entries.map(post =>
    `<li><a href="./artist.html?artist=${encodeURIComponent(post.slug)}">${escapeHtml(post.artist)}</a></li>`
  ).join('');
  artistList.querySelectorAll('li').forEach((li,idx) => li.style.setProperty('--stagger',String(idx)));
}

// ─── Artist page renderer ─────────────────────────────────────────────────
function renderArtist({ posts }) {
  const params  = new URLSearchParams(window.location.search);
  const target  = params.get('artist');
  const mode    = params.get('mode')==='oldest' ? 'oldest' : 'latest';
  const entries = buildArtistEntries(posts, mode);
  const post    = entries.find(p=>p.slug===target) || entries[0];

  if (!post) {
    document.getElementById('artistPage').innerHTML = '<p>No artist posts found.</p>';
    return;
  }

  const idx  = entries.findIndex(p=>p.slug===post.slug);
  const prev = idx > 0                     ? entries[idx-1] : null;
  const next = idx < entries.length - 1   ? entries[idx+1] : null;

  document.title = `${post.artist} | What Is Art Comic`;
  document.getElementById('artistName').textContent = post.artist;
  document.getElementById('postDate').textContent   = post.date;
  document.getElementById('haikuText').textContent  = post.haiku;

  // Build panel data
  const panels = post.panels.map((src, i) => ({
    optimised: toOptimisedPath(src),
    original:  toOriginalPath(src),
    alt:       `${post.artist} — panel ${i + 1}`,
  }));

  // Render front strip
  const front = document.getElementById('panelStrip');
  if (front) { front.innerHTML = buildStripHtml(panels); bindStripHiRes(front); }

  // Hi-res button opens modal for panel 1 (user can click individual panels too)
  const hiresBtn = document.getElementById('hiresBtn');
  if (hiresBtn) {
    hiresBtn.disabled          = false;
    hiresBtn.dataset.original  = panels[0].original;
    hiresBtn.dataset.alt       = panels[0].alt;
    hiresBtn.addEventListener('click', () => {
      openHiresModal(hiresBtn.dataset.original, hiresBtn.dataset.alt);
    });
  }

  // ── Prev / Next nav buttons ───────────────────────────────────────────
  const artistUrl = (entry) =>
    `./artist.html?artist=${encodeURIComponent(entry.slug)}&mode=${encodeURIComponent(mode)}`;

  const prevBtn   = document.getElementById('prevBtn');
  const nextBtn   = document.getElementById('nextBtn');
  const prevLabel = document.getElementById('prevLabel');
  const nextLabel = document.getElementById('nextLabel');

  if (prev) {
    if (prevLabel) prevLabel.textContent = prev.artist;
    prevBtn?.removeAttribute('disabled');
    prevBtn?.addEventListener('click', () => flipToArtistWithStore(artistUrl(prev), 'prev'));
  } else {
    prevBtn?.setAttribute('disabled','');
    if (prevLabel) prevLabel.textContent = '';
  }

  if (next) {
    if (nextLabel) nextLabel.textContent = next.artist;
    nextBtn?.removeAttribute('disabled');
    nextBtn?.addEventListener('click', () => flipToArtistWithStore(artistUrl(next), 'next'));
  } else {
    nextBtn?.setAttribute('disabled','');
    if (nextLabel) nextLabel.textContent = '';
  }

  // ── Keyboard nav ─────────────────────────────────────────────────────
  window.addEventListener('keydown', e => {
    if (e.defaultPrevented) return;
    const tag = e.target?.tagName;
    if (tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return;
    if (e.key==='ArrowLeft'  && prev) { e.preventDefault(); flipToArtistWithStore(artistUrl(prev),'prev'); }
    if (e.key==='ArrowRight' && next) { e.preventDefault(); flipToArtistWithStore(artistUrl(next),'next'); }
  });

  // View Transitions API handles the enter animation automatically.
  // Clear the stored direction so it doesn't persist across unrelated navigations.
  sessionStorage.removeItem('flipDirection');
  document.documentElement.removeAttribute('data-flip-dir');
}

// flipToArtistWithStore kept as alias for backward compat
function flipToArtistWithStore(href, direction) {
  flipToArtist(href, direction);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────
async function main() {
  createModal();
  try {
    const data = await getData();
    const page = document.body.getAttribute('data-page');
    renderReelBackdrop();
    if (page === 'intro')       renderIntro(data);
    else if (page === 'artist') renderArtist(data);
  } catch (err) {
    const el = document.getElementById('appError');
    if (el) el.textContent = `Could not load data: ${err.message}`;
  } finally {
    requestAnimationFrame(() => document.body.classList.add('is-loaded'));
  }
}

main();
