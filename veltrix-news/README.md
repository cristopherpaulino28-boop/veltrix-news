# Veltrix News

Real news website powered by Gemini AI + Google Search.

## Add Your Free Gemini Key (for AI-powered news)

1. Go to https://aistudio.google.com/apikey
2. Click "Create API key" (free, 1,500 requests/day)
3. Open `js/app.js` line 16 and replace:
   ```
   const GEMINI_KEY = 'YOUR_GEMINI_API_KEY_HERE';
   ```
   with your actual key.

**Without a key:** The site still works using The Guardian API (real news, real images).

---

## Deploy to GitHub Pages

1. Create a repo at github.com
2. Upload all files
3. Go to Settings → Pages → Source: main branch → Save
4. Live at: `https://YOUR_USERNAME.github.io/veltrix-news/`

## Deploy to IONOS

1. Log into IONOS control panel
2. Open File Manager or connect via FTP
3. Upload all files to `public_html/`
4. Done — visit your domain

---

## How It Works

- **Gemini AI** (if key set): Uses Google Search to fetch today's real news
- **Guardian API** (fallback): Real articles with real thumbnail images
- **Auto-refresh**: Every 10 minutes
- **Caching**: 15-minute session cache to save API calls
- **Newsletter**: Subscriptions stored in localStorage
