async function init() {
  const [stateRes, settingsRes, listRes] = await Promise.all([
    chrome.runtime.sendMessage({ type: 'GET_ACTIVE_STATE' }),
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }),
    chrome.runtime.sendMessage({ type: 'GET_VOCAB_LIST' })
  ]);

  const active = stateRes?.active || false;
  const settings = settingsRes?.settings || {};
  const list = listRes?.list || [];

  renderActiveState(active);

  if (!settings.apiKey) {
    document.getElementById('no-key-banner').style.display = 'block';
  }

  document.getElementById('lang-pill').textContent =
    `Swedish · ${settings.level || 'intermediate'}`;

  const saved = list.filter(w => w.status === 'saved').length;
  const known = list.filter(w => w.status === 'known').length;
  document.getElementById('stat-saved').textContent = saved;
  document.getElementById('stat-known').textContent = known;
  document.getElementById('stat-total').textContent = list.length;

  document.getElementById('toggle-btn').addEventListener('click', async () => {
    const res = await chrome.runtime.sendMessage({ type: 'TOGGLE_ACTIVE' });
    renderActiveState(res.active);
  });

  document.getElementById('btn-wordlist').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/wordlist.html') });
  });

  document.getElementById('btn-quiz').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/quiz.html') });
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('open-settings-banner')?.addEventListener('click', e => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

function renderActiveState(active) {
  const btn = document.getElementById('toggle-btn');
  const indicator = document.getElementById('active-indicator');
  const statusText = document.getElementById('active-status');

  if (active) {
    btn.textContent = 'pause';
    btn.style.background = 'transparent';
    btn.style.color = '#888';
    indicator.style.background = '#1D9E75';
    statusText.textContent = 'active — highlight any word';
  } else {
    btn.textContent = 'activate';
    btn.style.background = '#1a1a1a';
    btn.style.color = '#fff';
    indicator.style.background = '#ddd';
    statusText.textContent = 'paused';
  }
}

init();
