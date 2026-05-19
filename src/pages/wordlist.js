let allWords = [];
let currentFilter = 'all';

async function init() {
  const res = await chrome.runtime.sendMessage({ type: 'GET_VOCAB_LIST' });
  allWords = res.list || [];
  render();

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });

  document.getElementById('export-btn').addEventListener('click', async () => {
    const res = await chrome.runtime.sendMessage({ type: 'EXPORT_VOCAB' });
    const blob = new Blob([res.tsv], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nysta-wordlist-${new Date().toISOString().split('T')[0]}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function render() {
  const filtered = currentFilter === 'all'
    ? allWords
    : allWords.filter(w => w.status === currentFilter);

  const saved = allWords.filter(w => w.status === 'saved').length;
  const known = allWords.filter(w => w.status === 'known').length;

  document.getElementById('stat-saved').textContent = saved;
  document.getElementById('stat-known').textContent = known;
  document.getElementById('stat-total').textContent = allWords.length;

  const container = document.getElementById('word-list');

  if (!filtered.length) {
    container.innerHTML = `<div class="empty">
      ${currentFilter === 'all' ? 'No words saved yet. Start reading and highlight words to look them up.' : `No ${currentFilter} words yet.`}
    </div>`;
    return;
  }

  container.innerHTML = filtered.map(w => wordCard(w)).join('');

  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const word = btn.dataset.word;
      await chrome.runtime.sendMessage({ type: 'REMOVE_WORD', word });
      allWords = allWords.filter(w => w.word !== word);
      render();
    });
  });
}

function wordCard(w) {
  const status = w.status;
  const date = new Date(w.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const domain = w.sourceDomain || '';

  const posText = [w.pos, w.enEtt ? `${w.enEtt}-word` : null, w.verbGroup ? `group ${w.verbGroup}` : null]
    .filter(Boolean).join(' · ');

  const ctx = w.contextSentence
    ? w.contextSentence.replace(new RegExp(`(${w.word})`, 'i'), '<strong>$1</strong>')
    : '';

  return `<div class="word-card">
    <div class="word-hero ${status}">
      <div class="hero-left">
        <p class="word-headword ${status}">${esc(w.word)}</p>
        ${posText ? `<p class="word-pos ${status}">${esc(posText)}</p>` : ''}
      </div>
      <span class="status-badge badge-${status}">${status === 'known' ? '✓ known' : 'saved'}</span>
    </div>
    <div class="word-body">
      ${w.definition ? `<p class="word-def">${esc(w.definition)}</p>` : ''}
      ${w.definition_en ? `<p class="word-def-en">${esc(w.definition_en)}</p>` : ''}
      ${ctx ? `<p class="word-ctx">"…${ctx}…"</p>` : ''}
      <div class="word-meta">
        <span>${date}${domain ? ' · ' + esc(domain) : ''}</span>
        <button class="remove-btn" data-word="${esc(w.word)}">remove</button>
      </div>
    </div>
  </div>`;
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

init();
