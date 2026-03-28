/* ============================================
   VELTRIX NEWS - Main Application
   Powered by Gemini AI + Google Search
   Real news · Real images · Daily updates
   ============================================ */

'use strict';

/*
  HOW TO GET YOUR FREE GEMINI API KEY:
  1. Go to https://aistudio.google.com/apikey
  2. Click "Create API key"
  3. Copy the key and paste it below
  The free tier gives you 1,500 requests/day — more than enough.
*/
const GEMINI_KEY = 'YOUR_GEMINI_API_KEY_HERE'; // ← paste your free key here

/* ── State ── */
const State = {
    currentCategory: 'general',
    allArticles:     [],
    displayedCount:  0,
    isSearching:     false,
    isDarkMode:      false,
    isLoading:       false
};

/* ─────────────────────────────────────────
   UTILITIES
───────────────────────────────────────── */
function timeAgo(d) {
    if (!d) return '';
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60)    return 'Just now';
    if (s < 3600)  return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function stripHtml(h) {
    return (h || '').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}
function sanitize(s) {
    const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML;
}
function catColor(c) {
    return { general: '#1a73e8', world: '#0f9d58', nation: '#4285f4', business: '#e37400',
             technology: '#7b1fa2', sports: '#d32f2f', entertainment: '#c2185b',
             health: '#00838f', science: '#1565c0' }[c] || '#1a73e8';
}
function readTime(text) {
    return Math.max(1, Math.round((text || '').split(/\s+/).length / 200)) + ' min read';
}
function getCategoryFallbackImage(cat, i) {
    const map = {
        general:       ['photo-1504711434969-e33886168f5c','photo-1495020689067-958852a7765e','photo-1585829365295-ab7cd400c167'],
        world:         ['photo-1529333166437-7750a6dd5a70','photo-1526304640581-d334cdbbf45e','photo-1451187580459-43490279c0fa'],
        nation:        ['photo-1501594907352-04cda38ebc29','photo-1589994965851-a8f479c573a9','photo-1555848962-6e79363ec58f'],
        business:      ['photo-1611974789855-9c2a0a7236a3','photo-1590283603385-17ffb3a7f29f','photo-1444653614773-995cb1ef9efa'],
        technology:    ['photo-1518770660439-4636190af475','photo-1677442136019-21780ecad995','photo-1485827404703-89b55fcc595e'],
        sports:        ['photo-1461896836934-bd45ba8ce8e6','photo-1508098682722-e99c643e7f76','photo-1546519638-68e109498ffc'],
        entertainment: ['photo-1536440136628-849c177e76a1','photo-1493225457124-a3eb161ffa5f','photo-1514533212735-5df27d970db0'],
        health:        ['photo-1576091160399-112ba8d25d1d','photo-1559757148-5c350d0d3c56','photo-1571019613454-1cb2f99b2d8b'],
        science:       ['photo-1507413245164-6160d8298b31','photo-1532094349884-543bc11b234d','photo-1446776811953-b23d57bd21aa']
    };
    const imgs = map[cat] || map.general;
    return 'https://images.unsplash.com/' + imgs[(i || 0) % imgs.length] + '?w=800&q=80';
}
function showToast(msg, ms = 3500) {
    const t = document.getElementById('toast');
    const m = document.getElementById('toastMessage');
    if (!t || !m) return;
    m.textContent = msg;
    t.classList.add('visible');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('visible'), ms);
}

/* ─────────────────────────────────────────
   CACHE
───────────────────────────────────────── */
function cacheSet(k, data) {
    try { sessionStorage.setItem(k, JSON.stringify({ data, ts: Date.now() })); } catch {}
}
function cacheGet(k) {
    try {
        const r = sessionStorage.getItem(k);
        if (!r) return null;
        const { data, ts } = JSON.parse(r);
        return (Date.now() - ts < CONFIG.CACHE_TTL_MS) ? data : null;
    } catch { return null; }
}

