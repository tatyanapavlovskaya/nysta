import { getSettings, getCached, setCached, getWordStatus, saveWord, getVocabList, exportVocabList, removeWord } from '../shared/storage.js';
import { lookupWithClaude, translateWithClaude } from '../shared/claude.js';
import { lookupWiktionary, mergeGrammarData } from '../shared/wiktionary.js';

async function getActiveState() {
  const result = await chrome.storage.local.get('nystaActive');
  return result.nystaActive === true;
}

async function setActiveState(active) {
  await chrome.storage.local.set({ nystaActive: active });
  updateIcon(active);
  broadcastActiveState(active);
}

function updateIcon(active) {
  chrome.action.setTitle({
    title: active ? 'Nysta is active — click to pause' : 'Nysta — click to activate'
  });
  chrome.action.setBadgeText({ text: active ? 'ON' : '' });
  chrome.action.setBadgeBackgroundColor({ color: active ? '#1D9E75' : '#888' });
}

function broadcastActiveState(active) {
  chrome.tabs.query({}, tabs => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { type: 'ACTIVE_STATE_CHANGED', active }).catch(() => {});
    }
  });
}

chrome.runtime.onInstalled.addListener(async () => updateIcon(await getActiveState()));
chrome.runtime.onStartup.addListener(async () => updateIcon(await getActiveState()));

// Keep service worker alive during long API calls
function keepAlive() {
  chrome.runtime.getPlatformInfo(() => {});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Nysta SW] Received message:', message.type);
  handleMessage(message)
    .then(res => { console.log('[Nysta SW] Responding to:', message.type); sendResponse(res); })
    .catch(err => { console.error('[Nysta SW] Error handling', message.type, err); sendResponse({ error: err.message }); });
  return true;
});

async function handleMessage(message) {
  const { type } = message;

  if (type === 'GET_ACTIVE_STATE') return { active: await getActiveState() };
  if (type === 'TOGGLE_ACTIVE') {
    const next = !(await getActiveState());
    await setActiveState(next);
    return { active: next };
  }
  if (type === 'LOOKUP') return await handleLookup(message);
  if (type === 'TRANSLATE') return await handleTranslate(message);
  if (type === 'SAVE_WORD') return await saveWord(message.entry);
  if (type === 'REMOVE_WORD') { await removeWord(message.word); return { ok: true }; }
  if (type === 'GET_WORD_STATUS') return { status: await getWordStatus(message.word) };
  if (type === 'GET_VOCAB_LIST') return { list: await getVocabList() };
  if (type === 'EXPORT_VOCAB') return { tsv: await exportVocabList() };
  if (type === 'GET_SETTINGS') return { settings: await getSettings() };

  throw new Error(`Unknown message type: ${type}`);
}

async function handleLookup({ word, contextSentence }) {
  const keepAliveInterval = setInterval(keepAlive, 10000);
  try {
    return await _handleLookup({ word, contextSentence });
  } finally {
    clearInterval(keepAliveInterval);
  }
}

async function _handleLookup({ word, contextSentence }) {
  const settings = await getSettings();
  if (!settings.apiKey) throw new Error('NO_API_KEY');

  const level = settings.level;
  const cached = await getCached(word, level);
  if (cached) {
    const status = await getWordStatus(word);
    return { ...cached, wordStatus: status, fromCache: true };
  }

  const [claudeData, wiktionaryData] = await Promise.all([
    lookupWithClaude(word, contextSentence, level, settings, settings.apiKey),
    lookupWiktionary(word)
  ]);

  const merged = mergeGrammarData(claudeData, wiktionaryData);
  const result = { ...merged, contextSentence };
  await setCached(word, level, result);

  const status = await getWordStatus(word);
  return { ...result, wordStatus: status, fromCache: false };
}

async function handleTranslate({ word, contextSentence }) {
  const settings = await getSettings();
  if (!settings.apiKey) throw new Error('NO_API_KEY');
  return await translateWithClaude(word, contextSentence, settings.apiKey);
}
