async function loadHtml(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.text();
}

const COMIC_ORDER = [
  "Stephanie Dinkins",
  "Eric Cantona",
  "Albrecht Dürer",
  "Tyler the Creator",
  "Slavoj Žižek",
  "Yoko Ono",
  "Michelangelo",
  "Niyi Olagunju",
  "Vivienne Westwood",
  "Stanley Kubrick",
  "Claes Oldenburg",
  "Judy Chicago",
  "Muhammad Ali",
  "Sofia Isella",
  "Gerhard Richter",
  "Gwen John",
  "Enheduanna",
  "Sherrie Levine",
  "Plato",
  "Randy Mario Poffo",
  "Grayson Perry",
  "George Bernard Shaw",
  "Friedrich Nietzsche",
  "Bob Ross",
  "David Choe",
  "Frida Kahlo",
  "Alberto Giacometti",
  "Kurt Vonnegut Jr.",
  "Rick Rubin",
  "Jim Dine",
  "James Baldwin",
  "Henry Ward Beecher",
  "Ansel Adams",
  "Kara Walker",
  "David Bowie",
  "Wassily Kandinsky",
  "Kurt Cobain",
  "Henri Matisse",
  "René Magritte",
  "David Hockney",
  "David Salle",
  "Akira Toriyama",
  "King Robbo",
  "Keith Haring",
  "Henry Ossawa Tanner",
  "Hito Steyerl",
  "J. M. W. Turner",
  "Francis Bacon",
  "Joseph Beuys",
  "Leonardo da Vinci",
  "William Blake",
  "Molière",
  "Ai Weiwei",
  "Amoako Boafo",
  "David Szauder",
  "Jeff Koons",
  "Bob Dylan",
  "Odilon Redon",
  "Rafael Lozano-Hemmer",
  "Tino Sehgal",
  "Leo Tolstoy",
  "Fiona Rae",
  "Linder",
  "Joseph Kosuth",
  "Artemisia Gentileschi",
  "Christine de Pizan",
  "M. C. Escher",
  "Damien Hirst",
  "Lawrence Weiner",
  "Alan Moore",
  "James Abbott Whistler",
  "Martin Kippenberger",
  "Blek le Rat",
  "Hunter S. Thompson",
  "Cindy Sherman",
  "Erykah Badu",
  "MF DOOM",
  "Edgar Degas",
  "Georgia O’Keeffe",
  "Veronica Ryan",
  "Sol LeWitt",
  "Salvador Dalí",
  "Donald Judd",
  "Paul Cézanne",
  "Tracey Emin",
  "Vincent van Gogh",
  "Pablo Picasso",
  "Jean-Michel Basquiat",
  "Banksy",
  "Jackson Pollock",
  "Barbara Kruger",
  "Andy Warhol",
  "Marcel Duchamp",
];

let artistKeyNavHandler = null;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initConceptTicker() {
  // Intentionally left blank: no generated conceptual copy.
}

function setEntryCount(n) {
  const el = document.getElementById("entryCount");
  if (el) {
    el.textContent = `${n} ENTRIES`;
  }
}

function buildStepNavHtml(entries, currentSlug, mode) {
  const i = entries.findIndex((p) => p.slug === currentSlug);
  const prev = i > 0 ? entries[i - 1] : null;
  const next = i >= 0 && i < entries.length - 1 ? entries[i + 1] : null;
  const href = (slug) =>
    `./artist.html?artist=${encodeURIComponent(slug)}&mode=${encodeURIComponent(mode)}`;

  const prevBlock = prev
    ? `<a class="step-link step-link--prev" rel="prev" href="${href(prev.slug)}"><span class="step-link__arrow">←</span><span class="step-link__name">${escapeHtml(
        prev.artist
      )}</span></a>`
    : `<span class="step-link step-link--dead step-link--prev" aria-disabled="true"><span class="step-link__arrow">←</span><span class="step-link__name">∅</span></span>`;

  const nextBlock = next
    ? `<a class="step-link step-link--next" rel="next" href="${href(next.slug)}"><span class="step-link__arrow">→</span><span class="step-link__name">${escapeHtml(
        next.artist
      )}</span></a>`
    : `<span class="step-link step-link--dead step-link--next" aria-disabled="true"><span class="step-link__arrow">→</span><span class="step-link__name">∅</span></span>`;

  return prevBlock + nextBlock;
}

function setupReelBackdrop(video) {
  if (!video) {
    return;
  }
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("muted", "");

  const playAttempt = () => {
    const p = video.play();
    if (p !== undefined) {
      p.catch(() => {});
    }
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    video.pause();
    video.removeAttribute("autoplay");
    document.body.classList.add("reel-backdrop--static");
    return;
  }

  playAttempt();
  video.addEventListener("loadeddata", playAttempt, { once: true });

  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) {
        playAttempt();
      }
    },
    { passive: true }
  );

  const btn = document.getElementById("reelSoundBtn");
  if (!btn) {
    return;
  }

  btn.hidden = false;
  const syncLabel = () => {
    const on = !video.muted;
    btn.setAttribute("aria-pressed", String(on));
    btn.textContent = on ? "Mute reel" : "Sound on";
    btn.setAttribute("aria-label", on ? "Mute the background reel" : "Turn sound on for the background reel");
  };
  syncLabel();

  btn.addEventListener("click", () => {
    video.muted = !video.muted;
    playAttempt();
    syncLabel();
  });
}

