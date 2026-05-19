import { ANTHROPIC_API_URL, ANTHROPIC_MODEL } from './constants.js';

function withTimeout(promise, ms, label) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms/1000}s`)), ms)
  );
  return Promise.race([promise, timeout]);
}

function buildSystemPrompt(level, settings) {
  return `You are a Swedish language learning assistant inside a browser extension called Nysta.
The user is a ${level}-level Swedish learner. They highlighted a word while reading a Swedish webpage.
Analyze the word in context and return ONLY a valid JSON object — no markdown, no backticks, no preamble.

Definition language:
- beginner: definition_en (simple English) + definition_sv (very simple Swedish)
- intermediate: definition_sv (natural Swedish) + definition_en (brief English gloss)
- advanced: definition_sv only

Return exactly this JSON schema:
{
  "word": "dictionary/base form",
  "pos": "noun|verb|adjective|adverb|preposition|particle|conjunction|pronoun|other",
  "register": "neutral|formal|informal|colloquial|archaic|technical|null",
  "isComposite": true or false,
  "definition_sv": "Swedish definition",
  "definition_en": "English definition or null",
  "exampleSentences": ["example 1", "example 2"],
  "wordFormation": "compound breakdown or null",
  "synonyms": [],
  "otherMeanings": [{"sense": 2, "text": "..."}],
  "relatedForms": [{"form": "...", "pos": "...", "gloss": "..."}],
  "commonPhrases": [{"phrase": "...", "gloss": "..."}],
  "frequencyScore": 1,
  "enEtt": "en or ett or null",
  "declensionGroup": "1st|2nd|3rd|4th|5th or null",
  "verbGroup": "1|2|3|4 or null",
  "forms": {}
}

CRITICAL: The "forms" field must NEVER be an empty object {}. Always fill it completely for nouns, verbs, and adjectives using EXACTLY these key names:

VERB — include all that apply (most regular verbs have all of these):
"forms": {
  "infinitiv": "tala",
  "presens": "talar",
  "preteritum": "talade",
  "perfekt": "har talat",
  "pluskvamperfekt": "hade talat",
  "futur": "ska tala",
  "konditionalis": "skulle tala",
  "imperativ": "tala",
  "passiv": "talas"
}

NOUN — all four forms required:
"forms": {
  "indefiniteSg": "en bil",
  "definiteSg": "bilen",
  "indefinitePlural": "bilar",
  "definitePlural": "bilarna"
}

ADJECTIVE — all six forms required:
"forms": {
  "enForm": "stor",
  "ettForm": "stort",
  "pluralForm": "stora",
  "definiteForm": "stora",
  "comparative": "större",
  "superlative": "störst"
}

Use ONLY the key names shown above. Do NOT use empty {}, do NOT invent other key names.`;
}

export async function lookupWithClaude(word, contextSentence, level, settings, apiKey) {
  const body = JSON.stringify({
    model: ANTHROPIC_MODEL,
    max_tokens: 1500,
    system: buildSystemPrompt(level, settings),
    messages: [{
      role: 'user',
      content: `Word: "${word}"\nContext: "${contextSentence}"\nLevel: ${level}\nReturn JSON only.`
    }]
  });

  const fetchPromise = fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body
  });

  const response = await withTimeout(fetchPromise, 20000, 'Claude lookup');

  if (!response.ok) {
    let errMsg = `API error ${response.status}`;
    try {
      const err = await response.json();
      errMsg = err.error?.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  if (!text) throw new Error('Empty response from Claude');

  // Strip any accidental markdown fences
  const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    throw new Error(`Could not parse response: ${clean.slice(0, 100)}`);
  }
}

export async function translateWithClaude(word, contextSentence, apiKey) {
  const body = JSON.stringify({
    model: ANTHROPIC_MODEL,
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Translate the Swedish word "${word}" in this context: "${contextSentence}"

Return ONLY this JSON, no markdown:
{
  "translation": "primary English equivalent",
  "alternatives": [],
  "contextPhrase": "full context sentence translated to English",
  "nuanceNote": "brief note on usage differences or null"
}`
    }],
    system: 'You are a Swedish-English translator. Return only valid JSON, no markdown fences, no preamble.'
  });

  const fetchPromise = fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body
  });

  const response = await withTimeout(fetchPromise, 15000, 'Translation');

  if (!response.ok) throw new Error(`Translation error ${response.status}`);

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse translation response');
  }
}
