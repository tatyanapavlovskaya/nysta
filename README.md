# Nysta

> Pull the thread on any word.

A Swedish language learning browser extension. Highlight any word on any webpage to get a context-aware explanation, full Swedish grammar, and a personal vocab list.

## Installation

### 1. Get an Anthropic API key
Sign up at [console.anthropic.com](https://console.anthropic.com) and create an API key.

### 2. Load the extension in Chrome
1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `nysta` folder (this folder)

### 3. Add your API key
1. Click the Nysta icon in your toolbar
2. Click **settings**
3. Paste your Anthropic API key
4. Set your level and preferences
5. Click **save settings**

### 4. Start reading
Go to any Swedish webpage. Highlight a word — the popup appears automatically after you release the mouse.

## How it works

| What | Source |
|------|--------|
| Grammar facts (en/ett, conjugation, declension) | Wiktionary API |
| Contextual definition, examples, word formation | Claude Haiku (Anthropic API) |
| Translation on demand | Claude Haiku |
| Vocab list, settings, cache | Local browser storage |

Each word is cached locally after the first lookup — so it never costs more than one API call per unique word.

## Cost estimate
At ~50 new word lookups/day using Claude Haiku: **~$0.01/day**. Most common words are served from cache after the first lookup.

## Project structure
```
nysta/
├── manifest.json
├── icons/
├── src/
│   ├── background/
│   │   └── service-worker.js    # API calls, message routing
│   ├── content/
│   │   ├── content.js           # Selection detection, popup injection
│   │   └── popup.css            # Popup styles
│   ├── shared/
│   │   ├── constants.js         # Config, defaults
│   │   ├── storage.js           # Vocab list, cache, settings
│   │   ├── claude.js            # Claude API integration
│   │   └── wiktionary.js        # Wiktionary API integration
│   ├── toolbar/
│   │   ├── toolbar.html         # Toolbar popup
│   │   └── toolbar.js
│   ├── settings/
│   │   ├── settings.html        # Settings page
│   │   └── settings.js
│   └── pages/
│       ├── wordlist.html        # Vocab list page
│       ├── wordlist.js
│       └── quiz.html            # Quiz (coming soon)
```

## Scaling to a team
When you want to share with others without each person needing their own API key, add a Cloudflare Worker as a proxy. The worker holds one API key and caches responses across users. The Cloudflare free tier (100k requests/day) covers up to ~10 active users comfortably.