function renderReelBackdrop(reel) {
  const reelBackdrop = document.getElementById("reelBackdrop");
  const soundBtn = document.getElementById("reelSoundBtn");
  if (!reelBackdrop) {
    return;
  }

  if (reel?.src) {
    const reelSrc = resolveAssetPath(reel.src);
    reelBackdrop.innerHTML = `<video class="reel-backdrop__video" src="${reelSrc}" autoplay loop muted playsinline preload="auto"></video><div class="reel-backdrop__scrim" aria-hidden="true"></div>`;
    const video = reelBackdrop.querySelector("video");
    setupReelBackdrop(video);
    document.body.classList.add("has-reel-bg");
  } else {
    reelBackdrop.innerHTML = "";
    document.body.classList.remove("has-reel-bg");
    if (soundBtn) {
      soundBtn.hidden = true;
    }
  }
}

function bindArtistKeyboard(prev, next, mode) {
  if (artistKeyNavHandler) {
    window.removeEventListener("keydown", artistKeyNavHandler);
    artistKeyNavHandler = null;
  }

  if (!prev && !next) {
    return;
  }

  const href = (slug) =>
    `./artist.html?artist=${encodeURIComponent(slug)}&mode=${encodeURIComponent(mode)}`;

  artistKeyNavHandler = (e) => {
    if (e.defaultPrevented) {
      return;
    }
    const tag = e.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      return;
    }
    if (e.key === "ArrowLeft" && prev) {
      e.preventDefault();
      window.location.href = href(prev.slug);
    }
    if (e.key === "ArrowRight" && next) {
      e.preventDefault();
      window.location.href = href(next.slug);
    }
  };
  window.addEventListener("keydown", artistKeyNavHandler);
}

