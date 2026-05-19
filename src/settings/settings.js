const DEFAULTS = {
  beginner:     { wordFormation: true,  synonyms: false, relatedForms: false, otherMeanings: false, commonPhrases: false, frequency: false, register: false },
  intermediate: { wordFormation: true,  synonyms: true,  relatedForms: false, otherMeanings: true,  commonPhrases: false, frequency: false, register: false },
  advanced:     { wordFormation: true,  synonyms: true,  relatedForms: true,  otherMeanings: true,  commonPhrases: true,  frequency: false, register: true  }
};

let currentLevel = 'intermediate';
let popupContent = {
  beginner:     { ...DEFAULTS.beginner },
  intermediate: { ...DEFAULTS.intermediate },
  advanced:     { ...DEFAULTS.advanced }
};

async function init() {
  const res = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
  const settings = res.settings || {};

  document.getElementById('api-key').value = settings.apiKey || '';
  document.getElementById('level').value = settings.level || 'intermediate';
  document.getElementById('explanation-language').value = settings.explanationLanguage || 'swedish';
  document.getElementById('grammar-language').value = settings.grammarLanguage || 'english';

  if (settings.popupContent) {
    popupContent = {
      beginner:     { ...DEFAULTS.beginner,     ...settings.popupContent.beginner },
      intermediate: { ...DEFAULTS.intermediate, ...settings.popupContent.intermediate },
      advanced:     { ...DEFAULTS.advanced,     ...settings.popupContent.advanced }
    };
  }

  renderCheckboxes(currentLevel);

  document.getElementById('save-btn').addEventListener('click', save);
  document.getElementById('export-btn').addEventListener('click', exportList);
}

function switchLevel(level, btn) {
  saveCurrentCheckboxes();
  currentLevel = level;
  document.querySelectorAll('.level-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderCheckboxes(level);
}

function renderCheckboxes(level) {
  const prefs = popupContent[level];
  document.querySelectorAll('[data-key]').forEach(input => {
    input.checked = !!prefs[input.dataset.key];
  });
}

function saveCurrentCheckboxes() {
  const prefs = {};
  document.querySelectorAll('[data-key]').forEach(input => {
    prefs[input.dataset.key] = input.checked;
  });
  popupContent[currentLevel] = prefs;
}

async function save() {
  saveCurrentCheckboxes();

  const settings = {
    apiKey: document.getElementById('api-key').value.trim(),
    level: document.getElementById('level').value,
    explanationLanguage: document.getElementById('explanation-language').value,
    grammarLanguage: document.getElementById('grammar-language').value,
    popupContent
  };

  await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
  await chrome.storage.sync.set({ settings });

  const status = document.getElementById('save-status');
  status.style.display = 'block';
  setTimeout(() => { status.style.display = 'none'; }, 2500);
}

async function exportList() {
  const res = await chrome.runtime.sendMessage({ type: 'EXPORT_VOCAB' });
  const blob = new Blob([res.tsv], { type: 'text/tab-separated-values' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nysta-wordlist-${new Date().toISOString().split('T')[0]}.tsv`;
  a.click();
  URL.revokeObjectURL(url);
}

init();

window.switchLevel = switchLevel;