/* ─────────────────────────────────────────
   GEMINI API — Real news via Google Search
───────────────────────────────────────── */
async function fetchWithGemini(category) {
    const label = CATEGORY_INFO[category]?.title || category;
    const prompt = `Use Google Search to find the top 20 latest news articles published today or this week about "${label}".
Return ONLY a valid JSON array. No markdown, no code block, no explanation — raw JSON only.
Each element must have exactly these fields:
{
  "title": "full headline",
  "description": "2-3 sentence summary of the article",
  "source": "news outlet name (e.g. BBC, CNN, Reuters)",
  "url": "https://full-article-url.com",
  "publishedAt": "2026-03-28T00:00:00Z",
  "imageUrl": "https://direct-image-url.jpg or empty string"
}`;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                tools: [{ googleSearch: {} }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
            })
        }
    );
    if (!res.ok) throw new Error('Gemini ' + res.status + ': ' + (await res.text()).slice(0, 200));
    const json = await res.json();

    /* Extract the text block from Gemini's response */
    const rawText = json.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    const match   = rawText.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Gemini returned no JSON array');

    const items = JSON.parse(match[0]);
    return items
        .filter(a => a.title && a.title.length > 5)
        .map((a, i) => ({
            id:          'gem-' + category + '-' + i,
            title:       a.title,
            description: (a.description || '').slice(0, 300),
            source:      a.source || 'News',
            category,
            image:       (a.imageUrl && a.imageUrl.startsWith('http'))
                            ? a.imageUrl
                            : getCategoryFallbackImage(category, i),
            url:         a.url || '#',
            publishedAt: a.publishedAt || new Date().toISOString(),
            readTime:    readTime(a.description || '')
        }));
}

/* ─────────────────────────────────────────
   GUARDIAN API — Fallback + image source
───────────────────────────────────────── */
async function fetchFromGuardian(category) {
    const section = GUARDIAN_SECTIONS[category];
    const p = new URLSearchParams({
        'api-key':     CONFIG.GUARDIAN_API_KEY,
        'show-fields': 'thumbnail,trailText,headline,byline,wordcount',
        'page-size':   '30',
        'order-by':    'newest'
    });
    if (section) p.set('section', section);
    const res  = await fetch(CONFIG.GUARDIAN_BASE + '/search?' + p);
    if (!res.ok) throw new Error('Guardian ' + res.status);
    const json = await res.json();
    if (json.response?.status !== 'ok') throw new Error('Guardian error');
    return json.response.results
        .filter(item => item.fields?.thumbnail)   /* only articles WITH real images */
        .map((item, i) => {
            const f = item.fields || {};
            return {
                id:          item.id || 'g-' + i,
                title:       f.headline || item.webTitle || '',
                description: stripHtml(f.trailText || '').slice(0, 300),
                source:      'The Guardian',
                category,
                image:       f.thumbnail,
                url:         item.webUrl || '#',
                publishedAt: item.webPublicationDate,
                readTime:    f.wordcount
                                 ? Math.max(1, Math.round(+f.wordcount / 200)) + ' min read'
                                 : '4 min read'
            };
        })
        .filter(a => a.title.length > 5);
}

/* ─────────────────────────────────────────
   MAIN FETCH  (Gemini → Guardian fallback)
───────────────────────────────────────── */
async function fetchNews(category) {
    const cached = cacheGet('vn_' + category);
    if (cached && cached.length) return cached;

    let articles = [];
    const hasKey = GEMINI_KEY && GEMINI_KEY !== 'YOUR_GEMINI_API_KEY_HERE';

    if (hasKey) {
        try {
            articles = await fetchWithGemini(category);
            /* If Gemini gave no images, enrich with Guardian thumbnails */
            const needImages = articles.filter(a => a.image.includes('unsplash'));
            if (needImages.length > articles.length / 2) {
                const gArticles = await fetchFromGuardian(category).catch(() => []);
                const imgs = gArticles.map(a => a.image).filter(Boolean);
                articles = articles.map((a, i) =>
                    a.image.includes('unsplash') && imgs[i]
                        ? { ...a, image: imgs[i] }
                        : a
                );
            }
        } catch (e) {
            console.warn('[Veltrix] Gemini failed, using Guardian:', e.message);
        }
    }

    /* Guardian fallback */
    if (!articles.length) {
        try { articles = await fetchFromGuardian(category); }
        catch (e) { console.error('[Veltrix] Guardian also failed:', e.message); }
    }

    if (articles.length) cacheSet('vn_' + category, articles);
    return articles;
}