function resolveAssetPath(assetPath) {
  const clean = (assetPath || "").replace(/^\.?\//, "");
  return `./${clean}`;
}

function normalizeCompare(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(text) {
  return normalizeCompare(text).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function cleanupLine(line) {
  return line.replace(/\u00a0/g, " ").trim();
}

function hashtagToDisplay(text) {
  return text
    .replace(/^#+/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
}

function isMetaLine(line) {
  const l = line.toLowerCase();
  return (
    !line ||
    line === "." ||
    l === "#whatisart" ||
    line.startsWith("@") ||
    line.startsWith("#")
  );
}

function inferArtist(lines) {
  const clean = lines.map(cleanupLine).filter(Boolean);
  const captionName = clean.find((l) => !isMetaLine(l));
  if (captionName) {
    return captionName;
  }

  const fromTag = clean.find((l) => l.startsWith("#") && l.toLowerCase() !== "#whatisart");
  if (fromTag) {
    return hashtagToDisplay(fromTag);
  }

  const fromHandle = clean.find((l) => l.startsWith("@"));
  if (fromHandle) {
    return fromHandle.replace(/^@+/, "").replace(/[._-]+/g, " ");
  }

  return clean[0] || "unknown-artist";
}

function extractHaiku(lines, artist) {
  const filtered = lines
    .map(cleanupLine)
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .filter((line) => !line.startsWith("@"))
    .filter((line) => line !== ".");

  const artistLower = artist.toLowerCase().replace(/[._-]/g, "");
  const hasArtistMention = filtered.some((line) =>
    line.toLowerCase().replace(/\s+/g, "").includes(artistLower)
  );

  if (!hasArtistMention) {
    filtered.unshift(artist);
  }

  return filtered.join("\n");
}

function resolveCanonicalArtist(captionLines, fallbackName = "unknown-artist") {
  const caption = normalizeCompare(captionLines.join(" "));
  let bestName = fallbackName;
  let bestScore = -1;

  for (const candidate of COMIC_ORDER) {
    const candidateNorm = normalizeCompare(candidate);
    const tokens = candidateNorm.split(" ").filter((t) => t.length > 2);
    if (!tokens.length) {
      continue;
    }

    let score = 0;
    if (caption.includes(candidateNorm)) {
      score += 10;
    }

    const tokenMatches = tokens.filter((t) => caption.includes(t)).length;
    score += tokenMatches;

    // Weight surname-like final token for better disambiguation.
    const finalToken = tokens[tokens.length - 1];
    if (finalToken && caption.includes(finalToken)) {
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestName = candidate;
    }
  }

  // Avoid false positives from single-token overlaps (e.g. one shared first name).
  // Require at least a modest confidence before forcing canonical remapping.
  return bestScore < 2 ? fallbackName : bestName;
}

function parsePosts(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const cards = Array.from(doc.querySelectorAll("main .uiBoxWhite.noborder"));

  return cards
    .map((card) => {
      const captionText = card.querySelector("h2")?.textContent || "";
      const captionLines = captionText.split("\n").map(cleanupLine).filter(Boolean);
      const imageUrls = Array.from(card.querySelectorAll('a[href*="media/posts/"] img')).map(
        (img) => img.getAttribute("src")
      );
      const date = card.querySelector("._a6-o")?.textContent?.trim() || "";

      if (imageUrls.length < 4) {
        return null;
      }

      const inferred = inferArtist(captionLines);
      const artist = resolveCanonicalArtist(captionLines, inferred);
      return {
        artist,
        slug: slugify(artist),
        captionLines,
        haiku: extractHaiku(captionLines, ""),
        panels: imageUrls.slice(0, 4),
        date,
      };
    })
    .filter(Boolean);
}

function parseReel(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const video = doc.querySelector("video");
  return {
    src: video?.getAttribute("src") || "",
  };
}

function countPostCards(html) {
  return (html.match(/uiBoxWhite noborder/g) || []).length;
}

async function getData() {
  const [postsHtml, reelsHtml] = await Promise.all([
    loadHtml("./your_instagram_activity/media/posts_1.html"),
    loadHtml("./your_instagram_activity/media/reels.html"),
  ]);
  return {
    posts: parsePosts(postsHtml),
    postCount: countPostCards(postsHtml),
    reel: parseReel(reelsHtml),
  };
}

function dedupeBySlug(posts) {
  const seen = new Set();
  return posts.filter((post) => {
    if (seen.has(post.slug)) {
      return false;
    }
    seen.add(post.slug);
    return true;
  });
}

function buildArtistEntries(posts, timelineMode = "latest") {
  const buckets = new Map();
  for (const post of posts) {
    if (!buckets.has(post.slug)) {
      buckets.set(post.slug, []);
    }
    buckets.get(post.slug).push(post);
  }

  const entries = Array.from(buckets.values()).map((list) => {
    const chosen = timelineMode === "oldest" ? list[list.length - 1] : list[0];
    return chosen;
  });

  const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  const ordered = [];

  for (const artistName of COMIC_ORDER) {
    const slug = slugify(artistName);
    const matched = bySlug.get(slug);
    if (matched) {
      ordered.push(matched);
      bySlug.delete(slug);
    }
  }

  // Keep any unmatched entries at the end so data is not lost.
  const unmatched = Array.from(bySlug.values()).sort((a, b) =>
    a.artist.localeCompare(b.artist, undefined, { sensitivity: "base" })
  );

  return [...ordered, ...unmatched];
}

function renderIntro({ posts, postCount }) {
  const artistList = document.getElementById("artistList");

  const mode = "latest";
  const entries = buildArtistEntries(posts, mode);
  setEntryCount(postCount);
  artistList.innerHTML = entries
    .map(
      (post) =>
        `<li><a href="./artist.html?artist=${encodeURIComponent(post.slug)}">${escapeHtml(
          post.artist
        )}</a></li>`
    )
    .join("");
  artistList.querySelectorAll("li").forEach((li, idx) => {
    li.style.setProperty("--stagger", String(idx));
  });
}

function renderArtist({ posts }) {
  const params = new URLSearchParams(window.location.search);
  const target = params.get("artist");
  const mode = params.get("mode") === "oldest" ? "oldest" : "latest";
  const entries = buildArtistEntries(posts, mode);
  const post = entries.find((p) => p.slug === target) || entries[0];

  if (!post) {
    document.getElementById("artistPage").innerHTML = "<p>No artist posts found.</p>";
    return;
  }

  const displayName = post.artist;
  const idx = entries.findIndex((p) => p.slug === post.slug);
  const prev = idx > 0 ? entries[idx - 1] : null;
  const next = idx >= 0 && idx < entries.length - 1 ? entries[idx + 1] : null;

  document.title = `${displayName} | What Is Art Comic`;
  document.getElementById("artistName").textContent = displayName;
  document.getElementById("postDate").textContent = post.date;

  const stepNav = document.getElementById("artistStepNav");
  if (stepNav) {
    stepNav.innerHTML = buildStepNavHtml(entries, post.slug, mode);
  }
  bindArtistKeyboard(prev, next, mode);

  document.getElementById("panelStrip").innerHTML = post.panels
    .map(
      (src, i) => {
        const assetSrc = resolveAssetPath(src);
        return `<figure class="panel"><img loading="lazy" src="${assetSrc}" alt="${displayName} panel ${i + 1}" onerror="this.replaceWith(Object.assign(document.createElement('div'), {className:'missing-media', textContent:'Missing panel file'}))" /></figure>`;
      }
    )
    .join("");

  document.getElementById("haikuText").textContent = post.haiku;
}

async function main() {
  initConceptTicker();
  try {
    const data = await getData();
    const page = document.body.getAttribute("data-page");
    renderReelBackdrop(data.reel);

    if (page === "intro") {
      renderIntro(data);
    } else if (page === "artist") {
      renderArtist(data);
    }
  } catch (error) {
    const target = document.getElementById("appError");
    if (target) {
      target.textContent = `Could not load Instagram export data: ${error.message}`;
    }
  } finally {
    requestAnimationFrame(() => {
      document.body.classList.add("is-loaded");
    });
  }
}

main();
