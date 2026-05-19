import { WIKTIONARY_API_URL } from './constants.js';

export async function lookupWiktionary(word) {
  try {
    const url = `${WIKTIONARY_API_URL}/${encodeURIComponent(word.toLowerCase())}`;
    const response = await fetch(url, {
      headers: { 'Api-User-Agent': 'Nysta/0.1 language-learning-extension' }
    });

    if (!response.ok) return null;

    const data = await response.json();
    const swedish = data.sv;
    if (!swedish || !swedish.length) return null;

    return parseWiktionarySwedish(swedish, word);
  } catch {
    return null;
  }
}

function parseWiktionarySwedish(entries, word) {
  const result = {
    pos: null,
    enEtt: null,
    declensionGroup: null,
    verbGroup: null,
    forms: {}
  };

  for (const entry of entries) {
    const pos = entry.partOfSpeech?.toLowerCase();

    if (pos?.includes('noun')) {
      result.pos = 'noun';
      const defs = entry.definitions || [];
      for (const def of defs) {
        const parsedNote = def.parsedExamples?.[0]?.example || '';
        if (parsedNote.includes('ett ')) result.enEtt = 'ett';
        else if (parsedNote.includes('en ')) result.enEtt = 'en';
      }
    }

    if (pos?.includes('verb')) {
      result.pos = 'verb';
    }

    if (pos?.includes('adj')) {
      result.pos = 'adjective';
    }
  }

  return result;
}

export function mergeGrammarData(claudeData, wiktionaryData) {
  if (!wiktionaryData) return claudeData;

  return {
    ...claudeData,
    pos: wiktionaryData.pos || claudeData.pos,
    enEtt: wiktionaryData.enEtt || claudeData.enEtt,
    declensionGroup: wiktionaryData.declensionGroup || claudeData.declensionGroup,
    verbGroup: wiktionaryData.verbGroup || claudeData.verbGroup,
    forms: { ...claudeData.forms, ...wiktionaryData.forms }
  };
}
