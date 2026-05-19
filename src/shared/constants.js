export const LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced'
};

export const DEFAULT_SETTINGS = {
  apiKey: '',
  level: LEVELS.INTERMEDIATE,
  explanationLanguage: 'swedish',   // 'swedish' | 'english' | 'both'
  grammarLanguage: 'english',       // 'english' | 'swedish'
  popupContent: {
    beginner: {
      wordFormation: true,
      otherMeanings: false
    },
    intermediate: {
      wordFormation: true,
      synonyms: true,
      relatedForms: false,
      otherMeanings: true,
      commonPhrases: false,
      frequency: false,
      register: false
    },
    advanced: {
      wordFormation: true,
      synonyms: true,
      relatedForms: true,
      otherMeanings: true,
      commonPhrases: true,
      frequency: false,
      register: true
    }
  }
};

export const CACHE_VERSION = 1;
export const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
export const WIKTIONARY_API_URL = 'https://en.wiktionary.org/api/rest_v1/page/definition';