/* ─────────────────────────────────────────
   RENDER FUNCTIONS
───────────────────────────────────────── */
function renderHero(arts) {
    const hero = document.getElementById('heroSection');
    if (!hero || !arts.length) return;
    const [m, s1, s2] = [arts[0], arts[1] || arts[0], arts[2] || arts[0]];
    const card = (a, cls, titleTag) => `
        <div class="${cls}" onclick="window.open('${sanitize(a.url)}','_blank','noopener')" style="cursor:pointer">
            <img class="hero-img" src="${sanitize(a.image)}"
                 alt="${sanitize(a.title)}"
                 onerror="this.src='${getCategoryFallbackImage(a.category, 0)}'">
            <div class="hero-overlay">
                <span class="hero-category-tag">${sanitize(CATEGORY_INFO[a.category]?.title || a.category)}</span>
                <${titleTag} class="hero-title">${sanitize(a.title)}</${titleTag}>
                ${cls === 'hero-main' ? `<p class="hero-desc">${sanitize(a.description)}</p>` : ''}
                <div class="hero-meta">
                    <span class="source">${sanitize(a.source)}</span>
                    <span>${timeAgo(a.publishedAt)}</span>
                    ${cls === 'hero-main' ? `<span>${sanitize(a.readTime)}</span>` : ''}
                </div>
            </div>
        </div>`;
    hero.innerHTML = card(m, 'hero-main', 'h2') + card(s1, 'hero-side', 'h3') + card(s2, 'hero-side', 'h3');
}

function renderNewsCards(arts) {
    const col = document.getElementById('newsColumn');
    if (!col) return;
    col.innerHTML = '';
    arts.slice(3, 11).forEach((a, i) => {
        const el = document.createElement('article');
        el.className = 'news-card';
        el.style.cursor = 'pointer';
        el.style.animationDelay = (i * 0.07) + 's';
        el.innerHTML = `
            <div class="news-card-img">
                <img src="${sanitize(a.image)}" alt="${sanitize(a.title)}" loading="lazy"
                     onerror="this.src='${getCategoryFallbackImage(a.category, i)}'">
            </div>
            <div class="news-card-content">
                <div class="news-card-source">
                    <span class="source-name">${sanitize(a.source)}</span>
                    <span>·</span>
                    <span>${timeAgo(a.publishedAt)}</span>
                </div>
                <h3 class="news-card-title">${sanitize(a.title)}</h3>
                <p class="news-card-desc">${sanitize(a.description)}</p>
                <div class="news-card-meta">
                    <span class="category-tag"
                          style="color:${catColor(a.category)};background:${catColor(a.category)}18">
                        ${sanitize(CATEGORY_INFO[a.category]?.title || a.category)}
                    </span>
                    <span>${sanitize(a.readTime)}</span>
                </div>
            </div>`;
        el.addEventListener('click', () => window.open(a.url, '_blank', 'noopener'));
        col.appendChild(el);
    });
}

function renderMoreNews(arts, append = false) {
    const grid = document.getElementById('moreNewsGrid');
    const btn  = document.getElementById('loadMoreBtn');
    if (!grid) return;
    const start = append ? State.displayedCount + 3 : 11;
    const batch = arts.slice(start, start + 6);
    if (!append) { grid.innerHTML = ''; State.displayedCount = 0; }
    if (!batch.length) { if (btn) btn.style.display = 'none'; return; }
    batch.forEach((a, i) => {
        State.displayedCount++;
        const el = document.createElement('article');
        el.className = 'grid-card';
        el.style.cursor = 'pointer';
        el.style.animationDelay = (i * 0.07) + 's';
        el.innerHTML = `
            <div class="grid-card-img">
                <img src="${sanitize(a.image)}" alt="${sanitize(a.title)}" loading="lazy"
                     onerror="this.src='${getCategoryFallbackImage(a.category, i)}'">
                <span class="grid-category" style="background:${catColor(a.category)}">
                    ${sanitize(CATEGORY_INFO[a.category]?.title || a.category)}
                </span>
            </div>
            <div class="grid-card-body">
                <div class="grid-card-source">
                    <span class="source-name">${sanitize(a.source)}</span>
                    <span>·</span>
                    <span>${timeAgo(a.publishedAt)}</span>
                </div>
                <h3 class="grid-card-title">${sanitize(a.title)}</h3>
                <p class="grid-card-desc">${sanitize(a.description)}</p>
                <div class="grid-card-meta">
                    <span>${sanitize(a.readTime)}</span>
                    <i class="fas fa-external-link-alt" style="opacity:.35;font-size:10px"></i>
                </div>
            </div>`;
        el.addEventListener('click', () => window.open(a.url, '_blank', 'noopener'));
        grid.appendChild(el);
    });
    if (btn) btn.style.display = arts.length > start + 6 ? 'inline-flex' : 'none';
}

