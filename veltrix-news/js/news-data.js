/* ============================================
   VELTRIX NEWS - Real News API Configuration
   Powered by The Guardian API + BBC RSS fallback
   ============================================ */

const CONFIG = {
    GUARDIAN_API_KEY: 'test',
    GUARDIAN_BASE:    'https://content.guardianapis.com',
    RSS2JSON_BASE:    'https://api.rss2json.com/v1/api.json',
    CACHE_TTL_MS:     15 * 60 * 1000
};

/* ── Guardian section per Veltrix category ── */
const GUARDIAN_SECTIONS = {
    general:       '',
    world:         'world',
    nation:        'us-news',
    business:      'business',
    technology:    'technology',
    sports:        'sport',
    entertainment: 'culture',
    health:        'lifeandstyle',
    science:       'science'
};

/* ── BBC RSS feeds (fallback when Guardian returns no images) ── */
const RSS_FEEDS = {
    general:       'https://feeds.bbci.co.uk/news/rss.xml',
    world:         'https://feeds.bbci.co.uk/news/world/rss.xml',
    nation:        'https://feeds.npr.org/1001/rss.xml',
    business:      'https://feeds.bbci.co.uk/news/business/rss.xml',
    technology:    'https://feeds.bbci.co.uk/news/technology/rss.xml',
    sports:        'https://feeds.bbci.co.uk/sport/rss.xml',
    entertainment: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    health:        'https://feeds.bbci.co.uk/news/health/rss.xml',
    science:       'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'
};

/* ── Curated Unsplash fallback images (when article has no photo) ── */
const CATEGORY_FALLBACK_IMAGES = {
    general:       ['photo-1504711434969-e33886168f5c','photo-1585829365295-ab7cd400c167','photo-1495020689067-958852a7765e'],
    world:         ['photo-1529333166437-7750a6dd5a70','photo-1451187580459-43490279c0fa','photo-1526304640581-d334cdbbf45e'],
    nation:        ['photo-1501594907352-04cda38ebc29','photo-1589994965851-a8f479c573a9','photo-1555848962-6e79363ec58f'],
    business:      ['photo-1611974789855-9c2a0a7236a3','photo-1590283603385-17ffb3a7f29f','photo-1444653614773-995cb1ef9efa'],
    technology:    ['photo-1518770660439-4636190af475','photo-1451187580459-43490279c0fa','photo-1677442136019-21780ecad995'],
    sports:        ['photo-1461896836934-bd45ba8ce8e6','photo-1546519638-68e109498ffc','photo-1508098682722-e99c643e7f76'],
    entertainment: ['photo-1536440136628-849c177e76a1','photo-1493225457124-a3eb161ffa5f','photo-1511379938547-c1f69419868d'],
    health:        ['photo-1576091160399-112ba8d25d1d','photo-1576091160550-2173dba999ef','photo-1559757148-5c350d0d3c56'],
    science:       ['photo-1507413245164-6160d8298b31','photo-1532094349884-543bc11b234d','photo-1446776811953-b23d57bd21aa']
};

function getCategoryFallbackImage(category, index = 0) {
    const imgs = CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.general;
    const id = imgs[index % imgs.length];
    return `https://images.unsplash.com/${id}?w=800&q=80`;
}

/* ── Category display info ── */
const CATEGORY_INFO = {
    general:       { title: 'Top Stories',    subtitle: "Today's most important headlines",          icon: 'fas fa-fire' },
    world:         { title: 'World News',     subtitle: 'International events and global affairs',   icon: 'fas fa-globe' },
    nation:        { title: 'U.S. News',      subtitle: 'National news and domestic policy',         icon: 'fas fa-flag' },
    business:      { title: 'Business',       subtitle: 'Markets, economy, and corporate news',      icon: 'fas fa-chart-line' },
    technology:    { title: 'Technology',     subtitle: 'Innovation, gadgets, and digital trends',   icon: 'fas fa-microchip' },
    sports:        { title: 'Sports',         subtitle: 'Scores, highlights, and analysis',          icon: 'fas fa-football-ball' },
    entertainment: { title: 'Entertainment',  subtitle: 'Movies, music, TV, and culture',            icon: 'fas fa-film' },
    health:        { title: 'Health',         subtitle: 'Medical research and wellness',             icon: 'fas fa-heartbeat' },
    science:       { title: 'Science',        subtitle: 'Discoveries and research breakthroughs',    icon: 'fas fa-flask' }
};

/* ── Trending labels (populated dynamically from fetched headlines) ── */
const TRENDING_LABELS = [
    'Climate Change', 'Artificial Intelligence', 'Ukraine War', 'Economy',
    'Gaza', 'Elections 2026', 'Tech Giants', 'Healthcare', 'Space Exploration', 'Sports'
];
