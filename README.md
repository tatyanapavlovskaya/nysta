# Nysta — Swedish Language Learning Extension

> *Pull the thread on any Swedish word, instantly.*

Nysta is a free Chrome extension for learning Swedish. Highlight any word while reading a Swedish webpage and get a context-aware definition, full grammar forms, example sentences, and a personal vocabulary list — powered by Claude AI.

---

## What it does

- **Instant word lookup** — highlight any word on any Swedish webpage and a popup appears automatically
- **Context-aware definitions** — the meaning is based on the sentence you're reading, not just a dictionary entry
- **Full grammar** — verb conjugations, noun declensions, adjective forms, en/ett article, and more
- **Three learner levels** — Beginner, Intermediate, and Advanced (adjusts how much Swedish vs English you see)
- **Personal word list** — save words, mark them as known, and export to a flashcard app
- **On-demand translation** — translate the full sentence to English with one click

---

## What you need before installing

1. **Google Chrome** browser
2. **A free Anthropic account** to get an API key — this is what powers the AI lookups

> **About the API key:** Nysta uses Claude AI (made by Anthropic) to look up words. You need your own API key — it takes 2 minutes to get one and costs almost nothing to use (~$0.01 per 50 word lookups).

---

## Step 1 — Get your Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com) and create a free account
2. Once logged in, go to **API Keys** in the left menu
3. Click **Create Key**, give it a name (e.g. "Nysta"), and copy it somewhere safe

---

## Step 2 — Download Nysta

**Option A — Download as ZIP (easiest)**
1. Click the green **Code** button at the top of this page
2. Click **Download ZIP**
3. Unzip the folder somewhere on your computer (e.g. your Desktop)

**Option B — Clone with Git**
```
git clone https://github.com/tatyanapavlovskaya/nysta.git
```

---

## Step 3 — Install the extension in Chrome

1. Open Chrome and go to **chrome://extensions** (paste this in your address bar)
2. Turn on **Developer mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Select the `nysta-v3` folder you downloaded (the one that contains `manifest.json`)

The Nysta yarn ball icon will appear in your Chrome toolbar. 🧶

---

## Step 4 — Add your API key

1. Click the Nysta icon in your toolbar
2. Click **settings**
3. Paste your Anthropic API key into the field
4. Choose your Swedish level (Beginner / Intermediate / Advanced)
5. Click **Save settings**

---

## Step 5 — Start reading

Go to any Swedish webpage (try [svt.se](https://svt.se) or [dn.se](https://dn.se)).

Highlight any word with your mouse — the Nysta popup appears automatically next to it.

---

## Learner levels explained

| Level | What you see |
|-------|-------------|
| **Beginner** | Simple English definition + very simple Swedish definition |
| **Intermediate** | Natural Swedish definition + brief English gloss |
| **Advanced** | Swedish definition only |

You can change your level any time in settings.

---

## How much does it cost?

Nysta itself is completely free. You only pay Anthropic for API usage — and it's very cheap:

- ~50 new word lookups per day ≈ **$0.01/day**
- Words are cached after the first lookup, so you never pay twice for the same word
- New Anthropic accounts come with free credits to get you started

---

## Tech stack

| Component | Technology |
|-----------|-----------|
| Extension platform | Chrome Manifest V3 |
| AI word lookups | Claude API (Anthropic) |
| Grammar data | Wiktionary API |
| UI | Vanilla JavaScript + Shadow DOM |
| Storage | Chrome Storage API (local, no server) |

No backend server is required — everything runs directly in your browser.

---

## Troubleshooting

**The popup doesn't appear**
- Make sure you saved your API key in settings
- Check that Developer mode is still enabled in chrome://extensions
- Try reloading the extension (click the refresh icon on the extension card)

**"API error" message in the popup**
- Double-check your API key is correct in settings
- Make sure your Anthropic account has available credits

**The popup appears in the wrong position**
- This can happen on a small number of sites that use unusual CSS — try scrolling the page slightly and highlighting again

---

## Questions?

Open an [issue](https://github.com/tatyanapavlovskaya/nysta/issues) on GitHub and I'll help you out.