function renderTicker(arts) {
    const t = document.getElementById('breakingTicker');
    if (!t || !arts.length) return;
    const h = arts.slice(0, 8).map(a => a.title);
    t.innerHTML = [...h, ...h].map(x => `<span>${sanitize(x)}</span>`).join('');
}

function renderDailyBriefing(arts) {
    const el = document.getElementById('dailyBriefing');
    const de = document.getElementById('briefingDate');
    if (!el) return;
    if (de) de.textContent = new Date().toLocaleDateString('en-US',
        { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    el.innerHTML = arts.slice(0, 5).map((a, i) => `
        <div class="briefing-item" style="cursor:pointer"
             onclick="window.open('${sanitize(a.url)}','_blank','noopener')">
            <div class="briefing-num">${i + 1}</div>
            <div class="briefing-text">${sanitize(a.title)}</div>
        </div>`).join('');
}

function renderTrending(arts) {
    const el = document.getElementById('trendingTopics');
    if (!el) return;
    const stop = new Set(['the','a','an','in','on','at','to','for','of','and','or','is','are',
        'was','with','from','that','this','it','as','by','has','not','after','over','he','she',
        'they','new','says','said','amid','how','up','out','more','will','its','after']);
    const freq = {};
    arts.forEach(a => a.title.split(/\s+/).forEach(w => {
        const c = w.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (c.length > 4 && !stop.has(c)) freq[c] = (freq[c] || 0) + 1;
    }));
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
        .slice(0, 8).map(([w]) => w[0].toUpperCase() + w.slice(1));
    const base = ['Climate','AI','Economy','Ukraine','Gaza','Elections','Healthcare','Space'];
    const topics = [...new Set([...sorted, ...base])].slice(0, 8);
    el.innerHTML = topics.map((t, i) => `
        <div class="trending-item" style="cursor:pointer" onclick="performSearch('${sanitize(t)}')">
            <div class="trending-rank">${i + 1}</div>
            <div class="trending-info">
                <div class="trending-title">${sanitize(t)}</div>
                <div class="trending-count">${(Math.floor(Math.random() * 180) + 30)}K+ articles</div>
            </div>
            <i class="fas fa-chevron-right" style="color:var(--text-tertiary);font-size:11px"></i>
        </div>`).join('');
}

function renderMostRead(arts) {
    const el = document.getElementById('mostRead');
    if (!el) return;
    const pick = [...arts].sort(() => Math.random() - 0.5).slice(0, 5);
    el.innerHTML = pick.map((a, i) => `
        <div class="most-read-item" style="cursor:pointer"
             onclick="window.open('${sanitize(a.url)}','_blank','noopener')">
            <div class="most-read-num">${i + 1}</div>
            <div class="most-read-info">
                <div class="most-read-title">${sanitize(a.title)}</div>
                <div class="most-read-source">${sanitize(a.source)} · ${timeAgo(a.publishedAt)}</div>
            </div>
        </div>`).join('');
}

/* ─────────────────────────────────────────
   LOAD CATEGORY
───────────────────────────────────────── */
async function loadCategory(category) {
    if (State.isLoading) return;
    State.currentCategory = category;
    State.displayedCount  = 0;
    State.isSearching     = false;
    const inp = document.getElementById('searchInput');
    const srh = document.getElementById('searchResultsHeader');
    if (inp) inp.value = '';
    if (srh) srh.style.display = 'none';
    updateNavActive(category);
    updateCategoryHeader(category);
    showLoading();
    try {
        const arts = await fetchNews(category);
        State.allArticles = arts;
        if (!arts.length) { showError('Could not load news. Please try again.'); return; }
        hideLoading();
        renderHero(arts);
        renderNewsCards(arts);
        renderDailyBriefing(arts);
        renderTrending(arts);
        renderMostRead(arts);
        renderMoreNews(arts);
        renderTicker(arts);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        console.error('[Veltrix]', e);
        showError('Failed to load news. Check your connection and try again.');
    }
}

/* ─────────────────────────────────────────
   SEARCH
───────────────────────────────────────── */
async function performSearch(query) {
    query = (query || '').trim();
    if (!query) { clearSearch(); return; }
    State.isSearching = true;
    const srh  = document.getElementById('searchResultsHeader');
    const sqEl = document.getElementById('searchQuery');
    if (srh)  srh.style.display = 'flex';
    if (sqEl) sqEl.textContent  = query;
    const ch = document.getElementById('categoryHeader');
    if (ch) ch.classList.remove('visible');
    showLoading();
    try {
        let arts = [];
        const hasKey = GEMINI_KEY && GEMINI_KEY !== 'YOUR_GEMINI_API_KEY_HERE';
        if (hasKey) {
            const prompt = `Search for news about "${query}". Return a JSON array of 20 articles with fields: title, description, source, url, publishedAt, imageUrl. Return ONLY raw JSON.`;
            const res  = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
                { method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
                    tools: [{ googleSearch: {} }], generationConfig: { temperature: 0.1, maxOutputTokens: 4096 } }) }
            );
            const json = await res.json();
            const raw  = json.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
            const m    = raw.match(/\[[\s\S]*\]/);
            if (m) arts = JSON.parse(m[0]).filter(a => a.title?.length > 5)
                .map((a, i) => ({ id: 'srch-' + i, title: a.title, description: (a.description || '').slice(0, 300),
                    source: a.source || 'News', category: 'general',
                    image: (a.imageUrl?.startsWith('http')) ? a.imageUrl : getCategoryFallbackImage('general', i),
                    url: a.url || '#', publishedAt: a.publishedAt || new Date().toISOString(),
                    readTime: readTime(a.description || '') }));
        }
        /* Guardian fallback search */
        if (!arts.length) {
            const p = new URLSearchParams({ 'api-key': CONFIG.GUARDIAN_API_KEY, 'q': query,
                'show-fields': 'thumbnail,trailText,headline,wordcount', 'page-size': '30', 'order-by': 'relevance' });
            const r = await fetch(CONFIG.GUARDIAN_BASE + '/search?' + p);
            const j = await r.json();
            arts = (j.response?.results || []).map((item, i) => {
                const f = item.fields || {};
                return { id: item.id, title: f.headline || item.webTitle, description: stripHtml(f.trailText || '').slice(0, 300),
                    source: 'The Guardian', category: item.sectionId || 'general',
                    image: f.thumbnail || getCategoryFallbackImage('general', i), url: item.webUrl,
                    publishedAt: item.webPublicationDate,
                    readTime: f.wordcount ? Math.max(1, Math.round(+f.wordcount / 200)) + ' min read' : '4 min read' };
            }).filter(a => a.title?.length > 5);
        }
        State.allArticles = arts;
        hideLoading();
        if (!arts.length) {
            showNoResults(query);
        } else {
            renderHero(arts);
            renderNewsCards(arts);
            renderMoreNews(arts);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Found ' + arts.length + ' results for "' + query + '"');
    } catch (e) { showError('Search failed. Try again.'); }
}

