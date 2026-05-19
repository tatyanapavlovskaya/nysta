import { DEFAULT_SETTINGS, CACHE_VERSION, CACHE_MAX_AGE_MS } from './constants.js';

export async function getSettings() {
  const result = await chrome.storage.sync.get('settings');
  return result.settings ? { ...DEFAULT_SETTINGS, ...result.settings } : { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings) {
  await chrome.storage.sync.set({ settings });
}

export async function getVocabList() {
  const result = await chrome.storage.local.get('vocabList');
  return result.vocabList || [];
}

export async function saveWord(entry) {
  const list = await getVocabList();
  const existing = list.findIndex(w => w.word === entry.word);
  if (existing !== -1) return { alreadySaved: true, status: list[existing].status };
  list.unshift({ ...entry, savedAt: Date.now(), status: 'saved' });
  await chrome.storage.local.set({ vocabList: list });
  return { alreadySaved: false, status: 'saved' };
}

export async function getWordStatus(word) {
  const list = await getVocabList();
  const entry = list.find(w => w.word === word);
  return entry ? entry.status : null;
}

export async function markWordKnown(word) {
  const list = await getVocabList();
  const idx = list.findIndex(w => w.word === word);
  if (idx !== -1) {
    list[idx].status = 'known';
    list[idx].knownAt = Date.now();
    await chrome.storage.local.set({ vocabList: list });
  }
}

export async function removeWord(word) {
  const list = await getVocabList();
  const filtered = list.filter(w => w.word !== word);
  await chrome.storage.local.set({ vocabList: filtered });
}

export async function getCached(word, level) {
  const key = `cache_${word}_${level}`;
  const result = await chrome.storage.local.get(key);
  if (!result[key]) return null;
  const entry = result[key];
  if (entry.version !== CACHE_VERSION) return null;
  if (Date.now() - entry.cachedAt > CACHE_MAX_AGE_MS) return null;
  return entry.data;
}

export async function setCached(word, level, data) {
  const key = `cache_${word}_${level}`;
  await chrome.storage.local.set({
    [key]: { version: CACHE_VERSION, cachedAt: Date.now(), data }
  });
}

export async function exportVocabList() {
  const list = await getVocabList();
  const lines = ['word\tpos\tdefinition\tcontext\tstatus\tsavedAt'];
  for (const w of list) {
    lines.push([
      w.word,
      w.pos || '',
      w.definition || '',
      w.contextSentence || '',
      w.status,
      new Date(w.savedAt).toISOString().split('T')[0]
    ].join('\t'));
  }
  return lines.join('\n');
}