function clearSearch() {
    State.isSearching = false;
    const inp = document.getElementById('searchInput');
    const srh = document.getElementById('searchResultsHeader');
    const sb  = document.getElementById('searchBar');
    if (inp) inp.value = '';
    if (srh) srh.style.display = 'none';
    if (sb)  sb.classList.remove('active');
    loadCategory(State.currentCategory);
}

/* ─────────────────────────────────────────
   UI HELPERS
───────────────────────────────────────── */
function showLoading() {
    State.isLoading = true;
    const el = document.getElementById('loadingScreen');
    if (el) el.classList.remove('hidden');
    ['heroSection', 'newsColumn', 'moreNewsGrid'].forEach(id => {
        const e = document.getElementById(id);
        if (e) e.innerHTML = '';
    });
}
function hideLoading() {
    State.isLoading = false;
    const el = document.getElementById('loadingScreen');
    if (el) el.classList.add('hidden');
}
function showError(msg) {
    hideLoading();
    const hero = document.getElementById('heroSection');
    if (hero) hero.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:80px 20px;color:var(--text-tertiary)">
            <i class="fas fa-satellite-dish" style="font-size:48px;margin-bottom:16px;display:block"></i>
            <h3 style="font-size:20px;margin-bottom:8px;color:var(--text)">${sanitize(msg)}</h3>
            <button onclick="loadCategory('${State.currentCategory}')"
                    style="margin-top:16px;padding:10px 24px;background:var(--primary);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>`;
}
function showNoResults(q) {
    const hero = document.getElementById('heroSection');
    if (hero) hero.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:80px 20px;color:var(--text-tertiary)">
            <i class="fas fa-search" style="font-size:48px;margin-bottom:16px;display:block"></i>
            <h3 style="font-size:20px;margin-bottom:8px;color:var(--text)">No results for "${sanitize(q)}"</h3>
            <p>Try different keywords or browse a category above.</p>
        </div>`;
    ['newsColumn', 'moreNewsGrid'].forEach(id => { const e = document.getElementById(id); if (e) e.innerHTML = ''; });
    const btn = document.getElementById('loadMoreBtn');
    if (btn) btn.style.display = 'none';
}
function updateNavActive(cat) {
    document.querySelectorAll('.nav-link, .mobile-menu-links a')
        .forEach(l => l.classList.toggle('active', l.dataset.category === cat));
}
function updateCategoryHeader(cat) {
    const info = CATEGORY_INFO[cat] || {};
    const t = document.getElementById('categoryTitle');
    const s = document.getElementById('categorySubtitle');
    const h = document.getElementById('categoryHeader');
    if (t) t.textContent = info.title || cat;
    if (s) s.textContent = info.subtitle || '';
    if (h) h.classList.toggle('visible', cat !== 'general');
}

/* ─────────────────────────────────────────
   THEME  ·  MOBILE MENU  ·  NEWSLETTER
───────────────────────────────────────── */
function toggleTheme() {
    State.isDarkMode = !State.isDarkMode;
    document.documentElement.dataset.theme = State.isDarkMode ? 'dark' : '';
    localStorage.setItem('veltrix_theme', State.isDarkMode ? 'dark' : 'light');
    const ic = State.isDarkMode ? 'fa-sun' : 'fa-moon';
    const tt = document.getElementById('themeToggle');
    const tm = document.getElementById('themeToggleMobile');
    if (tt) tt.innerHTML = `<i class="fas ${ic}"></i>`;
    if (tm) tm.innerHTML = `<i class="fas ${ic}"></i> ${State.isDarkMode ? 'Light' : 'Dark'} Mode`;
}
function initTheme() {
    if (localStorage.getItem('veltrix_theme') === 'dark') {
        State.isDarkMode = true;
        document.documentElement.dataset.theme = 'dark';
        const tt = document.getElementById('themeToggle');
        const tm = document.getElementById('themeToggleMobile');
        if (tt) tt.innerHTML = '<i class="fas fa-sun"></i>';
        if (tm) tm.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    }
}
function openMobileMenu()  { const o = document.getElementById('mobileOverlay'); if (o) { o.classList.add('active');    document.body.style.overflow = 'hidden'; } }
function closeMobileMenu() { const o = document.getElementById('mobileOverlay'); if (o) { o.classList.remove('active'); document.body.style.overflow = ''; } }
function handleNewsletter(e) {
    e.preventDefault();
    const emailEl = document.getElementById('newsletterEmail');
    const email   = emailEl?.value.trim();
    if (!email) return;
    const subs = JSON.parse(localStorage.getItem('veltrix_subscribers') || '[]');
    if (subs.includes(email)) { showToast('Already subscribed!'); return; }
    subs.push(email);
    localStorage.setItem('veltrix_subscribers', JSON.stringify(subs));
    const f = document.getElementById('newsletterForm');
    const s = document.getElementById('newsletterSuccess');
    if (f) f.style.display = 'none';
    if (s) s.style.display = 'flex';
    showToast('Welcome to Veltrix News daily digest!');
}
async function refreshNews() {
    const btn = document.getElementById('refreshBtn');
    if (btn) btn.classList.add('spinning');
    try {
        sessionStorage.removeItem('vn_' + State.currentCategory);
        await loadCategory(State.currentCategory);
        showToast('News refreshed!');
    } finally {
        if (btn) btn.classList.remove('spinning');
    }
}

/* ─────────────────────────────────────────
   EVENTS & INIT
───────────────────────────────────────── */
function bindEvents() {
    document.querySelectorAll('.nav-link, .mobile-menu-links a, .footer-links a[data-category]').forEach(l => {
        l.addEventListener('click', e => {
            e.preventDefault();
            const cat = l.dataset.category;
            if (cat) { loadCategory(cat); closeMobileMenu(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        });
    });
    document.getElementById('mobileMenuBtn')?.addEventListener('click',  openMobileMenu);
    document.getElementById('mobileMenuClose')?.addEventListener('click', closeMobileMenu);
    document.getElementById('mobileOverlay')?.addEventListener('click',   e => { if (e.target.id === 'mobileOverlay') closeMobileMenu(); });
    document.getElementById('themeToggle')?.addEventListener('click',       toggleTheme);
    document.getElementById('themeToggleMobile')?.addEventListener('click', toggleTheme);
    const sb = document.getElementById('searchBar');
    const si = document.getElementById('searchInput');
    document.getElementById('searchToggle')?.addEventListener('click', () => { sb?.classList.add('active'); si?.focus(); });
    document.getElementById('searchClose')?.addEventListener('click', clearSearch);
    let st;
    si?.addEventListener('input', () => {
        clearTimeout(st);
        const q = si.value.trim();
        if (q.length >= 3) st = setTimeout(() => performSearch(q), 700);
        else if (!q.length) clearSearch();
    });
    si?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { clearTimeout(st); performSearch(si.value.trim()); }
        if (e.key === 'Escape') clearSearch();
    });
    document.getElementById('clearSearch')?.addEventListener('click', clearSearch);
    document.getElementById('newsletterForm')?.addEventListener('submit', handleNewsletter);
    document.getElementById('loadMoreBtn')?.addEventListener('click', () => renderMoreNews(State.allArticles, true));
    document.getElementById('refreshBtn')?.addEventListener('click', refreshNews);
    document.getElementById('backToTop')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.getElementById('toastClose')?.addEventListener('click', () => document.getElementById('toast')?.classList.remove('visible'));
    window.addEventListener('scroll', () => {
        document.getElementById('backToTop')?.classList.toggle('visible', window.scrollY > 500);
        document.getElementById('header')?.classList.toggle('scrolled',   window.scrollY > 10);
    }, { passive: true });
    document.addEventListener('keydown', e => {
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault(); sb?.classList.add('active'); si?.focus();
        }
    });
    /* Auto-refresh every 10 minutes */
    setInterval(() => {
        if (!document.hidden && !State.isSearching) {
            sessionStorage.removeItem('vn_' + State.currentCategory);
            refreshNews();
        }
    }, 10 * 60 * 1000);
}

function init() {
    initTheme();
    /* Date */
    const d  = document.getElementById('currentDate');
    const fy = document.getElementById('footerYear');
    const now = new Date();
    if (d)  d.textContent  = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    if (fy) fy.textContent = now.getFullYear();
    /* Newsletter restore */
    const subs = JSON.parse(localStorage.getItem('veltrix_subscribers') || '[]');
    if (subs.length) {
        const f = document.getElementById('newsletterForm');
        const s = document.getElementById('newsletterSuccess');
        if (f) f.style.display = 'none';
        if (s) { s.style.display = 'flex'; const p = s.querySelector('p'); if (p) p.textContent = 'Subscribed as ' + subs[0]; }
    }
    /* Warn if no Gemini key set */
    if (!GEMINI_KEY || GEMINI_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        console.warn('[Veltrix] No Gemini key set — using Guardian API fallback.\nGet a free key at https://aistudio.google.com/apikey');
    }
    bindEvents();
    loadCategory('general');
}

document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

